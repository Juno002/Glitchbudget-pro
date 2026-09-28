import { requireRecurringProvenance } from './recurring-rule-service';
import { requireCategory } from './category-service';
import { readFinancialPolicies } from './policy-settings';
import { evaluateBudgetOverspendingSet, BudgetWarning } from '../policies/budget-overspending';
import { accountTables, readAccountSnapshot, requireAccount, requirePreservedAccountFunds, ensureCashAccount } from './accounts';
import { z } from 'zod';
import { db, type Expense, type Income } from './db';
import { isValidDate } from './finance-calculations';
import { budgetPlansForDate } from '../domain/budgets';
import { prepareBudgetPeriodsForDate } from './budget-rollover';
import { recordGoalContribution } from './goal-service';
import { normalizeCurrencyCode } from '../domain/currency';
import { normalizeTransactionLabels } from '../domain/transaction-metadata';

const fields = {
  recurringRuleId: z.string().min(1).optional(),
  accountId: z.string().min(1).optional(),
  date: z.string().refine(isValidDate, 'Selecciona una fecha válida.'),
  categoryId: z.string().min(1, 'Selecciona una categoría.'),
  amount: z.number().finite().positive('El monto debe ser mayor que cero.')
    .transform(value => Math.round(value * 100))
    .pipe(z.number().int().positive('El monto mínimo es 0.01.').max(Number.MAX_SAFE_INTEGER)),
  labels: z.array(z.string()).optional().transform(value => {
    if (value === undefined) return undefined;
    const labels = normalizeTransactionLabels(value);
    return labels.length ? labels : undefined;
  }),
};
const incomeSchema = z.object({ ...fields, type: z.enum(['extra', 'gift']), description: z.string().trim() });

export interface ActualSaveOptions {
  /** Existing materialized occurrences may be confirmed after their rule is deactivated. */
  allowInactiveRecurringRule?: boolean;
}
const expenseSchema = z.object({
  ...fields, nature: z.enum(['Fijo', 'Variable', 'Ocasional']), concept: z.string().trim(),
  necessity: z.enum(['must','need','want']).optional(),
  paymentMethod: z.enum(['cash', 'credit']).default('cash'), debtId: z.string().optional(), recurringRuleId: z.string().optional(),
});

export async function saveIncome(input: Omit<Income, 'month'>, editing = false, options: ActualSaveOptions = {}): Promise<void> {
  const value = incomeSchema.parse(input);
  const row: Income = { ...input, ...value, month: value.date.slice(0, 7) };
  await db.transaction('rw', [...accountTables, db.categories, db.recurrents, db.settings], async () => {
    const existing = editing ? await db.incomes.get(row.id) : undefined;
    if (editing && !existing) throw new Error('El ingreso ya no existe. Actualiza la lista.');
    await requireCategory(row.categoryId, 'income', existing?.categoryId);
    await requireRecurringProvenance(row.recurringRuleId, 'income', existing?.recurringRuleId, { allowInactive: options.allowInactiveRecurringRule });
    // Efectivo es el destino predeterminado, no una obligación: respeta una cuenta elegida explícitamente.
    if (!editing) row.accountId = row.accountId || (await ensureCashAccount(row.date)).id;
    else row.accountId = row.accountId || existing?.accountId;
    if (row.accountId) {
      const account = await requireAccount(row.accountId, row.date);
      if (account.type === 'investment') throw new Error('Las cuentas de inversión no reciben ingresos operativos en Investments 1.0.');
      const baseCurrency = normalizeCurrencyCode((await db.settings.get('general'))?.currency);
      if (account.currency !== baseCurrency) throw new Error('Esta cuenta necesita una conversión manual antes de registrar movimientos.');
      row.currency = account.currency;
      row.fxRate = 1;
      row.amountBase = row.amount;
    }
    if (editing && (await readFinancialPolicies()).preventNegativeAccountBalance) {
      const before = await readAccountSnapshot();
      requirePreservedAccountFunds(await db.accounts.toArray(), before, { ...before, incomes: [...before.incomes.filter(i => i.id !== row.id), row] });
    }
    if (editing) await db.incomes.put(row);
    else await db.incomes.add(row);
  });
}

async function requireNotConfirmedOccurrenceTransaction(id: string): Promise<void> {
  const linked = await db.planned_occurrences.where('transactionId').equals(id).first();
  if (linked?.status === 'confirmed') {
    throw new Error('Este movimiento confirma una ocurrencia planificada y no puede eliminarse directamente.');
  }
}

export async function removeIncome(id: string): Promise<void> {
  await db.transaction('rw', [...accountTables, db.categories, db.recurrents, db.planned_occurrences, db.settings], async () => {
    await requireNotConfirmedOccurrenceTransaction(id);
    if ((await readFinancialPolicies()).preventNegativeAccountBalance) {
      const before = await readAccountSnapshot();
      requirePreservedAccountFunds(await db.accounts.toArray(), before, { ...before, incomes: before.incomes.filter(i => i.id !== id) });
    }
    await db.incomes.delete(id);
  });
}

export async function saveExpense(input: Omit<Expense, 'month'>, editing = false, budgetConfirmation?: string, options: ActualSaveOptions = {}): Promise<void> {
  const value = expenseSchema.parse(input);
  const row: Expense = {
    ...input, ...value, month: value.date.slice(0, 7),
    accountId: value.paymentMethod === 'credit' ? undefined : value.accountId,
    debtId: value.paymentMethod === 'credit' ? value.debtId : undefined,
  };
  // Do not persist obsolete or injected recurrence behavior on an actual expense.
  delete (row as unknown as Record<string, unknown>).frequency;
  delete (row as unknown as Record<string, unknown>).type;
  delete (row as unknown as Record<string, unknown>).recurringId;
  // Read and write in one transaction so two windows cannot spend the same available funds.
  await db.transaction('rw', [...accountTables, db.categories, db.recurrents, db.settings, db.plans, db.goal_contributions, db.debts], async () => {
    const existing = await db.expenses.get(row.id);
    await requireRecurringProvenance(row.recurringRuleId, 'expense', editing ? existing?.recurringRuleId : undefined, { allowInactive: options.allowInactiveRecurringRule });
    if (editing && !existing) throw new Error('El gasto ya no existe. Actualiza la lista.');
    await requireCategory(row.categoryId, 'expense', editing ? existing?.categoryId : undefined);
    const policies = await readFinancialPolicies();
    if (row.paymentMethod === 'credit') {
      const card = row.debtId ? await db.debts.get(row.debtId) : undefined;
      if (!card || card.status !== 'active' || card.type !== 'credit_card') {
        throw new Error('Selecciona una tarjeta de crédito activa.');
      }
      const baseCurrency = normalizeCurrencyCode((await db.settings.get('general'))?.currency);
      row.currency = baseCurrency;
      row.fxRate = 1;
      row.amountBase = row.amount;
    } else {

      if (!row.accountId && (!editing || existing?.accountId || existing?.paymentMethod === 'credit')) row.accountId = existing?.accountId || (await ensureCashAccount(row.date)).id;
      if (row.accountId) {
        const account = await requireAccount(row.accountId, row.date);
        if (account.type === 'investment') throw new Error('Las cuentas de inversión no pagan gastos en Investments 1.0.');
        const baseCurrency = normalizeCurrencyCode((await db.settings.get('general'))?.currency);
        if (account.currency !== baseCurrency) throw new Error('Esta cuenta necesita una conversión manual antes de registrar movimientos.');
        row.currency = account.currency;
        row.fxRate = 1;
        row.amountBase = row.amount;
        const snapshot = await readAccountSnapshot();
        const projected = { ...snapshot, expenses: [...snapshot.expenses.filter(e => e.id !== row.id), row] };
        if (policies.preventNegativeAccountBalance) requirePreservedAccountFunds(await db.accounts.toArray(), snapshot, projected);
      }
    }
    await prepareBudgetPeriodsForDate(row.date);
    const settings = await db.settings.get('general');
    const activeBudgets = budgetPlansForDate(await db.plans.toArray(), row.categoryId, row.date, settings || {});
    const evaluation = evaluateBudgetOverspendingSet(await db.expenses.toArray(), row, activeBudgets, policies.budgetOverspendingBehavior);
    if (evaluation.decision === 'block') throw new Error('Este gasto crea o aumenta el exceso de un presupuesto activo de su categoría.');
    if (evaluation.decision === 'warn' && budgetConfirmation !== evaluation.confirmation) throw new BudgetWarning(evaluation);
    if (editing) await db.expenses.put(row);
    else await db.expenses.add(row);
  });
}

export async function removeExpense(id: string): Promise<void> {
  await db.transaction('rw', db.expenses, db.planned_occurrences, async () => {
    await requireNotConfirmedOccurrenceTransaction(id);
    await db.expenses.delete(id);
  });
}

const centsSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const outgoingTables = [...accountTables, db.categories, db.recurrents, db.settings, db.plans, db.goal_contributions, db.debts, db.goals];
export async function saveDebtPayment(payment: import('./db').DebtPayment) {
  centsSchema.parse(payment.amount);
  fields.date.parse(payment.date);
  await db.transaction('rw', outgoingTables, async () => {
    const debt = await db.debts.get(payment.debtId);
    if (!debt || debt.status !== 'active') throw new Error('Selecciona una tarjeta activa.');
    payment = { ...payment, accountId: payment.accountId || (await ensureCashAccount(payment.date)).id };
    if (payment.accountId) {
      const account = await requireAccount(payment.accountId, payment.date);
      if (account.type === 'investment') throw new Error('Las cuentas de inversión no pagan tarjetas en Investments 1.0.');
      const baseCurrency = normalizeCurrencyCode((await db.settings.get('general'))?.currency);
      if (account.currency !== baseCurrency) throw new Error('Esta cuenta necesita una conversión manual antes de registrar pagos.');
      payment = { ...payment, currency: account.currency, fxRate: 1, amountBase: payment.amount };

      if ((await readFinancialPolicies()).preventNegativeAccountBalance) {
        const before = await readAccountSnapshot();
        requirePreservedAccountFunds(await db.accounts.toArray(), before, { ...before, payments: [...before.payments, payment] });
      }
    }
    await db.debt_payments.add(payment);
  });
}
export async function saveGoalContribution(contribution: import('./db').GoalContribution) {
  return recordGoalContribution(contribution);
}

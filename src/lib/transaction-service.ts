import { readFinancialPolicies } from './policy-settings';
import { evaluateBudgetOverspending, BudgetWarning } from '../policies/budget-overspending';
import { accountTables, readAccountSnapshot, requireAccount, requirePreservedAccountFunds, ensureCashAccount } from './accounts';
import { z } from 'zod';
import { db, type Expense, type Income } from './db';
import { isValidDate } from './finance-calculations';

const fields = {
  accountId: z.string().min(1).optional(),
  date: z.string().refine(isValidDate, 'Selecciona una fecha válida.'),
  categoryId: z.string().trim().min(1, 'Selecciona una categoría.'),
  amount: z.number().finite().positive('El monto debe ser mayor que cero.')
    .transform(value => Math.round(value * 100))
    .pipe(z.number().int().positive('El monto mínimo es 0.01.').max(Number.MAX_SAFE_INTEGER)),
};
const incomeSchema = z.object({ ...fields, type: z.enum(['extra', 'gift']), description: z.string().trim() });
const expenseSchema = z.object({
  ...fields, type: z.enum(['Fijo', 'Variable', 'Ocasional']), concept: z.string().trim(),
  frequency: z.enum(['mensual', 'quincenal', 'semanal']).optional(),
  paymentMethod: z.enum(['cash', 'credit']).default('cash'), debtId: z.string().optional(), recurringId: z.string().optional(),
});

export async function saveIncome(input: Omit<Income, 'month'>, editing = false): Promise<void> {
  const value = incomeSchema.parse(input);
  const row: Income = { ...input, ...value, month: value.date.slice(0, 7) };
  await db.transaction('rw', [...accountTables, db.settings], async () => {
    const existing = editing ? await db.incomes.get(row.id) : undefined;
    if (editing && !existing) throw new Error('El ingreso ya no existe. Actualiza la lista.');
    if (!editing) row.accountId = (await ensureCashAccount(row.date)).id;
    else row.accountId = row.accountId || existing?.accountId;
    if (row.accountId) await requireAccount(row.accountId, row.date);
    if (editing && (await readFinancialPolicies()).preventNegativeAccountBalance) {
      const before = await readAccountSnapshot();
      requirePreservedAccountFunds(await db.accounts.toArray(), before, { ...before, incomes: [...before.incomes.filter(i => i.id !== row.id), row] });
    }
    if (editing) await db.incomes.put(row);
    else await db.incomes.add(row);
  });
}

export async function removeIncome(id: string): Promise<void> {
  await db.transaction('rw', [...accountTables, db.settings], async () => {
    if ((await readFinancialPolicies()).preventNegativeAccountBalance) {
      const before = await readAccountSnapshot();
      requirePreservedAccountFunds(await db.accounts.toArray(), before, { ...before, incomes: before.incomes.filter(i => i.id !== id) });
    }
    await db.incomes.delete(id);
  });
}

export async function saveExpense(input: Omit<Expense, 'month'>, editing = false, budgetConfirmation?: string): Promise<void> {
  const value = expenseSchema.parse(input);
  const row: Expense = {
    ...input, ...value, month: value.date.slice(0, 7),
    accountId: value.paymentMethod === 'credit' ? undefined : value.accountId,
    debtId: value.paymentMethod === 'credit' ? value.debtId : undefined,
    frequency: value.type === 'Fijo' ? value.frequency || 'mensual' : undefined,
  };
  // Read and write in one transaction so two windows cannot spend the same available funds.
  await db.transaction('rw', [...accountTables, db.settings, db.plans, db.goal_contributions, db.debts], async () => {
    const existing = await db.expenses.get(row.id);
    if (row.recurringId) {
      const duplicate = await db.expenses.filter(e => e.id !== row.id && e.recurringId === row.recurringId && e.date.slice(0, 7) === row.month).first();
      if (duplicate) throw new Error('Esta suscripción ya tiene un pago registrado en ese mes.');
    }
    if (editing && !existing) throw new Error('El gasto ya no existe. Actualiza la lista.');
    const policies = await readFinancialPolicies();
    if (row.paymentMethod === 'credit') {
      const card = row.debtId ? await db.debts.get(row.debtId) : undefined;
      if (!card || card.status !== 'active' || card.type !== 'credit_card') {
        throw new Error('Selecciona una tarjeta de crédito activa.');
      }
    } else {

      if (!row.accountId && (!editing || existing?.accountId || existing?.paymentMethod === 'credit')) row.accountId = existing?.accountId || (await ensureCashAccount(row.date)).id;
      if (row.accountId) {
        await requireAccount(row.accountId, row.date);
        const snapshot = await readAccountSnapshot();
        const projected = { ...snapshot, expenses: [...snapshot.expenses.filter(e => e.id !== row.id), row] };
        if (policies.preventNegativeAccountBalance) requirePreservedAccountFunds(await db.accounts.toArray(), snapshot, projected);
      }
    }
    const evaluation = evaluateBudgetOverspending(await db.expenses.toArray(), row, await db.plans.get([row.month, row.categoryId]), policies.budgetOverspendingBehavior);
    if (evaluation.decision === 'block') throw new Error('Este gasto crea o aumenta el exceso del presupuesto de su categoría.');
    if (evaluation.decision === 'warn' && budgetConfirmation !== evaluation.confirmation) throw new BudgetWarning(evaluation);
    if (editing) await db.expenses.put(row);
    else await db.expenses.add(row);
  });
}

const centsSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const outgoingTables = [...accountTables, db.settings, db.plans, db.goal_contributions, db.debts, db.goals];
export async function saveDebtPayment(payment: import('./db').DebtPayment) {
  centsSchema.parse(payment.amount);
  fields.date.parse(payment.date);
  await db.transaction('rw', outgoingTables, async () => {
    const debt = await db.debts.get(payment.debtId);
    if (!debt || debt.status !== 'active') throw new Error('Selecciona una tarjeta activa.');
    payment = { ...payment, accountId: payment.accountId || (await ensureCashAccount(payment.date)).id };
    if (payment.accountId) {
      await requireAccount(payment.accountId, payment.date);

      if ((await readFinancialPolicies()).preventNegativeAccountBalance) {
        const before = await readAccountSnapshot();
        requirePreservedAccountFunds(await db.accounts.toArray(), before, { ...before, payments: [...before.payments, payment] });
      }
    }
    await db.debt_payments.add(payment);
  });
}
export async function saveGoalContribution(contribution: import('./db').GoalContribution) {
  centsSchema.parse(contribution.amount);
  fields.date.parse(contribution.date);
  return db.transaction('rw', outgoingTables, async () => {
    const goal = await db.goals.get(contribution.goalId);
    if (!goal) throw new Error('Meta no encontrada.');

    const saved = goal.saved + contribution.amount;
    if (!Number.isSafeInteger(saved)) throw new Error('El total supera el monto admitido.');
    const status = saved >= goal.target ? 'completed' : 'active';
    await db.goals.update(goal.id, { saved, status });
    await db.goal_contributions.add(contribution);
    return status === 'completed' && goal.status !== 'completed';
  });
}

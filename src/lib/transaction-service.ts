import { accountTables, readAccountSnapshot, requireAccount, requirePreservedAccountFunds } from './accounts';
import { z } from 'zod';
import { db, type Expense, type Income } from './db';
import { calculateTotals, isValidDate, type FinanceSnapshot } from './finance-calculations';

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
    if (row.accountId) await requireAccount(row.accountId, row.date);
    else if (!editing && await db.accounts.count()) throw new Error('Selecciona la cuenta donde recibiste el ingreso.');
    if (editing && !await db.incomes.get(row.id)) throw new Error('El ingreso ya no existe. Actualiza la lista.');
    if (editing && (await db.settings.get('general'))?.strictMode) {
      const before = await readAccountSnapshot();
      requirePreservedAccountFunds(await db.accounts.toArray(), before, { ...before, incomes: [...before.incomes.filter(i => i.id !== row.id), row] });
    }
    if (editing) await db.incomes.put(row);
    else await db.incomes.add(row);
  });
}

export async function removeIncome(id: string): Promise<void> {
  await db.transaction('rw', [...accountTables, db.settings], async () => {
    if ((await db.settings.get('general'))?.strictMode) {
      const before = await readAccountSnapshot();
      requirePreservedAccountFunds(await db.accounts.toArray(), before, { ...before, incomes: before.incomes.filter(i => i.id !== id) });
    }
    await db.incomes.delete(id);
  });
}

export async function saveExpense(input: Omit<Expense, 'month'>, editing = false): Promise<void> {
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
    if (row.paymentMethod === 'credit') {
      const card = row.debtId ? await db.debts.get(row.debtId) : undefined;
      if (!card || card.status !== 'active' || card.type !== 'credit_card') {
        throw new Error('Selecciona una tarjeta de crédito activa.');
      }
    } else {
      const settings = await db.settings.get('general');
      if (row.accountId) {
        await requireAccount(row.accountId, row.date);
        const snapshot = await readAccountSnapshot();
        const projected = { ...snapshot, expenses: [...snapshot.expenses.filter(e => e.id !== row.id), row] };
        if (settings?.strictMode) requirePreservedAccountFunds(await db.accounts.toArray(), snapshot, projected);
      } else if (!editing && await db.accounts.count()) {
        throw new Error('Selecciona la cuenta desde la que pagaste.');
      }
      if (settings?.strictMode && !row.accountId) {
        const data: FinanceSnapshot = {
          settings: { ...settings, savePct: settings.savePct ?? 0 },
          incomes: await db.incomes.toArray(), expenses: await db.expenses.toArray(),
          budgets: await db.plans.toArray(), goalContributions: await db.goal_contributions.toArray(),
          debtPayments: await db.debt_payments.toArray(),
        };
        const before = calculateTotals(data, row.month);
        const after = calculateTotals({ ...data, expenses: [...data.expenses.filter(e => e.id !== row.id), row] }, row.month);
        const freeBefore = before.balance - before.commitments;
        const freeAfter = after.balance - after.commitments;
        if (freeAfter < 0 && (!editing || freeAfter < freeBefore)) {
          throw new Error('Modo estricto: este gasto supera el dinero disponible para su mes y categoría. Ajusta el presupuesto o el monto.');
        }
      }
    }
    if (editing) await db.expenses.put(row);
    else await db.expenses.add(row);
  });
}

const centsSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const outgoingTables = [...accountTables, db.settings, db.plans, db.goal_contributions, db.debts, db.goals];
async function requireAvailableCash(amount: number, date: string) {
  const settings = await db.settings.get('general');
  if (!settings?.strictMode) return;
  const totals = calculateTotals({ settings, incomes: await db.incomes.toArray(), expenses: await db.expenses.toArray(), budgets: await db.plans.toArray(), goalContributions: await db.goal_contributions.toArray(), debtPayments: await db.debt_payments.toArray() }, date.slice(0, 7));
  if (amount > totals.balance - totals.commitments) throw new Error('Modo estricto: el monto supera el dinero disponible de ese mes.');
}
export async function saveDebtPayment(payment: import('./db').DebtPayment) {
  centsSchema.parse(payment.amount);
  fields.date.parse(payment.date);
  await db.transaction('rw', outgoingTables, async () => {
    const debt = await db.debts.get(payment.debtId);
    if (!debt || debt.status !== 'active') throw new Error('Selecciona una tarjeta activa.');
    if (payment.accountId) {
      await requireAccount(payment.accountId, payment.date);
      const settings = await db.settings.get('general');
      if (settings?.strictMode) {
        const before = await readAccountSnapshot();
        requirePreservedAccountFunds(await db.accounts.toArray(), before, { ...before, payments: [...before.payments, payment] });
      }
    } else {
      if (await db.accounts.count()) throw new Error('Selecciona la cuenta desde la que pagaste la tarjeta.');
      await requireAvailableCash(payment.amount, payment.date);
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
    await requireAvailableCash(contribution.amount, contribution.date);
    const saved = goal.saved + contribution.amount;
    if (!Number.isSafeInteger(saved)) throw new Error('El total supera el monto admitido.');
    const status = saved >= goal.target ? 'completed' : 'active';
    await db.goals.update(goal.id, { saved, status });
    await db.goal_contributions.add(contribution);
    return status === 'completed' && goal.status !== 'completed';
  });
}

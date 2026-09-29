import type { Debt } from '@/domain/models';
import { db } from '@/lib/db';

export async function createDebt(
  debt: Omit<Debt, 'id' | 'createdAt'>,
): Promise<Debt> {
  const next: Debt = {
    ...debt,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await db.debts.add(next);
  return next;
}

export async function updateDebt(debt: Debt): Promise<void> {
  await db.debts.put(debt);
}

export async function removeDebt(id: string): Promise<void> {
  await db.transaction('rw', db.debts, db.expenses, db.debt_payments, async () => {
    const linkedExpense = await db.expenses.filter(expense => expense.debtId === id).count();
    const linkedPayment = await db.debt_payments.where('debtId').equals(id).count();
    if (linkedExpense || linkedPayment) {
      throw new Error('Esta tarjeta tiene movimientos. Conserva su historial; no se puede eliminar.');
    }
    await db.debts.delete(id);
  });
}

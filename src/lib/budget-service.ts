import { budgetPlanForRange } from '../domain/budgets';
import { selectCategorySpendingForPeriod } from '../domain/metrics';
import type { BudgetPeriodRange } from '../domain/periods';
import { requireCategory } from './category-service';
import { db } from './db';

export async function reassignBudgetLimit(
  range: BudgetPeriodRange,
  fromCategoryId: string,
  toCategoryId: string,
  amount: number,
): Promise<void> {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('El monto de la reasignación debe ser positivo.');
  if (fromCategoryId === toCategoryId) throw new Error('Selecciona dos categorías diferentes.');

  await db.transaction('rw', db.plans, db.expenses, db.categories, async () => {
    const fromBudget = await db.plans.get([range.id, fromCategoryId]);
    const toBudget = await db.plans.get([range.id, toCategoryId]);

    await requireCategory(fromCategoryId, 'expense', fromBudget?.categoryId);
    await requireCategory(toCategoryId, 'expense', toBudget?.categoryId);

    const spent = selectCategorySpendingForPeriod(await db.expenses.toArray(), fromCategoryId, range);
    if (!fromBudget || fromBudget.limit - spent < amount) {
      throw new Error('Fondos insuficientes en el presupuesto de origen.');
    }

    await db.plans.update([range.id, fromCategoryId], { limit: fromBudget.limit - amount });
    if (toBudget) {
      await db.plans.update([range.id, toCategoryId], { limit: toBudget.limit + amount });
    } else {
      await db.plans.add(budgetPlanForRange(range, toCategoryId, amount));
    }
  });
}

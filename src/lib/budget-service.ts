import { budgetPlanForRange, validateBudgetRange } from '../domain/budgets';
import { selectCategorySpendingForPeriod } from '../domain/metrics';
import type { BudgetPeriodRange } from '../domain/periods';
import { requireCategory, savePlans } from './category-service';
import { db } from './db';

export async function saveBudgetLimits(range: BudgetPeriodRange, limits: Array<{ categoryId:string; limit:number }>): Promise<void> {
  await db.transaction('rw', db.settings, db.categories, db.plans, async () => {
    validateBudgetRange(range, await db.settings.get('general') || {});
    await savePlans(limits.map(row => budgetPlanForRange(range, row.categoryId, row.limit)));
  });
}

export async function reassignBudgetLimit(
  range: BudgetPeriodRange,
  fromCategoryId: string,
  toCategoryId: string,
  amount: number,
): Promise<void> {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('El monto de la reasignación debe ser positivo.');
  if (fromCategoryId === toCategoryId) throw new Error('Selecciona dos categorías diferentes.');

  await db.transaction('rw', db.settings, db.plans, db.expenses, db.categories, async () => {
    validateBudgetRange(range, await db.settings.get('general') || {});
    const fromBudget = await db.plans.get([range.id, fromCategoryId]);
    const toBudget = await db.plans.get([range.id, toCategoryId]);

    await requireCategory(fromCategoryId, 'expense', fromBudget?.categoryId);
    await requireCategory(toCategoryId, 'expense', toBudget?.categoryId);

    const spent = selectCategorySpendingForPeriod(await db.expenses.toArray(), fromCategoryId, range);
    if (!fromBudget || fromBudget.limit - spent < amount) {
      throw new Error('Fondos insuficientes en el presupuesto de origen.');
    }

    const destinationLimit = (toBudget?.limit ?? 0) + amount;
    if (!Number.isSafeInteger(destinationLimit)) throw new Error('El presupuesto supera el monto admitido.');
    await db.plans.update([range.id, fromCategoryId], { limit: fromBudget.limit - amount });
    if (toBudget) {
      await db.plans.update([range.id, toCategoryId], { limit: destinationLimit });
    } else {
      await db.plans.add(budgetPlanForRange(range, toCategoryId, amount));
    }
  });
}

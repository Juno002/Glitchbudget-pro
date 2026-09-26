import { selectCategorySpending, selectRolloverLimit } from '../domain/metrics';
import { db } from './db';
import { isValidDate, localDate } from './finance-calculations';

export async function rollBudgetsIntoMonth(month: string): Promise<boolean> {
  if (!isValidDate(month + '-01')) throw new Error('Selecciona un mes válido.');
  return db.transaction('rw', db.settings, db.plans, db.expenses, db.categories, async () => {
    const strategy = (await db.settings.get('general'))?.rolloverStrategy;
    if (!strategy || strategy === 'reset' || await db.plans.where('month').equals(month).count()) return false;
    const previous = new Date(month + '-01T12:00:00');
    previous.setMonth(previous.getMonth() - 1);
    const previousMonth = localDate(previous).slice(0, 7);
    const active = new Set((await db.categories.toArray()).filter(c => !c.archived && c.type !== 'income').map(c => c.id));
    const plans = (await db.plans.where('month').equals(previousMonth).toArray()).filter(p => active.has(p.categoryId));
    if (!plans.length) return false;
    const expenses = await db.expenses.toArray();
    const next = plans.map(plan => {
      const spent = selectCategorySpending(expenses, plan.categoryId, previousMonth);
      const limit = selectRolloverLimit(plan.limit, spent, strategy);
      if (!Number.isSafeInteger(limit)) throw new Error('El presupuesto supera el monto admitido.');
      return { ...plan, month, limit };
    });
    await db.plans.bulkAdd(next);
    return true;
  });
}

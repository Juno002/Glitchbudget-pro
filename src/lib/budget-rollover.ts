import { selectCategorySpendingForPeriod, selectRolloverLimit } from '../domain/metrics';
import { periodForId, previousComparablePeriod } from '../domain/periods';
import { db } from './db';

export async function rollBudgetsIntoMonth(periodId: string): Promise<boolean> {
  return db.transaction('rw', db.settings, db.plans, db.expenses, db.categories, async () => {
    const settings = await db.settings.get('general');
    const strategy = settings?.rolloverStrategy;
    const currentPeriod = periodForId(periodId, settings || {});
    if (!strategy || strategy === 'reset' || await db.plans.where('month').equals(currentPeriod.id).count()) return false;

    const previousPeriod = previousComparablePeriod(currentPeriod, settings || {});
    const active = new Set((await db.categories.toArray()).filter(c => !c.archived && c.type !== 'income').map(c => c.id));
    const plans = (await db.plans.where('month').equals(previousPeriod.id).toArray()).filter(p => active.has(p.categoryId));
    if (!plans.length) return false;

    const expenses = await db.expenses.toArray();
    const next = plans.map(plan => {
      const spent = selectCategorySpendingForPeriod(expenses, plan.categoryId, previousPeriod);
      const limit = selectRolloverLimit(plan.limit, spent, strategy);
      if (!Number.isSafeInteger(limit)) throw new Error('El presupuesto supera el monto admitido.');
      return { ...plan, month: currentPeriod.id, limit };
    });
    await db.plans.bulkAdd(next);
    return true;
  });
}

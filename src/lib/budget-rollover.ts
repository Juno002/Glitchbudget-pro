import { budgetPlanForRange, budgetPlansForRange, validateBudgetRange } from '../domain/budgets';
import { selectCategorySpendingForPeriod, selectRolloverLimit } from '../domain/metrics';
import { budgetPeriodContaining, periodForId, previousBudgetPeriod, type BudgetPeriodRange } from '../domain/periods';
import { db } from './db';

export async function rollBudgetsIntoPeriod(targetPeriod: BudgetPeriodRange): Promise<boolean> {
  if (targetPeriod.kind === 'one_time') return false;

  return db.transaction('rw', db.settings, db.plans, db.expenses, db.categories, async () => {
    const settings = await db.settings.get('general');
    validateBudgetRange(targetPeriod, settings || {});
    const strategy = settings?.rolloverStrategy;
    if (!strategy || strategy === 'reset' || budgetPlansForRange(await db.plans.toArray(), targetPeriod).length > 0) return false;

    const previousPeriod = previousBudgetPeriod(targetPeriod, settings || {});
    if (!previousPeriod) return false;

    const active = new Set((await db.categories.toArray()).filter(c => !c.archived && c.type !== 'income').map(c => c.id));
    const plans = budgetPlansForRange(await db.plans.toArray(), previousPeriod).filter(plan => active.has(plan.categoryId));
    if (!plans.length) return false;

    const expenses = await db.expenses.toArray();
    const next = plans.map(plan => {
      const spent = selectCategorySpendingForPeriod(expenses, plan.categoryId, previousPeriod);
      const limit = selectRolloverLimit(plan.limit, spent, strategy);
      if (!Number.isSafeInteger(limit)) throw new Error('El presupuesto supera el monto admitido.');
      return budgetPlanForRange(targetPeriod, plan.categoryId, limit);
    });

    await db.plans.bulkAdd(next);
    return true;
  });
}

/** Compatibility wrapper for the existing monthly financial-period navigation. */
export async function rollBudgetsIntoMonth(periodId: string): Promise<boolean> {
  const settings = await db.settings.get('general');
  const monthly = periodForId(periodId, settings || {});
  return rollBudgetsIntoPeriod({ ...monthly, kind: 'monthly' });
}

export async function rollBudgetsForDate(date: string, kind: Exclude<BudgetPeriodRange['kind'], 'one_time'>): Promise<boolean> {
  const settings = await db.settings.get('general');
  return rollBudgetsIntoPeriod(budgetPeriodContaining(date, kind, settings || {}));
}

/** Materialization is part of saving a real expense, independent of visiting Plan. */
export async function prepareBudgetPeriodsForDate(date: string): Promise<void> {
  await db.transaction('rw', db.settings, db.plans, db.expenses, db.categories, async () => {
    for (const kind of ['monthly', 'weekly', 'yearly'] as const) await rollBudgetsForDate(date, kind);
  });
}

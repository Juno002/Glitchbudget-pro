import type { Expense, Plan } from './models';
import {
  budgetPeriodContaining,
  contains,
  periodForId,
  type BudgetPeriodKind,
  type BudgetPeriodRange,
  type PeriodSettings,
} from './periods';
import { selectBudgetRemaining, selectCategorySpendingForPeriod } from './metrics';

export function budgetRangeForPlan(plan: Plan, settings: PeriodSettings = {}): BudgetPeriodRange {
  if (plan.periodType && plan.periodStart && plan.periodEnd) {
    return {
      id: plan.month,
      start: plan.periodStart,
      end: plan.periodEnd,
      kind: plan.periodType,
    };
  }

  const legacy = periodForId(plan.month, settings);
  return { ...legacy, kind: 'monthly' };
}

export function budgetPlanForRange(range: BudgetPeriodRange, categoryId: string, limit: number): Plan {
  return {
    month: range.id,
    categoryId,
    limit,
    periodType: range.kind,
    periodStart: range.start,
    periodEnd: range.end,
  };
}

export function budgetPlansForRange(plans: Plan[], range: BudgetPeriodRange): Plan[] {
  return plans.filter(plan => (
    plan.month === range.id
    && (plan.periodType ?? 'monthly') === range.kind
    && (!plan.periodStart || plan.periodStart === range.start)
    && (!plan.periodEnd || plan.periodEnd === range.end)
  ));
}

export function budgetPlansForDate(
  plans: Plan[],
  categoryId: string,
  date: string,
  settings: PeriodSettings = {},
): Array<{ plan: Plan; range: BudgetPeriodRange }> {
  return plans
    .filter(plan => plan.categoryId === categoryId)
    .map(plan => ({ plan, range: budgetRangeForPlan(plan, settings) }))
    .filter(item => contains(item.range, date))
    .sort((a, b) => {
      const order: Record<BudgetPeriodKind, number> = { one_time: 0, weekly: 1, monthly: 2, yearly: 3 };
      return order[a.range.kind] - order[b.range.kind] || a.range.start.localeCompare(b.range.start);
    });
}

export function budgetStatusForRange(
  plan: Plan,
  expenses: Expense[],
  range: BudgetPeriodRange,
) {
  const spent = selectCategorySpendingForPeriod(expenses, plan.categoryId, range);
  const remaining = selectBudgetRemaining(plan.limit, spent).budgetRemaining;
  const percentage = plan.limit > 0 ? Math.round((spent / plan.limit) * 100) : 0;
  const status: 'ok' | 'alert' | 'over' | 'unbudgeted' =
    plan.limit === 0 ? 'unbudgeted'
      : remaining < 0 ? 'over'
      : remaining < plan.limit * 0.25 ? 'alert'
      : 'ok';
  return { ...plan, range, spent, remaining, percentage, status };
}

export function currentBudgetRange(
  anchorDate: string,
  kind: BudgetPeriodKind,
  settings: PeriodSettings = {},
  oneTime?: { start: string; end: string },
) {
  return budgetPeriodContaining(anchorDate, kind, settings, oneTime);
}

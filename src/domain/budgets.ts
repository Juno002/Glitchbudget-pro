import type { Expense, Plan } from './models';
import {
  budgetPeriodContaining,
  contains,
  periodForId,
  type BudgetPeriodKind,
  type BudgetPeriodRange,
  type PeriodRange,
  type PeriodSettings,
} from './periods';
import { selectBudgetRemaining, selectCategorySpendingForPeriod } from './metrics';

export function budgetRangeForPlan(plan: Plan, settings: PeriodSettings = {}): BudgetPeriodRange {
  // Monthly limits keep the Phase 6 calendar semantics when settings change.
  if (plan.periodType && plan.periodType !== 'monthly' && plan.periodStart && plan.periodEnd) {
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
    && (range.kind === 'monthly' || !plan.periodStart || plan.periodStart === range.start)
    && (range.kind === 'monthly' || !plan.periodEnd || plan.periodEnd === range.end)
  ));
}

/** Validate persisted metadata without consulting a clock or current settings. */
export function validateBudgetPlans(plans: Plan[]): void {
  const keys = new Set<string>();
  for (const plan of plans) {
    if (!Number.isSafeInteger(plan.limit) || plan.limit < 0) throw new Error('El presupuesto supera el monto admitido o es inválido.');
    const key = JSON.stringify([plan.month, plan.categoryId]);
    if (keys.has(key)) throw new Error('El respaldo contiene presupuestos duplicados.');
    keys.add(key);
    const metadata = [plan.periodType, plan.periodStart, plan.periodEnd];
    if (metadata.every(value => value === undefined)) {
      periodForId(plan.month);
      continue;
    }
    if (metadata.some(value => value === undefined)) throw new Error('El período del presupuesto está incompleto.');
    const { periodType: kind, periodStart: start, periodEnd: end } = plan;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start!) || !/^\d{4}-\d{2}-\d{2}$/.test(end!)) throw new Error('Fecha de presupuesto inválida.');
    if (!['weekly', 'monthly', 'yearly', 'one_time'].includes(kind!)) throw new Error('Tipo de presupuesto inválido.');
    const matches = (range: BudgetPeriodRange) => range.id === plan.month && range.start === start && range.end === end;
    const valid = kind === 'monthly'
      ? Array.from({ length:31 }, (_, i) => ({ ...periodForId(plan.month, { periodStartDay:i + 1 }), kind })).some(matches)
      : matches(budgetPeriodContaining(start!, kind!, {}, { start:start!, end:end! }));
    if (!valid) throw new Error('El rango del presupuesto no corresponde a su período.');
  }
}

export function validateBudgetRange(range: BudgetPeriodRange, settings: PeriodSettings): void {
  validateBudgetPlans([budgetPlanForRange(range, '_validation', 0)]);
  if (range.kind === 'monthly') {
    const current = periodForId(range.id, settings);
    if (current.start !== range.start || current.end !== range.end) throw new Error('El período financiero cambió. Vuelve a seleccionar el presupuesto.');
  }
}

export function savedBudgetRanges(plans: Plan[], settings: PeriodSettings = {}): BudgetPeriodRange[] {
  return Array.from(new Map(plans.map(plan => {
    const range = budgetRangeForPlan(plan, settings);
    return [range.id, range] as const;
  })).values()).sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
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
  configured = true,
) {
  const spent = selectCategorySpendingForPeriod(expenses, plan.categoryId, range);
  const remaining = selectBudgetRemaining(plan.limit, spent).budgetRemaining;
  const percentage = plan.limit > 0 ? Math.round((spent / plan.limit) * 100) : 0;
  const status: 'ok' | 'alert' | 'over' | 'unbudgeted' =
    !configured ? 'unbudgeted'
      : remaining < 0 ? 'over'
      : remaining < plan.limit * 0.25 ? 'alert'
      : 'ok';
  return { ...plan, range, spent, remaining, percentage, status, configured };
}

export type BudgetStatusDetail = ReturnType<typeof budgetStatusForRange>;

export function selectBudgetStatusDetails(
  plans: Plan[],
  expenses: Expense[],
  expenseCategoryIds: string[],
  range: BudgetPeriodRange,
): BudgetStatusDetail[] {
  const periodBudgets = budgetPlansForRange(plans, range);
  const budgetedCategoryIds = new Set(periodBudgets.map(plan => plan.categoryId));
  const relevantCategoryIds = Array.from(new Set([
    ...expenseCategoryIds,
    ...budgetedCategoryIds,
    ...expenses.filter(expense => contains(range, expense.date)).map(expense => expense.categoryId),
  ]));

  return relevantCategoryIds.map(categoryId => {
    const plan = periodBudgets.find(item => item.categoryId === categoryId)
      ?? budgetPlanForRange(range, categoryId, 0);
    return budgetStatusForRange(plan, expenses, range, budgetedCategoryIds.has(categoryId));
  });
}

export function selectBudgetCategoryGroups(
  expenseCategoryIds: string[],
  details: BudgetStatusDetail[],
) {
  const active: string[] = [];
  const inactive: string[] = [];
  const categoryIds = new Set([
    ...expenseCategoryIds,
    ...details.map(detail => detail.categoryId),
  ]);

  for (const categoryId of categoryIds) {
    const detail = details.find(item => item.categoryId === categoryId);
    if (detail?.configured || (detail?.spent ?? 0) > 0) active.push(categoryId);
    else inactive.push(categoryId);
  }

  return { active, inactive };
}

export function selectFundedBudgetDetails(details: BudgetStatusDetail[]) {
  return details.filter(detail => detail.remaining > 0);
}

export function selectBudgetStatusOverview(
  plans: Plan[],
  expenses: Expense[],
  expenseCategoryIds: string[],
  currentPeriod: PeriodRange,
  today: string,
  settings: PeriodSettings = {},
) {
  const currentRange: BudgetPeriodRange = { ...currentPeriod, kind: 'monthly' };
  const trackedBudgets = selectBudgetStatusDetails(plans, expenses, expenseCategoryIds, currentRange)
    .filter(detail => detail.configured);
  const totalLimit = trackedBudgets.reduce((sum, detail) => sum + detail.limit, 0);
  const totalSpent = trackedBudgets.reduce((sum, detail) => sum + detail.spent, 0);
  const totalRemaining = trackedBudgets.reduce((sum, detail) => sum + detail.remaining, 0);
  const anchor = contains(currentPeriod, today) ? today : currentPeriod.end;
  const otherBudgets = plans
    .filter(plan => plan.periodType && plan.periodType !== 'monthly')
    .map(plan => budgetStatusForRange(plan, expenses, budgetRangeForPlan(plan, settings)))
    .filter(detail => contains(detail.range, anchor))
    .sort((a, b) => b.percentage - a.percentage);

  return { trackedBudgets, totalLimit, totalSpent, totalRemaining, anchor, otherBudgets };
}

export function currentBudgetRange(
  anchorDate: string,
  kind: BudgetPeriodKind,
  settings: PeriodSettings = {},
  oneTime?: { start: string; end: string },
) {
  return budgetPeriodContaining(anchorDate, kind, settings, oneTime);
}

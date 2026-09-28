import { selectCategorySpendingForPeriod } from '../domain/metrics';
import type { Expense, Plan } from '../domain/models';
import type { BudgetPeriodRange, PeriodRange } from '../domain/periods';
import type { BudgetOverspendingBehavior } from './settings';

export function evaluateBudgetOverspending(
  expenses: Expense[],
  row: Expense,
  plan: Plan | undefined,
  behavior: BudgetOverspendingBehavior,
  period: PeriodRange,
) {
  const before = selectCategorySpendingForPeriod(expenses, row.categoryId, period);
  const after = selectCategorySpendingForPeriod([...expenses.filter(e => e.id !== row.id), row], row.categoryId, period);
  const limit = plan?.limit;
  const worsens = limit !== undefined && after > limit && after > before;
  const decision = worsens ? behavior : 'allow';
  const confirmation = JSON.stringify([row.id, row.date, row.categoryId, row.amount, row.paymentMethod, row.debtId, expenses.find(e => e.id === row.id), before, after, limit, behavior, period.id, period.start, period.end]);
  return { decision, before, after, limit, confirmation, categoryId: row.categoryId, month: period.id, period, affectedCount: worsens ? 1 : 0 };
}

export function evaluateBudgetOverspendingSet(
  expenses: Expense[],
  row: Expense,
  plans: Array<{ plan: Plan; range: BudgetPeriodRange }>,
  behavior: BudgetOverspendingBehavior,
) {
  const evaluations = plans.map(({ plan, range }) => evaluateBudgetOverspending(expenses, row, plan, behavior, range));
  const affected = evaluations.filter(evaluation => evaluation.decision !== 'allow');
  if (affected.length === 0) {
    const fallbackPeriod = plans[0]?.range ?? { id: row.date.slice(0, 7), start: row.date, end: row.date };
    return evaluateBudgetOverspending(expenses, row, undefined, behavior, fallbackPeriod);
  }

  const primary = affected[0];
  const confirmation = JSON.stringify(affected.map(evaluation => evaluation.confirmation));
  return { ...primary, confirmation, affectedCount: affected.length };
}

export type BudgetOverspendingEvaluation = ReturnType<typeof evaluateBudgetOverspending>;

export class BudgetWarning extends Error {
  constructor(public readonly evaluation: BudgetOverspendingEvaluation) {
    super('Este gasto supera el presupuesto de su categoría.');
    this.name = 'BudgetWarning';
  }
}

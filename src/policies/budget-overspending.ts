import { selectCategorySpendingForPeriod } from '../domain/metrics';
import type { Expense, Plan } from '../domain/models';
import type { PeriodRange } from '../domain/periods';
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
  // Confirmation applies to this proposal and the exact budget state, never a blanket bypass.
  const confirmation = JSON.stringify([row.id, row.date, row.categoryId, row.amount, row.paymentMethod, row.debtId, expenses.find(e => e.id === row.id), before, after, limit, behavior, period.id, period.start, period.end]);
  return { decision, before, after, limit, confirmation, categoryId: row.categoryId, month: period.id, period };
}
export class BudgetWarning extends Error {
  constructor(public readonly evaluation: ReturnType<typeof evaluateBudgetOverspending>) { super('Este gasto supera el presupuesto de su categoría.'); this.name = 'BudgetWarning'; }
}

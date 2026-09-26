import { selectCategorySpending } from '../domain/metrics';
import type { Expense, Plan } from '../domain/models';
import type { BudgetOverspendingBehavior } from './settings';
export function evaluateBudgetOverspending(expenses: Expense[], row: Expense, plan: Plan | undefined, behavior: BudgetOverspendingBehavior) {
  const month = row.date.slice(0, 7);
  const before = selectCategorySpending(expenses, row.categoryId, month);
  const after = selectCategorySpending([...expenses.filter(e => e.id !== row.id), row], row.categoryId, month);
  const limit = plan?.limit;
  const worsens = limit !== undefined && after > limit && after > before;
  const decision = worsens ? behavior : 'allow';
  // Confirmation applies to this proposal and the exact budget state, never a blanket bypass.
  const confirmation = JSON.stringify([row.id, row.date, row.categoryId, row.amount, row.paymentMethod, row.debtId, expenses.find(e => e.id === row.id), before, after, limit, behavior]);
  return { decision, before, after, limit, confirmation, categoryId: row.categoryId, month };
}
export class BudgetWarning extends Error {
  constructor(public readonly evaluation: ReturnType<typeof evaluateBudgetOverspending>) { super('Este gasto supera el presupuesto de su categoría.'); this.name = 'BudgetWarning'; }
}

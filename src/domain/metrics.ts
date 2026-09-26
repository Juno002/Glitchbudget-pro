import type { Income, Expense } from './models';
import type { FinanceSnapshot } from './snapshot';

/** Recorded activity: a fixed purchase is counted once, on its actual date. */
export function recordedExpenseForMonth(expense: Expense, month: string): number {
  return expense.date.slice(0, 7) === month ? expense.amount : 0;
}
export function recordedCategories(rows: Array<Income | Expense>, month: string) {
  const groups = new Map<string, number>();
  rows.filter(row => row.date.slice(0, 7) === month).forEach(row => groups.set(row.categoryId, (groups.get(row.categoryId) || 0) + row.amount));
  return Array.from(groups, ([name, value]) => ({ name, value }));
}
export function selectMonthlyMetrics(data: FinanceSnapshot, month: string) {
  const recordedIncome = data.incomes.filter(i => i.date.slice(0, 7) === month).reduce((s,i) => s+i.amount,0);
  const monthExpenses = data.expenses.filter(e => e.date.slice(0,7) === month);
  const spending = monthExpenses.reduce((s,e) => s+e.amount,0);
  const cashSpending = monthExpenses.filter(e => e.paymentMethod !== 'credit').reduce((s,e) => s+e.amount,0);
  const cardSpending = spending - cashSpending;
  const cardPayments = data.debtPayments.filter(p => p.date.slice(0,7) === month).reduce((s,p) => s+p.amount,0);
  const monthBudgets = data.budgets.filter(b => b.month === month);
  const plannedBudgetTotal = monthBudgets.reduce((s,b) => s+b.limit,0);
  const remainingBudgets = monthBudgets.reduce((s,b) => s+selectBudgetRemaining(b.limit, selectCategorySpending(monthExpenses, b.categoryId, month)).unspentBudgetReservation,0);
  const goalContributions = data.goalContributions.filter(c => c.date.slice(0,7) === month).reduce((s,c) => s+c.amount,0);
  const suggestedSave = Math.round(recordedIncome * data.settings.savePct);
  const planningReservations = remainingBudgets + goalContributions + suggestedSave;
  const monthlyResult = recordedIncome-spending;
  return { recordedIncome, spending, cashSpending, cardSpending, cardPayments, cashFlow: recordedIncome-cashSpending-cardPayments, monthlyResult, monthlyPlanningMargin: monthlyResult-planningReservations, plannedBudgetTotal, goalContributions, planningReservations, suggestedSave };
}
export function selectCategorySpending(expenses: Expense[], categoryId: string, month: string) {
  return expenses.filter(e => e.categoryId === categoryId).reduce((sum, e) => sum + recordedExpenseForMonth(e, month), 0);
}
export function selectBudgetRemaining(limit: number, spending: number) {
  const budgetRemaining = limit - spending;
  return { budgetRemaining, unspentBudgetReservation: Math.max(0, budgetRemaining) };
}
export function selectRolloverLimit(limit: number, spending: number, strategy: 'accumulate_surplus' | 'accumulate_debt') {
  const { budgetRemaining } = selectBudgetRemaining(limit, spending);
  const adjustment = strategy === 'accumulate_surplus' ? Math.max(0, budgetRemaining) : Math.min(0, budgetRemaining);
  return Math.max(0, limit + adjustment);
}
/** Explanatory chart split of the monthly result, not a cash-flow selector. */
export function selectMonthlyResultSplit(recordedIncome: number, spending: number) {
  return { surplus: Math.max(0, recordedIncome - spending), deficit: Math.max(0, spending - recordedIncome) };
}

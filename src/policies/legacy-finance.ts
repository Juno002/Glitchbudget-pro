// Frozen acceptance policy. Forecasts here are NOT assets or real payment capacity.
import type { Expense, Settings } from '../domain/models';
import type { FinanceSnapshot as RecordedSnapshot } from '../domain/snapshot';
export interface FinanceSnapshot extends RecordedSnapshot { settings: Pick<Settings, 'baseIncome' | 'savePct'> }
import { selectMonthlyMetrics } from '../domain/metrics';
export function monthlyAmount(freq: string, amount: number): number {
  return freq === 'quincenal' ? amount * 2 : freq === 'semanal' ? Math.round(amount * 4.33) : amount;
}

export function legacyProjectedExpenseForMonth(expense: Expense, month: string): number {
  const startMonth = expense.date.slice(0, 7);
  if (expense.type === 'Fijo') {
    return startMonth <= month ? monthlyAmount(expense.frequency || 'mensual', expense.amount) : 0;
  }
  return startMonth === month ? expense.amount : 0;
}

export function legacyProjectedTotals(data: FinanceSnapshot, month: string) {
  const totalIncome = monthlyAmount(data.settings.baseIncome.freq, data.settings.baseIncome.amount)
    + data.incomes.filter(i => i.date.slice(0, 7) === month).reduce((sum, i) => sum + i.amount, 0);
  const cashExpenses = data.expenses.filter(e => e.paymentMethod !== 'credit');
  const totalExpenses = cashExpenses.reduce((sum, e) => sum + legacyProjectedExpenseForMonth(e, month), 0);
  const totalDebtPayments = data.debtPayments.filter(p => p.date.slice(0, 7) === month).reduce((sum, p) => sum + p.amount, 0);
  const monthBudgets = data.budgets.filter(b => b.month === month);
  const planned_total = monthBudgets.reduce((sum, b) => sum + b.limit, 0);
  // Reserve only the unspent portion; spending a planned amount must not reserve it twice.
  const remainingBudgets = monthBudgets.reduce((sum, b) => {
    const spent = data.expenses.filter(e => e.categoryId === b.categoryId)
      .reduce((total, e) => total + legacyProjectedExpenseForMonth(e, month), 0);
    return sum + Math.max(0, b.limit - spent);
  }, 0);
  const totalGoalContributions = data.goalContributions.filter(c => c.date.slice(0, 7) === month).reduce((sum, c) => sum + c.amount, 0);
  const balance = totalIncome - totalExpenses - totalDebtPayments;
  const suggestedSave = Math.round(totalIncome * data.settings.savePct);
  const commitments = remainingBudgets + totalGoalContributions + suggestedSave;
  const available = Math.max(0, balance - commitments);
  return { totalIncome, totalExpenses, balance, available, planned_total, totalGoalContributions, commitments, suggestedSave };
}


export function legacyExpensePolicyRejects(before: FinanceSnapshot, after: FinanceSnapshot, month: string, editing: boolean) {
  const b = legacyProjectedTotals(before, month), a = legacyProjectedTotals(after, month);
  const freeBefore = b.balance - b.commitments, freeAfter = a.balance - a.commitments;
  return freeAfter < 0 && (!editing || freeAfter < freeBefore);
}
/** Preserved legacy goal gate: monthly margin, deliberately NOT cash capacity. */
export function legacyGoalContributionPolicyRejects(data: FinanceSnapshot, month: string, amount: number) {
  return amount > selectMonthlyMetrics(data, month).monthlyPlanningMargin;
}

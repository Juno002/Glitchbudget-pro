import type { DebtPayment, Expense, GoalContribution, Income, Plan, Settings } from './db';

/** Calendar dates must use the user's timezone, not UTC. */
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDate(date) === value;
}

export function monthlyAmount(freq: string, amount: number): number {
  return freq === 'quincenal' ? amount * 2 : freq === 'semanal' ? Math.round(amount * 4.33) : amount;
}

export function expenseForMonth(expense: Expense, month: string): number {
  const startMonth = expense.date.slice(0, 7);
  if (expense.type === 'Fijo') {
    return startMonth <= month ? monthlyAmount(expense.frequency || 'mensual', expense.amount) : 0;
  }
  return startMonth === month ? expense.amount : 0;
}

export interface FinanceSnapshot {
  settings: Pick<Settings, 'baseIncome' | 'savePct'>;
  incomes: Income[];
  expenses: Expense[];
  budgets: Plan[];
  goalContributions: GoalContribution[];
  debtPayments: DebtPayment[];
}

export function calculateTotals(data: FinanceSnapshot, month: string) {
  const totalIncome = monthlyAmount(data.settings.baseIncome.freq, data.settings.baseIncome.amount)
    + data.incomes.filter(i => i.date.slice(0, 7) === month).reduce((sum, i) => sum + i.amount, 0);
  const cashExpenses = data.expenses.filter(e => e.paymentMethod !== 'credit');
  const totalExpenses = cashExpenses.reduce((sum, e) => sum + expenseForMonth(e, month), 0);
  const totalDebtPayments = data.debtPayments.filter(p => p.date.slice(0, 7) === month).reduce((sum, p) => sum + p.amount, 0);
  const monthBudgets = data.budgets.filter(b => b.month === month);
  const planned_total = monthBudgets.reduce((sum, b) => sum + b.limit, 0);
  // Reserve only the unspent portion; spending a planned amount must not reserve it twice.
  const remainingBudgets = monthBudgets.reduce((sum, b) => {
    const spent = data.expenses.filter(e => e.categoryId === b.categoryId)
      .reduce((total, e) => total + expenseForMonth(e, month), 0);
    return sum + Math.max(0, b.limit - spent);
  }, 0);
  const totalGoalContributions = data.goalContributions.filter(c => c.date.slice(0, 7) === month).reduce((sum, c) => sum + c.amount, 0);
  const balance = totalIncome - totalExpenses - totalDebtPayments;
  const suggestedSave = Math.round(totalIncome * data.settings.savePct);
  const commitments = remainingBudgets + totalGoalContributions + suggestedSave;
  const available = Math.max(0, balance - commitments);
  return { totalIncome, totalExpenses, balance, available, planned_total, totalGoalContributions, commitments, suggestedSave };
}

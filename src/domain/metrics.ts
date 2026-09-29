import type { Income, Expense } from './models';
import type { FinanceSnapshot } from './snapshot';
import { contains, periodContaining, periodForId, type DateRange, type PeriodRange, type PeriodSettings } from './periods';

/** Recorded activity: an actual purchase is counted once, on its recorded date. */
export function recordedExpenseForPeriod(expense: Expense, period: DateRange): number {
  return contains(period, expense.date) ? expense.amount : 0;
}

/** @deprecated Calendar-month compatibility wrapper. New consumers should pass a DateRange. */
export function recordedExpenseForMonth(expense: Expense, month: string): number {
  return recordedExpenseForPeriod(expense, periodForId(month, { periodStartDay: 1 }));
}

export function recordedCategoriesForPeriod(rows: Array<Income | Expense>, period: DateRange) {
  const groups = new Map<string, number>();
  rows.filter(row => contains(period, row.date)).forEach(row => groups.set(row.categoryId, (groups.get(row.categoryId) || 0) + row.amount));
  return Array.from(groups, ([name, value]) => ({ name, value }));
}

/** @deprecated Calendar-month compatibility wrapper. */
export function recordedCategories(rows: Array<Income | Expense>, month: string) {
  return recordedCategoriesForPeriod(rows, periodForId(month, { periodStartDay: 1 }));
}

export function selectPeriodMetrics(data: FinanceSnapshot, period: PeriodRange) {
  const periodIncome = data.incomes.filter(i => contains(period, i.date));
  const periodExpenses = data.expenses.filter(e => contains(period, e.date));
  const recordedIncome = periodIncome.reduce((s,i) => s+i.amount,0);
  const spending = periodExpenses.reduce((s,e) => s+e.amount,0);
  const cashSpending = periodExpenses.filter(e => e.paymentMethod !== 'credit').reduce((s,e) => s+e.amount,0);
  const cardSpending = spending - cashSpending;
  const cardPayments = data.debtPayments.filter(p => contains(period, p.date)).reduce((s,p) => s+p.amount,0);
  const periodBudgets = data.budgets.filter(b => b.month === period.id);
  const plannedBudgetTotal = periodBudgets.reduce((s,b) => s+b.limit,0);
  const remainingBudgets = periodBudgets.reduce((s,b) =>
    s + selectBudgetRemaining(b.limit, selectCategorySpendingForPeriod(periodExpenses, b.categoryId, period)).unspentBudgetReservation, 0);
  const goalContributions = data.goalContributions.filter(c => c.kind !== 'legacy_balance' && contains(period, c.date)).reduce((s,c) => s+c.amount,0);
  const suggestedSave = Math.round(recordedIncome * data.settings.savePct);
  const planningReservations = remainingBudgets + goalContributions + suggestedSave;
  const periodResult = recordedIncome-spending;
  return {
    recordedIncome,
    spending,
    cashSpending,
    cardSpending,
    cardPayments,
    cashFlow: recordedIncome-cashSpending-cardPayments,
    monthlyResult: periodResult,
    periodResult,
    monthlyPlanningMargin: periodResult-planningReservations,
    periodPlanningMargin: periodResult-planningReservations,
    plannedBudgetTotal,
    goalContributions,
    planningReservations,
    suggestedSave,
  };
}

/** @deprecated Calendar-month compatibility wrapper. */
export function selectMonthlyMetrics(data: FinanceSnapshot, month: string) {
  return selectPeriodMetrics(data, periodForId(month, { periodStartDay: 1 }));
}

export function selectCategorySpendingForPeriod(expenses: Expense[], categoryId: string, period: DateRange) {
  return expenses.filter(e => e.categoryId === categoryId).reduce((sum, e) => sum + recordedExpenseForPeriod(e, period), 0);
}

/** @deprecated Calendar-month compatibility wrapper. */
export function selectCategorySpending(expenses: Expense[], categoryId: string, month: string) {
  return selectCategorySpendingForPeriod(expenses, categoryId, periodForId(month, { periodStartDay: 1 }));
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
/** Explanatory chart split of the period result, not a cash-flow selector. */
export function selectMonthlyResultSplit(recordedIncome: number, spending: number) {
  return { surplus: Math.max(0, recordedIncome - spending), deficit: Math.max(0, spending - recordedIncome) };
}


export function selectPeriodAverages(
  data: FinanceSnapshot,
  currentPeriodId: string,
  settings: PeriodSettings = {},
  numPeriods = 3,
) {
  const periodIds = Array.from(new Set([
    currentPeriodId,
    ...[...data.incomes, ...data.expenses].map(row => periodContaining(row.date, settings).id),
  ]))
    .filter(id => id <= currentPeriodId)
    .sort()
    .slice(-numPeriods);

  const totals = periodIds.map(id => selectPeriodMetrics(data, periodForId(id, settings)));
  const totalIncome = totals.reduce((sum, metrics) => sum + metrics.recordedIncome, 0);
  const totalExpenses = totals.reduce((sum, metrics) => sum + metrics.spending, 0);
  const divisor = Math.max(1, periodIds.length);

  return {
    incomeAvgMonthly: totalIncome / divisor,
    expenseAvgMonthly: totalExpenses / divisor,
  };
}

export function selectDisposable(
  averages: { incomeAvgMonthly: number; expenseAvgMonthly: number },
  safetyPct = 0.05,
) {
  const safety = averages.incomeAvgMonthly * safetyPct;
  return Math.max(averages.incomeAvgMonthly - averages.expenseAvgMonthly - safety, 0);
}

export function selectExpensesByNature(expenses: Expense[], period: DateRange) {
  const groups = expenses
    .filter(expense => recordedExpenseForPeriod(expense, period) > 0)
    .reduce((acc, expense) => {
      const value = recordedExpenseForPeriod(expense, period);
      const current = acc[expense.nature] ?? { total: 0, count: 0 };
      current.total += value;
      current.count += 1;
      acc[expense.nature] = current;
      return acc;
    }, {} as Record<Expense['nature'], { total: number; count: number }>);

  return Object.entries(groups).map(([name, values]) => ({
    name,
    total: values.total,
    count: values.count,
    avg: values.total / Math.max(1, values.count),
  }));
}

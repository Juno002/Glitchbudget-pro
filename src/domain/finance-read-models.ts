import type {
  Account,
  AccountTransfer,
  Debt,
  DebtPayment,
  Expense,
  Goal,
  GoalContribution,
  Income,
  Plan,
  Settings,
} from './models';
import { normalizeFinancialPolicies } from '@/policies/settings';
import {
  recordedCategoriesForPeriod,
  recordedExpenseForPeriod,
  selectCategorySpendingForPeriod,
  selectPeriodMetrics,
} from './metrics';
import { periodContaining, periodForId, type BudgetPeriodRange, type DateRange } from './periods';
import { budgetPlanForRange, budgetPlansForRange, budgetStatusForRange } from './budgets';
import { selectPosition } from './ledger';
import { selectReportsSnapshot } from './reports';
import { goalView } from './goals';

export function selectDisposable(
  averages: { incomeAvgMonthly: number; expenseAvgMonthly: number },
  safetyPct = 0.05,
) {
  const safety = averages.incomeAvgMonthly * safetyPct;
  return Math.max(averages.incomeAvgMonthly - averages.expenseAvgMonthly - safety, 0);
}

export type FinanceReadModelSource = {
  settings: Settings;
  currentMonth: string;
  incomes: Income[];
  expenses: Expense[];
  budgets: Plan[];
  goalContributions: GoalContribution[];
  debtPayments: DebtPayment[];
  accounts: Account[];
  debts: Debt[];
  transfers: AccountTransfer[];
  expenseCategoryIds: string[];
};

export type ResolvedFinanceSettings = Omit<Settings, 'preventNegativeAccountBalance' | 'budgetOverspendingBehavior'> & {
  preventNegativeAccountBalance: boolean;
  budgetOverspendingBehavior: 'allow' | 'warn' | 'block';
};

export function resolveFinanceSettings(defaults: Settings, rawSettings: Settings | null): ResolvedFinanceSettings {
  const source: Partial<Settings> = rawSettings ?? {};
  return {
    ...defaults,
    ...source,
    ...normalizeFinancialPolicies(rawSettings ?? defaults),
    baseIncome: {
      amount: Math.max(0, Number(source.baseIncome?.amount ?? 0)),
      freq: source.baseIncome?.freq ?? 'mensual',
    },
    savePct: source.savePct ?? defaults.savePct,
  };
}

export function selectGoalViews(goals: Goal[], contributions: GoalContribution[]) {
  return goals.map(goal => goalView(goal, contributions));
}

export function createFinanceReadModels(source: FinanceReadModelSource) {
  const periodMetricsInput = {
    settings: source.settings,
    incomes: source.incomes,
    expenses: source.expenses,
    budgets: source.budgets,
    goalContributions: source.goalContributions,
    debtPayments: source.debtPayments,
  };

  const getSpentAmount = (categoryId: string, periodId: string) =>
    selectCategorySpendingForPeriod(
      source.expenses,
      categoryId,
      periodForId(periodId, source.settings),
    );

  const getTotals = (periodId: string) =>
    selectPeriodMetrics(periodMetricsInput, periodForId(periodId, source.settings));

  const getMonthlyAverages = (numMonths = 3) => {
    const periodIds = Array.from(new Set([
      source.currentMonth,
      ...[...source.incomes, ...source.expenses].map(row => periodContaining(row.date, source.settings).id),
    ]))
      .filter(id => id <= source.currentMonth)
      .sort()
      .slice(-numMonths);
    const totalIncome = periodIds.reduce((sum, id) => sum + getTotals(id).recordedIncome, 0);
    const totalExpenses = periodIds.reduce((sum, id) => sum + getTotals(id).spending, 0);
    const divisor = Math.max(1, periodIds.length);
    return {
      incomeAvgMonthly: totalIncome / divisor,
      expenseAvgMonthly: totalExpenses / divisor,
    };
  };

  const getDisposable = (safetyPct = 0.05) => selectDisposable(getMonthlyAverages(), safetyPct);

  const getBudgetStatusDetails = (periodId: string, budgetPeriod?: BudgetPeriodRange) => {
    const range = budgetPeriod ?? { ...periodForId(periodId, source.settings), kind: 'monthly' as const };
    const periodBudgets = budgetPlansForRange(source.budgets, range);
    const budgetedCategoryIds = new Set(periodBudgets.map(plan => plan.categoryId));
    const allRelevantCategoryIds = Array.from(new Set([
      ...source.expenseCategoryIds,
      ...budgetedCategoryIds,
      ...source.expenses
        .filter(expense => recordedExpenseForPeriod(expense, range) > 0)
        .map(expense => expense.categoryId),
    ]));

    return allRelevantCategoryIds.map(categoryId => {
      const budget = periodBudgets.find(plan => plan.categoryId === categoryId)
        ?? budgetPlanForRange(range, categoryId, 0);
      return budgetStatusForRange(
        budget,
        source.expenses,
        range,
        budgetedCategoryIds.has(categoryId),
      );
    });
  };

  const getExpensesByCategory = (periodId: string) =>
    recordedCategoriesForPeriod(source.expenses, periodForId(periodId, source.settings));

  const getIncomesByCategory = (periodId: string) =>
    recordedCategoriesForPeriod(source.incomes, periodForId(periodId, source.settings));

  const getReportSnapshot = (range: DateRange, through = range.end) =>
    selectReportsSnapshot({
      accounts: source.accounts,
      debts: source.debts,
      incomes: source.incomes,
      expenses: source.expenses,
      debtPayments: source.debtPayments,
      transfers: source.transfers,
    }, range, through);

  const getPosition = (through: string) =>
    selectPosition(
      source.accounts,
      source.debts,
      {
        incomes: source.incomes,
        expenses: source.expenses,
        payments: source.debtPayments,
        transfers: source.transfers,
      },
      through,
    );

  const getExpensesByType = (periodId: string) => {
    const period = periodForId(periodId, source.settings);
    const groups = new Map<string, { total: number; count: number }>();
    for (const expense of source.expenses) {
      const amount = recordedExpenseForPeriod(expense, period);
      if (amount <= 0) continue;
      const current = groups.get(expense.nature) ?? { total: 0, count: 0 };
      groups.set(expense.nature, { total: current.total + amount, count: current.count + 1 });
    }
    return Array.from(groups, ([name, value]) => ({
      name,
      total: value.total,
      count: value.count,
      avg: value.total / Math.max(1, value.count),
    }));
  };

  return {
    getSpentAmount,
    getTotals,
    getMonthlyAverages,
    getDisposable,
    getBudgetStatusDetails,
    getExpensesByCategory,
    getIncomesByCategory,
    getReportSnapshot,
    getPosition,
    getExpensesByType,
  };
}

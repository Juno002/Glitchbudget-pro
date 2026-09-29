import type {
  Account,
  AccountTransfer,
  Debt,
  DebtPayment,
  Expense,
  GoalContribution,
  Income,
  Investment,
  Plan,
} from './models';
import type { GoalView } from './goals';
import { goalFundingSchedule, goalMetrics } from './goals';
import {
  selectAccountBalance,
  selectAccountEntries,
  selectCardAvailableLimit,
  selectCardSignedBalance,
  selectPosition,
  type AccountSnapshot,
} from './ledger';
import { investmentProjection } from './investments';
import { budgetRangeForPlan, budgetStatusForRange } from './budgets';
import { contains, type PeriodRange } from './periods';

export type BudgetStatusDetail = ReturnType<typeof budgetStatusForRange>;

export function selectBudgetStatusCardModel(
  monthlyDetails: BudgetStatusDetail[],
  budgets: Plan[],
  expenses: Expense[],
  currentPeriod: PeriodRange,
  periodStartDay: number,
  today: string,
) {
  const trackedBudgets = monthlyDetails.filter(budget => budget.configured);
  const totalLimit = trackedBudgets.reduce((sum, budget) => sum + budget.limit, 0);
  const totalSpent = trackedBudgets.reduce((sum, budget) => sum + budget.spent, 0);
  const anchor = contains(currentPeriod, today) ? today : currentPeriod.end;
  const otherBudgets = budgets
    .filter(plan => plan.periodType && plan.periodType !== 'monthly')
    .map(plan => budgetStatusForRange(plan, expenses, budgetRangeForPlan(plan, { periodStartDay })))
    .filter(detail => contains(detail.range, anchor))
    .sort((a, b) => b.percentage - a.percentage);

  return {
    trackedBudgets,
    totalLimit,
    totalSpent,
    totalRemaining: totalLimit - totalSpent,
    anchor,
    otherBudgets,
  };
}

export type AccountOverviewSource = AccountSnapshot & {
  accounts: Account[];
  debts: Debt[];
};

export function selectAccountsOverviewModel(data: AccountOverviewSource, through: string) {
  const cards = data.debts.filter(debt => debt.type === 'credit_card');
  const liquidAccounts = data.accounts.filter(account => account.type !== 'investment');
  const position = selectPosition(data.accounts, data.debts, data, through);
  const unassignedCount =
    data.incomes.filter(income => !income.accountId).length
    + data.expenses.filter(expense => expense.paymentMethod !== 'credit' && !expense.accountId).length
    + data.payments.filter(payment => !payment.accountId).length;

  const accounts = liquidAccounts.map(account => ({
    account,
    balance: selectAccountBalance(account, data, through),
    entries: selectAccountEntries(account, data, through).slice(0, 50).map(entry => ({
      ...entry,
      transfer: entry.kind === 'transfer'
        ? data.transfers.find(transfer => transfer.id === entry.id)
        : undefined,
    })),
  }));

  return {
    cards,
    liquidAccounts,
    position,
    unassignedCount,
    accounts,
  };
}

export function selectGoalManagerRows(
  goals: GoalView[],
  contributions: GoalContribution[],
  today: string,
  periodStartDay: number,
) {
  return goals.map(goal => ({
    goal,
    metrics: goalMetrics(goal, contributions, today, { periodStartDay }),
    legacyBalance: contributions
      .filter(row => row.goalId === goal.id && row.kind === 'legacy_balance')
      .reduce((sum, row) => sum + row.amount, 0),
  }));
}

export function selectGoalContributionPrompt(goal: GoalView) {
  const remaining = Math.max(0, goal.target - goal.saved);
  return {
    remaining,
    suggestedAmount: Math.min(goal.quota, remaining),
  };
}

export function goalContributionCompletes(goal: GoalView, contributionAmount: number) {
  return goal.saved < goal.target && goal.saved + contributionAmount >= goal.target;
}

export function selectGoalFundingSuggestion(
  target: number,
  saved: number,
  deadline: string | undefined,
  today: string,
  periodStartDay: number,
) {
  return goalFundingSchedule(Math.max(0, target - saved), deadline, today, { periodStartDay });
}

export function selectCreditCardView(
  debt: Debt,
  expenses: Expense[],
  payments: DebtPayment[],
  through: string,
) {
  const signedBalance = selectCardSignedBalance(debt, expenses, payments, through);
  return {
    signedBalance,
    isSurplus: signedBalance < 0,
    absoluteBalance: Math.abs(signedBalance),
    availableLimit: selectCardAvailableLimit(debt.principal, signedBalance),
    usagePercentage: debt.principal > 0
      ? Math.min(100, Math.max(0, (signedBalance / debt.principal) * 100))
      : 0,
  };
}

export type InvestmentManagerSource = AccountSnapshot & {
  accounts: Account[];
  investments: Investment[];
};

export function selectInvestmentManagerRows(data: InvestmentManagerSource, through: string) {
  return [...data.investments]
    .sort((a, b) =>
      (a.maturityDate || '9999-12-31').localeCompare(b.maturityDate || '9999-12-31')
      || a.name.localeCompare(b.name, 'es'))
    .map(investment => {
      const account = data.accounts.find(row => row.id === investment.accountId);
      if (!account) return null;
      return {
        investment,
        account,
        currentValue: selectAccountBalance(account, data, through),
        projection: investmentProjection(investment, through),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export function selectBudgetsWithAvailableFunds(details: BudgetStatusDetail[]) {
  return details.filter(detail => detail.remaining > 0);
}

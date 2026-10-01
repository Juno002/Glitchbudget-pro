import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { selectBudgetStatusDetails } from '../src/domain/budgets';
import { goalMetrics, goalView } from '../src/domain/goals';
import { selectHomeReadModel } from '../src/domain/home';
import { selectPosition } from '../src/domain/ledger';
import { selectPeriodMetrics } from '../src/domain/metrics';
import type {
  Account,
  AccountTransfer,
  Debt,
  DebtPayment,
  Expense,
  Goal,
  GoalContribution,
  Income,
  Investment,
  Plan,
  PlannedOccurrence,
  RecurringRule,
} from '../src/domain/models';
import { periodForId } from '../src/domain/periods';
import { selectReportsSnapshot } from '../src/domain/reports';
import { selectPlannedPaymentsManagerReadModel } from '../src/domain/upcoming';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/phase-20-7-5-8-golden.json', import.meta.url), 'utf8'),
) as {
  asOf: string;
  reportRange: { start: string; end: string };
  settings: { savePct: number; periodStartDay: number };
  accounts: Account[];
  debts: Debt[];
  incomes: Income[];
  expenses: Expense[];
  debtPayments: DebtPayment[];
  transfers: AccountTransfer[];
  plans: Plan[];
  goals: Goal[];
  goalContributions: GoalContribution[];
  recurringRules: RecurringRule[];
  plannedOccurrences: PlannedOccurrence[];
  investments: Investment[];
  expected: any;
  periodBoundary: {
    settings: { savePct: number; periodStartDay: number };
    incomes: Income[];
    expenses: Expense[];
    expected: any;
  };
};

const snapshot = {
  incomes: fixture.incomes,
  expenses: fixture.expenses,
  payments: fixture.debtPayments,
  transfers: fixture.transfers,
};

test('20.7.5.8 golden ledger reconciles opening balances, real movements, debts, surplus and funded investment', () => {
  const actual = selectPosition(fixture.accounts, fixture.debts, snapshot, fixture.asOf);
  const expected = fixture.expected.position;

  assert.deepEqual(
    {
      cash: actual.cash,
      bank: actual.bank,
      investmentAssets: actual.investmentAssets,
      liquidAssets: actual.liquidAssets,
      liabilities: actual.liabilities,
      cardPositiveBalance: actual.cardPositiveBalance,
      netWorth: actual.netWorth,
      cardSignedBalance: actual.balances.find(row => row.id === 'card')?.signedBalance,
      loanCompatibilityBalance: actual.loanBalances.find(row => row.id === 'loan')?.compatibilityBalance,
    },
    expected,
  );
});

test('20.7.5.8 transfers and investment funding change asset location without changing golden net worth', () => {
  const withoutTransfers = selectPosition(
    fixture.accounts,
    fixture.debts,
    { ...snapshot, transfers: [] },
    fixture.asOf,
  );
  assert.deepEqual(
    {
      cash: withoutTransfers.cash,
      bank: withoutTransfers.bank,
      investmentAssets: withoutTransfers.investmentAssets,
      liquidAssets: withoutTransfers.liquidAssets,
      liabilities: withoutTransfers.liabilities,
      cardPositiveBalance: withoutTransfers.cardPositiveBalance,
      netWorth: withoutTransfers.netWorth,
    },
    fixture.expected.withoutTransfers,
  );

  const funded = selectPosition(fixture.accounts, fixture.debts, snapshot, fixture.asOf);
  assert.equal(funded.netWorth, withoutTransfers.netWorth);
  assert.equal(funded.investmentAssets, fixture.expected.position.investmentAssets);
  assert.equal(funded.liquidAssets, fixture.expected.position.liquidAssets);
});

test('20.7.5.8 Reports and period metrics reconcile independently declared spending, debt payments and cash flow', () => {
  const report = selectReportsSnapshot(
    {
      accounts: fixture.accounts,
      debts: fixture.debts,
      incomes: fixture.incomes,
      expenses: fixture.expenses,
      debtPayments: fixture.debtPayments,
      transfers: fixture.transfers,
    },
    fixture.reportRange,
    fixture.asOf,
  );

  assert.equal(report.spending.total, fixture.expected.reports.spending);
  assert.equal(report.spending.transactionCount, fixture.expected.reports.transactionCount);
  assert.deepEqual(report.spending.categories, fixture.expected.reports.categories);
  assert.deepEqual(report.cashFlow, fixture.expected.reports.cashFlow);
  assert.deepEqual(report.netWorth, fixture.expected.reports.netWorth);

  const period = periodForId('2026-09', { periodStartDay: fixture.settings.periodStartDay });
  const metrics = selectPeriodMetrics(
    {
      settings: { savePct: fixture.settings.savePct },
      incomes: fixture.incomes,
      expenses: fixture.expenses,
      budgets: fixture.plans,
      goalContributions: fixture.goalContributions,
      debtPayments: fixture.debtPayments,
    },
    period,
  );
  assert.deepEqual(metrics, fixture.expected.periodMetrics);
});

test('20.7.5.8 budgets, goals and planned payments reconcile while planning remains financially neutral', () => {
  const budgetRange = { ...periodForId('2026-09'), kind: 'monthly' as const };
  const budgetDetails = selectBudgetStatusDetails(
    fixture.plans,
    fixture.expenses,
    ['food', 'housing'],
    budgetRange,
  );
  const food = budgetDetails.find(row => row.categoryId === 'food');
  assert.ok(food);
  assert.deepEqual(
    {
      limit: food.limit,
      spent: food.spent,
      remaining: food.remaining,
      percentage: food.percentage,
      status: food.status,
      configured: food.configured,
    },
    fixture.expected.budget,
  );

  const goal = goalMetrics(
    fixture.goals[0],
    fixture.goalContributions,
    fixture.asOf,
    { periodStartDay: fixture.settings.periodStartDay },
  );
  assert.deepEqual(
    {
      saved: goal.saved,
      remaining: goal.remaining,
      status: goal.status,
      periods: goal.periods,
      requiredMonthly: goal.requiredMonthly,
      overdue: goal.overdue,
    },
    fixture.expected.goal,
  );

  const planned = selectPlannedPaymentsManagerReadModel(
    fixture.plannedOccurrences,
    fixture.recurringRules,
    fixture.asOf,
  );
  assert.equal(planned.unresolvedCount, fixture.expected.planning.unresolvedCount);
  assert.deepEqual(planned.grouped.next7.map(row => row.id), fixture.expected.planning.next7);
  assert.deepEqual(planned.recentResolved.map(row => row.id), fixture.expected.planning.recentResolved);

  const financial = selectPosition(fixture.accounts, fixture.debts, snapshot, fixture.asOf);
  assert.equal(financial.netWorth, fixture.expected.position.netWorth);
});

test('20.7.5.8 Home reconciles the same golden position without turning planning into money', () => {
  const report = selectReportsSnapshot(
    {
      accounts: fixture.accounts,
      debts: fixture.debts,
      incomes: fixture.incomes,
      expenses: fixture.expenses,
      debtPayments: fixture.debtPayments,
      transfers: fixture.transfers,
    },
    fixture.reportRange,
    fixture.asOf,
  );
  const budgetRange = { ...periodForId('2026-09'), kind: 'monthly' as const };
  const budgetDetails = selectBudgetStatusDetails(fixture.plans, fixture.expenses, ['food', 'housing'], budgetRange);
  const home = selectHomeReadModel({
    report,
    budgetDetails,
    plannedOccurrences: fixture.plannedOccurrences,
    recurringRules: fixture.recurringRules,
    goals: fixture.goals.map(goal => goalView(goal, fixture.goalContributions)),
    investments: fixture.investments,
    today: fixture.asOf,
    periodStartDay: fixture.settings.periodStartDay,
  });

  assert.equal(home.attentionCount, fixture.expected.home.attentionCount);
  assert.deepEqual(home.position, fixture.expected.home.position);
  assert.deepEqual(home.budget, fixture.expected.home.budget);
  assert.deepEqual(
    {
      rows: home.upcoming.rows.map(row => row.occurrence.id),
      overdueCount: home.upcoming.overdueCount,
      todayCount: home.upcoming.todayCount,
    },
    fixture.expected.home.upcoming,
  );
  assert.deepEqual(
    {
      count: home.goals.length,
      remaining: home.goals[0]?.remaining,
      periods: home.goals[0]?.schedule.periods,
      requiredMonthly: home.goals[0]?.schedule.requiredMonthly,
    },
    fixture.expected.home.goals,
  );
  assert.deepEqual(
    {
      totalRegistered: home.investments.totalRegistered,
      activeCount: home.investments.activeCount,
      rowCount: home.investments.rows.length,
      maturedCount: home.investments.maturedCount,
    },
    fixture.expected.home.investments,
  );
});

test('20.7.5.8 financial-period boundary assigns Sep 24 and Sep 25 to different golden periods', () => {
  const data = fixture.periodBoundary;
  const september = periodForId('2026-09', { periodStartDay: data.settings.periodStartDay });
  const october = periodForId('2026-10', { periodStartDay: data.settings.periodStartDay });

  assert.deepEqual(september, data.expected.september.range);
  assert.deepEqual(october, data.expected.october.range);

  const base = {
    settings: { savePct: data.settings.savePct },
    incomes: data.incomes,
    expenses: data.expenses,
    budgets: [],
    goalContributions: [],
    debtPayments: [],
  };
  const septemberMetrics = selectPeriodMetrics(base, september);
  const octoberMetrics = selectPeriodMetrics(base, october);

  assert.deepEqual(
    {
      recordedIncome: septemberMetrics.recordedIncome,
      spending: septemberMetrics.spending,
      cashFlow: septemberMetrics.cashFlow,
      periodResult: septemberMetrics.periodResult,
    },
    data.expected.september.metrics,
  );
  assert.deepEqual(
    {
      recordedIncome: octoberMetrics.recordedIncome,
      spending: octoberMetrics.spending,
      cashFlow: octoberMetrics.cashFlow,
      periodResult: octoberMetrics.periodResult,
    },
    data.expected.october.metrics,
  );
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  selectBudgetCategoryGroups,
  selectBudgetStatusDetails,
  selectBudgetStatusOverview,
  selectFundedBudgetDetails,
} from '../src/domain/budgets';
import {
  goalDraftFundingSchedule,
  goalManagerReadModel,
  goalWouldComplete,
} from '../src/domain/goals';
import {
  selectAccountOverviewReadModel,
  selectCardReadModel,
} from '../src/domain/ledger';
import {
  selectDisposable,
  selectExpensesByNature,
  selectPeriodAverages,
} from '../src/domain/metrics';
import { evaluateAchievementEligibility } from '../src/domain/achievements';
import type {
  Account,
  Debt,
  Expense,
  Goal,
  GoalContribution,
  Income,
  Plan,
} from '../src/domain/models';

const period = { id: '2026-09', start: '2026-09-01', end: '2026-09-30' };

const expense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'expense-1',
  nature: 'Variable',
  concept: 'Compra',
  amount: 3_000,
  date: '2026-09-10',
  categoryId: 'food',
  month: '2026-09',
  paymentMethod: 'cash',
  ...overrides,
});

const income = (overrides: Partial<Income> = {}): Income => ({
  id: 'income-1',
  type: 'extra',
  description: 'Ingreso',
  amount: 10_000,
  date: '2026-09-05',
  categoryId: 'salary',
  month: '2026-09',
  ...overrides,
});

test('budget selectors provide totals, funded options and plan grouping without UI formulas', () => {
  const plans: Plan[] = [{ month:'2026-09', categoryId:'food', limit:10_000 }];
  const expenses = [expense()];
  const details = selectBudgetStatusDetails(
    plans,
    expenses,
    ['food', 'transport'],
    { ...period, kind:'monthly' },
  );

  const food = details.find(row => row.categoryId === 'food');
  assert.equal(food?.spent, 3_000);
  assert.equal(food?.remaining, 7_000);
  assert.equal(food?.status, 'ok');

  assert.deepEqual(selectFundedBudgetDetails(details).map(row => row.categoryId), ['food']);
  assert.deepEqual(selectBudgetCategoryGroups(['food', 'transport'], details), {
    active:['food'],
    inactive:['transport'],
  });

  const overview = selectBudgetStatusOverview(plans, expenses, ['food'], period, '2026-09-15');
  assert.equal(overview.totalLimit, 10_000);
  assert.equal(overview.totalSpent, 3_000);
  assert.equal(overview.totalRemaining, 7_000);
  assert.equal(overview.anchor, '2026-09-15');
});

test('goal read model centralizes remaining, legacy progress, suggested contribution and completion', () => {
  const goal: Goal = {
    id:'goal-1',
    name:'Meta',
    target:10_000,
    quota:2_000,
    startDate:'2026-09-01',
    date:'2026-11-30',
  };
  const contributions: GoalContribution[] = [
    { id:'c1', goalId:goal.id, amount:3_000, date:'2026-09-05' },
    { id:'legacy', goalId:goal.id, amount:1_000, date:'2026-09-01', kind:'legacy_balance' },
  ];

  const model = goalManagerReadModel(goal, contributions, '2026-09-15');
  assert.equal(model.saved, 4_000);
  assert.equal(model.remaining, 6_000);
  assert.equal(model.legacyBalance, 1_000);
  assert.equal(model.suggestedContribution, 2_000);
  assert.equal(goalWouldComplete(model, 6_000), true);
  assert.equal(goalWouldComplete(model, 5_999), false);

  const schedule = goalDraftFundingSchedule(10_000, 4_000, '2026-11-30', '2026-09-15');
  assert.equal(schedule.requiredMonthly, 2_000);
});

test('ledger read models centralize credit utilization and unassigned movement classification', () => {
  const debt: Debt = {
    id:'card-1',
    name:'Card',
    type:'credit_card',
    principal:100_000,
    apr:0,
    minPayment:0,
    createdAt:'2026-09-01T00:00:00',
    status:'active',
    openingAdjustment:10_000,
  };
  const creditExpense = expense({ id:'credit', amount:20_000, paymentMethod:'credit', debtId:debt.id, accountId:undefined });
  const card = selectCardReadModel(
    debt,
    [creditExpense],
    [{ id:'pay-1', debtId:debt.id, amount:5_000, date:'2026-09-12', accountId:'bank' }],
    '2026-09-30',
  );
  assert.equal(card.signedBalance, 25_000);
  assert.equal(card.availableLimit, 75_000);
  assert.equal(card.utilizationPercent, 25);
  assert.equal(card.isSurplus, false);

  const accounts: Account[] = [
    { id:'cash', name:'Efectivo', type:'cash', currency:'DOP', openingBalance:0, startDate:'2026-09-01' },
    { id:'invest', name:'Inv', type:'investment', currency:'DOP', openingBalance:50_000, startDate:'2026-09-01' },
  ];
  const overview = selectAccountOverviewReadModel(accounts, [debt], {
    incomes:[income({ accountId:undefined })],
    expenses:[expense({ accountId:undefined })],
    payments:[{ id:'p2', debtId:debt.id, amount:100, date:'2026-09-15' }],
    transfers:[],
  }, '2026-09-30');

  assert.equal(overview.liquidAccounts.length, 1);
  assert.equal(overview.cards.length, 1);
  assert.equal(overview.unassignedMovementCount, 3);
  assert.equal(overview.position.investmentAssets, 50_000);
});

test('period aggregate selectors preserve averages, disposable and expense nature breakdown', () => {
  const data = {
    settings:{ savePct:0 },
    incomes:[
      income({ id:'aug-income', amount:8_000, date:'2026-08-05', month:'2026-08' }),
      income({ id:'sep-income', amount:10_000, date:'2026-09-05', month:'2026-09' }),
    ],
    expenses:[
      expense({ id:'aug-expense', amount:2_000, date:'2026-08-10', month:'2026-08', nature:'Fijo' }),
      expense({ id:'sep-expense', amount:4_000, date:'2026-09-10', month:'2026-09', nature:'Variable' }),
    ],
    budgets:[],
    goalContributions:[],
    debtPayments:[],
  };

  const averages = selectPeriodAverages(data, '2026-09', {}, 2);
  assert.equal(averages.incomeAvgMonthly, 9_000);
  assert.equal(averages.expenseAvgMonthly, 3_000);
  assert.equal(selectDisposable(averages, 0.05), 5_550);

  const nature = selectExpensesByNature(data.expenses, period);
  assert.deepEqual(nature, [{ name:'Variable', total:4_000, count:1, avg:4_000 }]);
});

test('achievement evaluation is pure and preserves financial thresholds', () => {
  const goal: Goal = { id:'goal', name:'Meta', target:1_000_000, quota:0, startDate:'2026-01-01' };
  const contributions: GoalContribution[] = [
    { id:'g1', goalId:'goal', amount:1_000_000, date:'2026-09-01' },
    { id:'g2', goalId:'goal', amount:1, date:'2026-09-02' },
    { id:'g3', goalId:'goal', amount:1, date:'2026-09-03' },
  ];
  const goalModel = goalManagerReadModel(goal, contributions, '2026-09-15');
  const plans: Plan[] = Array.from({length:5}, (_,i) => ({ month:'2026-09', categoryId:'cat'+i, limit:10_000 }));
  const budgetDetails = plans.map((plan,i) => ({
    ...plan,
    range:{...period, kind:'monthly' as const},
    spent:9_000,
    remaining:1_000,
    percentage:90,
    configured:true,
    status:'alert' as const,
  }));

  const evaluation = evaluateAchievementEligibility({
    expenses:[
      expense({ id:'e1', month:'2026-07', date:'2026-07-01' }),
      expense({ id:'e2', month:'2026-08', date:'2026-08-01' }),
      expense({ id:'e3', month:'2026-09', date:'2026-09-01' }),
      expense({ id:'e4' }),
      expense({ id:'e5' }),
    ],
    incomes:[
      income({ id:'i1', categoryId:'a' }),
      income({ id:'i2', categoryId:'b' }),
      income({ id:'i3', categoryId:'c' }),
    ],
    goals:[goalModel],
    goalContributions:contributions,
    budgets:plans,
    currentMonth:'2026-09',
    budgetDetails,
    streak:3,
  });

  for (const id of ['goal_complete','big_saver','budget_master','budget_under_control','diversified_income','zero_waste','consistent_tracker','saver_streak_3']) {
    assert.ok(evaluation.eligible.includes(id as never), id);
  }
  assert.equal(evaluation.nextStreak, 3);
});

test('React surfaces no longer own the residual formulas found by 19.5.1', () => {
  const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

  const budgetStatus = source('src/components/dashboard/budget-status.tsx');
  assert.match(budgetStatus, /selectBudgetStatusOverview/);
  assert.doesNotMatch(budgetStatus, /trackedBudgets\.reduce|budget\.limit\s*-\s*budget\.spent/);

  const goals = source('src/components/dashboard/goals-manager.tsx');
  assert.match(goals, /goalManagerReadModel/);
  assert.doesNotMatch(goals, /goal\.target\s*-\s*goal\.saved|legacy_balance['"]\)\.reduce/);

  const debts = source('src/components/dashboard/debts-tab.tsx');
  assert.match(debts, /selectCardReadModel/);
  assert.doesNotMatch(debts, /currentDebt\s*\/\s*debt\.principal/);

  const transfer = source('src/components/dashboard/transfer-dialog.tsx');
  assert.match(transfer, /selectFundedBudgetDetails/);
  assert.doesNotMatch(transfer, /\.filter\(b\s*=>\s*b\.remaining\s*>\s*0\)/);

  const accounts = source('src/components/dashboard/accounts-overview.tsx');
  assert.match(accounts, /selectAccountOverviewReadModel/);
  assert.doesNotMatch(accounts, /data\.incomes\.filter\(i\s*=>\s*!i\.accountId\)/);

  const context = source('src/contexts/finance-context.tsx');
  assert.match(context, /selectPeriodAverages/);
  assert.match(context, /selectExpensesByNature/);
  assert.match(context, /selectBudgetStatusDetails/);
  assert.doesNotMatch(context, /periodIds\.reduce|const groupT\s*=|budgetPlansForRange/);

  const achievements = source('src/hooks/use-achievements.ts');
  assert.match(achievements, /evaluateAchievementEligibility/);
  assert.doesNotMatch(achievements, /totalSaved\s*=\s*goals\.reduce|remaining\s*<=\s*b\.limit\s*\*\s*0\.1/);

  const planning = source('src/components/dashboard/planning-tab.tsx');
  assert.match(planning, /selectBudgetCategoryGroups/);
  assert.doesNotMatch(planning, /activeIds|inactiveIds/);
});

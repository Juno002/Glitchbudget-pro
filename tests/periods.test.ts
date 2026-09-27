import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  contains,
  nextPeriod,
  normalizePeriodStartDay,
  periodContaining,
  periodForId,
  previousComparablePeriod,
} from '../src/domain/periods';
import { selectPeriodMetrics, recordedCategoriesForPeriod, selectCategorySpendingForPeriod } from '../src/domain/metrics';
import { evaluateBudgetOverspending } from '../src/policies/budget-overspending';

test('calendar periods remain normal months when start day is 1', () => {
  const period = periodForId('2026-09', { periodStartDay: 1 });
  assert.deepEqual(period, { id: '2026-09', start: '2026-09-01', end: '2026-09-30' });
  assert.equal(periodContaining('2026-09-30', { periodStartDay: 1 }).id, '2026-09');
  assert.equal(nextPeriod(period, { periodStartDay: 1 }).id, '2026-10');
  assert.equal(previousComparablePeriod(period, { periodStartDay: 1 }).id, '2026-08');
});

test('start day 25 produces 25 previous month through 24 selected month', () => {
  const period = periodForId('2026-09', { periodStartDay: 25 });
  assert.deepEqual(period, { id: '2026-09', start: '2026-08-25', end: '2026-09-24' });
  assert.equal(periodContaining('2026-08-24', { periodStartDay: 25 }).id, '2026-08');
  assert.equal(periodContaining('2026-08-25', { periodStartDay: 25 }).id, '2026-09');
  assert.equal(periodContaining('2026-09-24', { periodStartDay: 25 }).id, '2026-09');
  assert.equal(periodContaining('2026-09-25', { periodStartDay: 25 }).id, '2026-10');
  assert.deepEqual(previousComparablePeriod(period, { periodStartDay: 25 }), { id: '2026-08', start: '2026-07-25', end: '2026-08-24' });
  assert.deepEqual(nextPeriod(period, { periodStartDay: 25 }), { id: '2026-10', start: '2026-09-25', end: '2026-10-24' });
});

test('days 29-31 clamp safely and periods remain contiguous across short months', () => {
  const leap = periodForId('2024-03', { periodStartDay: 31 });
  assert.deepEqual(leap, { id: '2024-03', start: '2024-02-29', end: '2024-03-30' });
  const next = nextPeriod(leap, { periodStartDay: 31 });
  assert.deepEqual(next, { id: '2024-04', start: '2024-03-31', end: '2024-04-29' });
  assert.equal(periodContaining('2024-04-30', { periodStartDay: 31 }).id, '2024-05');
});

test('contains is inclusive and validates real dates', () => {
  const range = { start: '2026-08-25', end: '2026-09-24' };
  assert.equal(contains(range, '2026-08-25'), true);
  assert.equal(contains(range, '2026-09-24T23:59:59Z'), true);
  assert.equal(contains(range, '2026-09-25'), false);
  assert.throws(() => contains(range, '2026-02-30'), /Fecha inválida/);
});

test('invalid period start settings fall back to calendar month', () => {
  for (const value of [undefined, null, 0, 32, 1.5, 'x']) assert.equal(normalizePeriodStartDay(value), 1);
  assert.equal(normalizePeriodStartDay(25), 25);
});

test('period metrics use dates, not persisted month fields', () => {
  const period = periodForId('2026-09', { periodStartDay: 25 });
  const data = {
    settings: { savePct: 0 },
    incomes: [
      { id:'i1', type:'extra' as const, description:'Dentro', amount:10000, date:'2026-08-25', categoryId:'salary', month:'1999-01' },
      { id:'i2', type:'extra' as const, description:'Fuera', amount:50000, date:'2026-09-25', categoryId:'salary', month:'2026-09' },
    ],
    expenses: [
      { id:'e1', nature:'Variable' as const, concept:'Dentro', amount:3000, date:'2026-09-24', categoryId:'food', month:'2099-12' },
      { id:'e2', nature:'Variable' as const, concept:'Fuera', amount:9000, date:'2026-09-25', categoryId:'food', month:'2026-09' },
    ],
    budgets: [{ month:'2026-09', categoryId:'food', limit:5000 }],
    goalContributions: [],
    debtPayments: [],
  };
  const metrics = selectPeriodMetrics(data, period);
  assert.equal(metrics.recordedIncome, 10000);
  assert.equal(metrics.spending, 3000);
  assert.equal(metrics.plannedBudgetTotal, 5000);
  assert.equal(metrics.monthlyResult, 7000);
  assert.equal(selectCategorySpendingForPeriod(data.expenses, 'food', period), 3000);
  assert.deepEqual(recordedCategoriesForPeriod(data.expenses, period), [{ name:'food', value:3000 }]);
});

test('budget policy evaluates the financial period containing the expense', () => {
  const period = periodForId('2026-09', { periodStartDay: 25 });
  const existing = { id:'old', nature:'Variable' as const, concept:'Old', amount:4000, date:'2026-08-26', categoryId:'food', month:'2026-08' };
  const row = { id:'new', nature:'Variable' as const, concept:'New', amount:2000, date:'2026-09-24', categoryId:'food', month:'2026-09' };
  const plan = { month:'2026-09', categoryId:'food', limit:5000 };
  const result = evaluateBudgetOverspending([existing], row, plan, 'block', period);
  assert.equal(result.before, 4000);
  assert.equal(result.after, 6000);
  assert.equal(result.decision, 'block');
  assert.equal(result.period.id, '2026-09');
});

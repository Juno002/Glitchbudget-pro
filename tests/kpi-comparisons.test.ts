import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareKpi, selectPositionKpiComparisons } from '../src/domain/kpi-comparisons';
import type { ReportsSnapshotInput } from '../src/domain/reports';

const currentPeriod = { start: '2026-09-01', end: '2026-09-30' };
const comparablePeriod = { start: '2026-08-01', end: '2026-08-31' };

test('20.8.2 declares periods, values, absolute delta and percentage delta', () => {
  assert.deepEqual(compareKpi(currentPeriod, comparablePeriod, 12500, 10000), {
    currentPeriod,
    comparablePeriod,
    current: 12500,
    previous: 10000,
    absoluteDelta: 2500,
    percentageDelta: 25,
    status: 'comparable',
  });
});

test('20.8.2 distinguishes a real zero previous value from an absent comparable base', () => {
  assert.deepEqual(compareKpi(currentPeriod, comparablePeriod, 5000, 0), {
    currentPeriod,
    comparablePeriod,
    current: 5000,
    previous: 0,
    absoluteDelta: 5000,
    percentageDelta: null,
    status: 'zero_previous',
  });

  assert.deepEqual(compareKpi(currentPeriod, null, 5000, null), {
    currentPeriod,
    comparablePeriod: null,
    current: 5000,
    previous: null,
    absoluteDelta: null,
    percentageDelta: null,
    status: 'no_previous_base',
  });
});

test('20.8.2 uses the ledger-backed position selector for the four required KPIs', () => {
  const input: ReportsSnapshotInput = {
    accounts: [
      { id: 'cash', name: 'Cash', type: 'cash', currency: 'DOP', openingBalance: 10000, startDate: '2026-01-01' },
      { id: 'bank', name: 'Bank', type: 'bank', currency: 'DOP', openingBalance: 20000, startDate: '2026-01-01' },
      { id: 'inv', name: 'Investment', type: 'investment', currency: 'DOP', openingBalance: 30000, startDate: '2026-01-01' },
    ],
    debts: [
      { id: 'card', name: 'Card', type: 'credit_card', principal: 0, apr: 0, minPayment: 0, createdAt: '2026-01-01T00:00:00.000Z', status: 'active' },
    ],
    incomes: [
      { id: 'aug-income', type: 'extra', description: 'Income', amount: 10000, date: '2026-08-10', month: '2026-08', categoryId: 'salary', accountId: 'bank' },
      { id: 'sep-income', type: 'extra', description: 'Income', amount: 5000, date: '2026-09-10', month: '2026-09', categoryId: 'salary', accountId: 'bank' },
    ],
    expenses: [
      { id: 'aug-card', concept: 'Card purchase', amount: 4000, date: '2026-08-20', month: '2026-08', categoryId: 'food', nature: 'Variable', paymentMethod: 'credit', debtId: 'card' },
      { id: 'sep-cash', concept: 'Cash expense', amount: 2000, date: '2026-09-20', month: '2026-09', categoryId: 'food', nature: 'Variable', paymentMethod: 'cash', accountId: 'cash' },
    ],
    debtPayments: [],
    transfers: [],
  };

  const result = selectPositionKpiComparisons(input, currentPeriod, comparablePeriod);

  assert.deepEqual(result.liquidAvailable.currentPeriod, currentPeriod);
  assert.deepEqual(result.liquidAvailable.comparablePeriod, comparablePeriod);
  assert.equal(result.liquidAvailable.current, 43000);
  assert.equal(result.liquidAvailable.previous, 40000);
  assert.equal(result.netWorth.current, 69000);
  assert.equal(result.netWorth.previous, 66000);
  assert.equal(result.totalDebt.current, 4000);
  assert.equal(result.totalDebt.previous, 4000);
  assert.equal(result.investments.current, 30000);
  assert.equal(result.investments.previous, 30000);
});

test('20.8.2 exposes an explicit no-base state for all required position KPIs', () => {
  const input: ReportsSnapshotInput = {
    accounts: [
      { id: 'cash', name: 'Cash', type: 'cash', currency: 'DOP', openingBalance: 10000, startDate: '2026-01-01' },
    ],
    debts: [],
    incomes: [],
    expenses: [],
    debtPayments: [],
    transfers: [],
  };

  const result = selectPositionKpiComparisons(input, currentPeriod, null);
  for (const comparison of Object.values(result)) {
    assert.equal(comparison.status, 'no_previous_base');
    assert.equal(comparison.comparablePeriod, null);
    assert.equal(comparison.previous, null);
    assert.equal(comparison.absoluteDelta, null);
    assert.equal(comparison.percentageDelta, null);
  }
});

test('20.8.2 report net-worth comparison reuses the canonical zero-base semantics', async () => {
  const { selectReportsSnapshot } = await import('../src/domain/reports');
  const empty: ReportsSnapshotInput = {
    accounts: [],
    debts: [],
    incomes: [],
    expenses: [],
    debtPayments: [],
    transfers: [],
  };
  const report = selectReportsSnapshot(empty, currentPeriod);

  assert.deepEqual(report.comparison.netWorth, {
    current: 0,
    previous: 0,
    difference: 0,
    percentChange: null,
    status: 'zero_previous',
  });
});

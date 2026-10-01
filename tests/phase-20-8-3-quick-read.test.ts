import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  QUICK_READ_THRESHOLDS,
  selectReportQuickRead,
  type ReportQuickReadInput,
} from '../src/domain/report-insights';
import { selectReportsSnapshot, type ReportsSnapshotInput } from '../src/domain/reports';

function baseInput(overrides: Partial<ReportQuickReadInput> = {}): ReportQuickReadInput {
  const base: ReportQuickReadInput = {
    spending: {
      total: 100_000,
      categories: [
        { categoryId: 'food', value: 60_000 },
        { categoryId: 'transport', value: 40_000 },
      ],
    },
    comparison: {
      spending: { current: 100_000, previous: 80_000, difference: 20_000, percentChange: 25 },
      netCashFlow: { current: 30_000, previous: 20_000, difference: 10_000, percentChange: 50 },
      netWorth: { current: 1_050_000, previous: 1_000_000, difference: 50_000, percentChange: 5, status: 'comparable' },
    },
  };
  return {
    ...base,
    ...overrides,
    spending: { ...base.spending, ...overrides.spending },
    comparison: {
      ...base.comparison,
      ...overrides.comparison,
      spending: { ...base.comparison.spending, ...overrides.comparison?.spending },
      netCashFlow: { ...base.comparison.netCashFlow, ...overrides.comparison?.netCashFlow },
      netWorth: { ...base.comparison.netWorth, ...overrides.comparison?.netWorth },
    },
  };
}

test('20.8.3 same canonical snapshot produces exactly the same ranked quick read', () => {
  const input = baseInput();
  const first = selectReportQuickRead(input);
  const second = selectReportQuickRead(structuredClone(input));

  assert.deepEqual(first, second);
  assert.deepEqual(first.map(row => row.kind), [
    'cash_flow_change',
    'spending_above_previous',
    'net_worth_change',
  ]);
  assert.equal(first.length, QUICK_READ_THRESHOLDS.maxInsights);
});

test('20.8.3 uses explicit thresholds and stable priority instead of probabilistic ranking', () => {
  assert.deepEqual(QUICK_READ_THRESHOLDS, {
    spendingNearPercent: 5,
    cashFlowSignificantPercent: 15,
    netWorthSignificantPercent: 5,
    leadingCategorySharePercent: 35,
    maxInsights: 3,
  });

  const result = selectReportQuickRead(baseInput({
    comparison: {
      spending: { current: 104_000, previous: 100_000, difference: 4_000, percentChange: 4 },
      netCashFlow: { current: 109_000, previous: 100_000, difference: 9_000, percentChange: 9 },
      netWorth: { current: 1_040_000, previous: 1_000_000, difference: 40_000, percentChange: 4, status: 'comparable' },
    },
    spending: {
      total: 104_000,
      categories: [
        { categoryId: 'food', value: 36_400 },
        { categoryId: 'other', value: 67_600 },
      ],
    },
  }));

  assert.deepEqual(result.map(row => row.kind), ['leading_category', 'spending_near_previous']);
  assert.equal(result[0]?.priority, 60);
  assert.equal(result[1]?.priority, 40);
});

test('20.8.3 copy is parameterized data and never invents a cause', () => {
  const result = selectReportQuickRead(baseInput());
  const spending = result.find(row => row.kind === 'spending_above_previous');
  assert.ok(spending);
  assert.deepEqual(spending.copy, {
    key: 'spending_above_previous',
    params: {
      current: 100_000,
      previous: 80_000,
      absoluteDelta: 20_000,
      percentageDelta: 25,
    },
  });
  assert.equal(typeof spending.copy.key, 'string');
  assert.equal('reason' in spending.copy.params, false);
  assert.equal('cause' in spending.copy.params, false);
});

test('20.8.3 reports a useful category focus when one category concentrates enough spending', () => {
  const result = selectReportQuickRead(baseInput({
    comparison: {
      spending: { current: 100_000, previous: 0, difference: 100_000, percentChange: null },
      netCashFlow: { current: 10_000, previous: 10_000, difference: 0, percentChange: 0 },
      netWorth: { current: 1_000_000, previous: 1_000_000, difference: 0, percentChange: 0, status: 'comparable' },
    },
  }));

  const category = result.find(row => row.kind === 'leading_category');
  assert.deepEqual(category, {
    kind: 'leading_category',
    priority: 60,
    focus: 'categories',
    direction: 'none',
    copy: {
      key: 'leading_category',
      params: {
        categoryId: 'food',
        value: 60_000,
        sharePercent: 60,
        spendingTotal: 100_000,
      },
    },
  });
});

test('20.8.3 falls back to no-material-change when no explicit rule is relevant', () => {
  const result = selectReportQuickRead(baseInput({
    spending: {
      total: 100_000,
      categories: [
        { categoryId: 'a', value: 34_000 },
        { categoryId: 'b', value: 33_000 },
        { categoryId: 'c', value: 33_000 },
      ],
    },
    comparison: {
      spending: { current: 100_000, previous: 0, difference: 100_000, percentChange: null },
      netCashFlow: { current: 100_000, previous: 100_000, difference: 0, percentChange: 0 },
      netWorth: { current: 1_000_000, previous: 1_000_000, difference: 0, percentChange: 0, status: 'comparable' },
    },
  }));

  assert.equal(result.length, 1);
  assert.equal(result[0]?.kind, 'no_material_change');
  assert.equal(result[0]?.focus, 'overview');
});

test('20.8.3 handles zero previous cash flow without manufacturing a percentage', () => {
  const result = selectReportQuickRead(baseInput({
    comparison: {
      spending: { current: 0, previous: 0, difference: 0, percentChange: null },
      netCashFlow: { current: -25_000, previous: 0, difference: -25_000, percentChange: null },
      netWorth: { current: 1_000_000, previous: 1_000_000, difference: 0, percentChange: 0, status: 'comparable' },
    },
    spending: { total: 0, categories: [] },
  }));

  assert.equal(result[0]?.kind, 'cash_flow_change');
  assert.equal(result[0]?.direction, 'new');
  assert.equal(result[0]?.copy.params.percentageDelta, null);
  assert.equal(result[0]?.copy.params.current, -25_000);
});


test('20.8.3 treats spending that starts from a real zero base as a new increase without inventing a percentage', () => {
  const result = selectReportQuickRead(baseInput({
    spending: {
      total: 30_000,
      categories: [
        { categoryId: 'a', value: 10_000 },
        { categoryId: 'b', value: 10_000 },
        { categoryId: 'c', value: 10_000 },
      ],
    },
    comparison: {
      spending: { current: 30_000, previous: 0, difference: 30_000, percentChange: null },
      netCashFlow: { current: 100_000, previous: 100_000, difference: 0, percentChange: 0 },
      netWorth: { current: 1_000_000, previous: 1_000_000, difference: 0, percentChange: 0, status: 'comparable' },
    },
  }));

  assert.equal(result[0]?.kind, 'spending_above_previous');
  assert.equal(result[0]?.direction, 'new');
  assert.equal(result[0]?.copy.params.percentageDelta, null);
  assert.equal(result.some(row => row.kind === 'no_material_change'), false);
});

test('20.8.3 applies the leading-category threshold before rounding the display share', () => {
  const result = selectReportQuickRead(baseInput({
    spending: {
      total: 40_000,
      categories: [
        { categoryId: 'almost', value: 13_999 },
        { categoryId: 'b', value: 13_500 },
        { categoryId: 'c', value: 12_501 },
      ],
    },
    comparison: {
      spending: { current: 40_000, previous: 40_000, difference: 0, percentChange: 0 },
      netCashFlow: { current: 100_000, previous: 100_000, difference: 0, percentChange: 0 },
      netWorth: { current: 1_000_000, previous: 1_000_000, difference: 0, percentChange: 0, status: 'comparable' },
    },
  }));

  assert.equal(Math.round((13_999 / 40_000) * 10_000) / 100, 35);
  assert.equal(result.some(row => row.kind === 'leading_category'), false);
  assert.equal(result[0]?.kind, 'spending_near_previous');
});

test('20.8.3 canonical Reports snapshot includes the deterministic quick read', () => {
  const input: ReportsSnapshotInput = {
    accounts: [
      { id: 'cash', name: 'Cash', type: 'cash', currency: 'DOP', openingBalance: 100_000, startDate: '2026-01-01' },
    ],
    debts: [],
    incomes: [
      { id: 'prev-income', type: 'extra', description: 'Prev', amount: 20_000, date: '2026-08-10', month: '2026-08', categoryId: 'salary', accountId: 'cash' },
      { id: 'current-income', type: 'extra', description: 'Current', amount: 40_000, date: '2026-09-10', month: '2026-09', categoryId: 'salary', accountId: 'cash' },
    ],
    expenses: [
      { id: 'prev-expense', nature: 'Variable', concept: 'Prev', amount: 10_000, date: '2026-08-20', month: '2026-08', categoryId: 'food', accountId: 'cash', paymentMethod: 'cash' },
      { id: 'current-expense', nature: 'Variable', concept: 'Current', amount: 30_000, date: '2026-09-20', month: '2026-09', categoryId: 'food', accountId: 'cash', paymentMethod: 'cash' },
    ],
    debtPayments: [],
    transfers: [],
  };

  const report = selectReportsSnapshot(input, { start: '2026-09-01', end: '2026-09-30' });
  assert.ok(report.quickRead.length >= 1);
  assert.deepEqual(report.quickRead, selectReportQuickRead({
    spending: report.spending,
    comparison: report.comparison,
  }));
});

test('20.8.3 engine stays local, deterministic and outside React/persistence', () => {
  const source = readFileSync(new URL('../src/domain/report-insights.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"][^'"]*(?:react|dexie|\/db)['"]/i);
  assert.doesNotMatch(source, /\b(?:useFinances|IndexedDB|localStorage|sessionStorage)\b/);
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|WebSocket|EventSource|navigator\./);
  assert.doesNotMatch(source, /new Date|Date\.now|Math\.random|crypto\.randomUUID/);
});

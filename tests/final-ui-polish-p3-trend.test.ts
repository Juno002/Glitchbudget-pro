import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { Expense } from '../src/domain/models';
import type { DateRange } from '../src/domain/periods';
import {
  previousComparableRange, resolveReportRange, selectReportsSnapshot, selectSpendingReport,
  selectSpendingTrend, SPENDING_TREND_MAX_WINDOWS, type ReportRangePreset,
} from '../src/domain/reports';

function expense(date: string, amount: number, extra: Partial<Expense> = {}): Expense {
  return {
    id: date + '-' + amount, date, amount, month: date.slice(0, 7),
    nature: 'Variable', concept: '', categoryId: 'vivienda', paymentMethod: 'cash', ...extra,
  };
}

const currentRange = resolveReportRange('30d', '2026-10-04');

test('P3 exposes exactly the authorized preset window maxima', () => {
  assert.deepEqual(SPENDING_TREND_MAX_WINDOWS, { '7d': 6, '30d': 6, '3m': 4, '6m': 4, '1y': 3, custom: 6 });
});

for (const preset of Object.keys(SPENDING_TREND_MAX_WINDOWS) as ReportRangePreset[]) {
  test('P3 ' + preset + ' keeps canonical comparable windows across month, leap-year and year boundaries', () => {
    for (const anchor of ['2024-03-31', '2026-10-04', '2027-01-01']) {
      const range = resolveReportRange(preset, anchor, preset === 'custom' ? { start: anchor, end: anchor } : undefined);
      const expected: DateRange[] = [{ ...range }];
      for (let index = 1; index < SPENDING_TREND_MAX_WINDOWS[preset]; index += 1) {
        expected.push(previousComparableRange(expected[index - 1]));
      }
      expected.reverse();
      const expenses = [expense(expected[0].start, 17), ...expected.map((window, index) => expense(window.end, 100 + index))];
      const trend = selectSpendingTrend(expenses, range, SPENDING_TREND_MAX_WINDOWS[preset]);

      assert.equal(trend.spendingHistoryStart, expected[0].start);
      assert.deepEqual(trend.windows.map(point => point.range), expected);
      assert.deepEqual(trend.windows.map(point => point.isCurrent), expected.map((_, index) => index === expected.length - 1));
      assert.ok(trend.windows.every(point => point.coverage === 'full'));
      for (const point of trend.windows) {
        assert.equal(point.total, selectSpendingReport(expenses, point.range).total, 'same canonical spending, including each boundary day once');
      }
    }
  });
}

test('P3 anchored multi-month presets do not become closed calendar months', () => {
  const cases: Array<[ReportRangePreset, DateRange]> = [
    ['3m', { start: '2026-07-05', end: '2026-10-04' }],
    ['6m', { start: '2026-04-05', end: '2026-10-04' }],
    ['1y', { start: '2025-10-05', end: '2026-10-04' }],
  ];
  for (const [preset, expected] of cases) {
    const range = resolveReportRange(preset, '2026-10-04');
    const trend = selectSpendingTrend([expense('2020-01-01', 1)], range, SPENDING_TREND_MAX_WINDOWS[preset]);
    assert.deepEqual(trend.windows.at(-1)?.range, expected);
    assert.deepEqual(trend.windows.at(-2)?.range, previousComparableRange(expected));
  }
});

test('P3 custom windows preserve their duration across February 29 and December 31', () => {
  const cases = [
    { start: '2024-02-28', end: '2024-03-01', previous: { start: '2024-02-25', end: '2024-02-27' } },
    { start: '2025-12-31', end: '2026-01-02', previous: { start: '2025-12-28', end: '2025-12-30' } },
  ];
  for (const { start, end, previous } of cases) {
    const range = resolveReportRange('custom', end, { start, end });
    const expenses = [expense(previous.start, 10), expense(previous.end, 20), expense(start, 30), expense(end, 40)];
    assert.deepEqual(selectSpendingTrend(expenses, range, 6).windows, [
      { range: previous, total: 30, coverage: 'full', isCurrent: false },
      { range, total: 70, coverage: 'full', isCurrent: true },
    ]);
  }
});

test('P3 has no fabricated zero history before the first expense, including empty and future-only data', () => {
  assert.deepEqual(selectSpendingTrend([], currentRange, 6), { spendingHistoryStart: null, windows: [] });
  assert.deepEqual(selectSpendingTrend([expense('2026-10-05', 500)], currentRange, 6), {
    spendingHistoryStart: '2026-10-05', windows: [],
  });
  assert.deepEqual(selectSpendingTrend([expense('2026-09-30', 500)], currentRange, 6), {
    spendingHistoryStart: '2026-09-30',
    windows: [{ range: currentRange, total: 500, coverage: 'partial', isCurrent: true }],
  });
});

test('P3 crossing history start is partial while a later complete empty window is real zero', () => {
  assert.deepEqual(selectSpendingTrend([expense('2026-09-04', 500)], currentRange, 6), {
    spendingHistoryStart: '2026-09-04',
    windows: [
      { range: { start: '2026-08-06', end: '2026-09-04' }, total: 500, coverage: 'partial', isCurrent: false },
      { range: currentRange, total: 0, coverage: 'full', isCurrent: true },
    ],
  });
});

test('P3 history exactly on a window start gives full coverage and preserves subsequent zero windows', () => {
  assert.deepEqual(selectSpendingTrend([expense('2026-08-06', 500)], currentRange, 6).windows, [
    { range: { start: '2026-08-06', end: '2026-09-04' }, total: 500, coverage: 'full', isCurrent: false },
    { range: currentRange, total: 0, coverage: 'full', isCurrent: true },
  ]);
  const older = selectSpendingTrend([expense('2020-01-01', 500)], currentRange, 6);
  assert.equal(older.spendingHistoryStart, '2020-01-01');
  assert.equal(older.windows.length, 6);
  assert.ok(older.windows.every(point => point.coverage === 'full' && point.total === 0));
});

test('P3 keeps historical unassigned spending even when all current accounts start later', () => {
  const expenses = [expense('2026-08-10', 700), expense('2026-10-04', 300, { accountId: 'new-cash' })];
  const trend = selectSpendingTrend(expenses, currentRange, 6);
  const report = selectReportsSnapshot({
    expenses, incomes: [], debts: [], debtPayments: [], transfers: [],
    accounts: [{ id: 'new-cash', name: 'Efectivo', type: 'cash', currency: 'DOP', openingBalance: 0, startDate: '2026-10-04' }],
  }, currentRange);
  assert.equal(trend.spendingHistoryStart, '2026-08-10');
  assert.equal(trend.windows[0].total, report.spending.previousTotal);
  assert.equal(trend.windows.at(-1)?.total, report.spending.total);
  assert.equal(trend.windows[0].coverage, 'partial');
});

test('P3 preserves existing purchase, credit and currency amount semantics without using amountBase or FX', () => {
  const expenses = [
    expense('2026-09-05', 12_345, { currency: 'USD', fxRate: 59, amountBase: 728_355 }),
    expense('2026-10-04', 7_655, { paymentMethod: 'credit', debtId: 'card' }),
  ];
  const trend = selectSpendingTrend(expenses, currentRange, 6);
  assert.equal(trend.windows.length, 1);
  assert.equal(trend.windows[0].total, 20_000);
  assert.equal(trend.windows[0].total, selectSpendingReport(expenses, currentRange).total);
});

test('P3 uses the same civil date prefix as the existing report selector', () => {
  const expenses = [expense('2026-09-05T15:30:00Z', 500)];
  const trend = selectSpendingTrend(expenses, currentRange, 6);
  assert.equal(trend.spendingHistoryStart, '2026-09-05');
  assert.equal(trend.windows[0].coverage, 'full');
  assert.equal(trend.windows[0].total, selectSpendingReport(expenses, currentRange).total);
  assert.throws(() => selectSpendingTrend([expense('2024-02-30', 1)], currentRange, 6), /Fecha inválida/);
});

test('P3 is deterministic, accepts frozen input and never changes the current range or expense rows', () => {
  const expenses = [expense('2026-10-04', 30), expense('2026-08-10', 10), expense('2026-09-15', 20)];
  const before = structuredClone(expenses);
  expenses.forEach(Object.freeze);
  Object.freeze(expenses);
  const range = Object.freeze({ ...currentRange });
  const first = selectSpendingTrend(expenses, range, 6);
  assert.deepEqual(selectSpendingTrend([...expenses].reverse(), range, 6), first);
  assert.deepEqual(expenses, before);
  assert.deepEqual(range, currentRange);
  first.windows.at(-1)!.range.start = '2000-01-01';
  assert.deepEqual(range, currentRange, 'output ranges never alias caller-owned ranges');
});

test('P3 reads each expense date exactly once even with many windows and assigns its amount at most once', () => {
  for (const maxWindows of [1, 6, 700]) {
    let dateReads = 0;
    let amountReads = 0;
    let rowReads = 0;
    const rows = Array.from({ length: 400 }, (_, index) => {
      const date = index === 0 ? '2020-01-01' : '2026-10-04';
      return Object.defineProperties(expense(date, 1), {
        date: { get: () => { dateReads += 1; return date; } },
        amount: { get: () => { amountReads += 1; return 1; } },
      });
    });
    const expenses = new Proxy(rows, {
      get(target, key, receiver) {
        if (typeof key === 'string' && /^\d+$/.test(key)) rowReads += 1;
        return Reflect.get(target, key, receiver);
      },
    });
    const trend = selectSpendingTrend(expenses, { start: '2026-10-04', end: '2026-10-04' }, maxWindows);
    assert.equal(dateReads, rows.length);
    assert.equal(rowReads, rows.length);
    assert.equal(amountReads, rows.length - 1);
    assert.equal(trend.windows.length, maxWindows);
    assert.equal(trend.windows.at(-1)?.total, rows.length - 1);
  }
});

test('P3 selector stays pure and rejects invalid window counts without rescanning canonical reports', () => {
  const source = readFileSync(new URL('../src/domain/reports.ts', import.meta.url), 'utf8');
  const selector = source.slice(source.indexOf('export function selectSpendingTrend'));
  assert.doesNotMatch(selector, /selectSpendingReport\(|\.filter\(|\.sort\(|Account|reportHistoryStart|fetch\(|Date\.now|new Date|Intl\.|locale|Dexie|IndexedDB/);
  for (const maxWindows of [0, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => selectSpendingTrend([], currentRange, maxWindows), /entero positivo/);
  }
});

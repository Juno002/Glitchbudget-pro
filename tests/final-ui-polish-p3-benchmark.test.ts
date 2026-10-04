import assert from 'node:assert/strict';
import test from 'node:test';

import { SPENDING_TREND_MAX_WINDOWS, type ReportRangePreset } from '../src/domain/reports';
import {
  benchmarkRange,
  makeReportsDataset,
  median,
  passesTrendGate,
  reportsBenchmarkConfig,
  verifyTrendAgainstReports,
} from '../scripts/benchmark-reports.mjs';

test('P3 Reports benchmark data is reproducible, canonical and independent of accounts', () => {
  const first = makeReportsDataset(1_000);
  const second = makeReportsDataset(1_000);
  assert.deepEqual(first, second);
  assert.equal(first.length, 1_000);
  assert.equal(new Set(first.map(row => row.id)).size, 1_000);
  assert.equal(first[0].date, '2023-01-01');
  assert.equal(first[1].date, '2026-10-04');
  assert.ok(first.every(row => row.date >= '2023-01-01' && row.date <= '2026-10-04'));
  assert.ok(first.every(row => row.accountId === undefined && row.amount === row.amountBase && row.fxRate === 1));
});

test('P3 benchmark oracle covers the exact six presets and comparable-window maxima', () => {
  const expenses = makeReportsDataset(1_000);
  assert.deepEqual(reportsBenchmarkConfig.sizes, [1_000, 10_000, 50_000]);
  assert.deepEqual(reportsBenchmarkConfig.presets, ['7d', '30d', '3m', '6m', '1y', 'custom']);
  assert.deepEqual(SPENDING_TREND_MAX_WINDOWS, { '7d': 6, '30d': 6, '3m': 4, '6m': 4, '1y': 3, custom: 6 });
  assert.equal(reportsBenchmarkConfig.samples, 7);
  assert.equal(reportsBenchmarkConfig.warmups, 1);
  for (const preset of reportsBenchmarkConfig.presets as readonly ReportRangePreset[]) {
    const range = benchmarkRange(preset);
    const maxWindows = SPENDING_TREND_MAX_WINDOWS[preset];
    const trend = verifyTrendAgainstReports(expenses, range, maxWindows);
    assert.equal(trend.windows.length, maxWindows);
    assert.equal(trend.spendingHistoryStart, '2023-01-01');
  }
  assert.deepEqual(benchmarkRange('custom'), { start: '2026-08-17', end: '2026-10-04' });
});

test('P3 benchmark uses an exact median and enforces the unchanged 2× gate only at 50k', () => {
  const samples = [7, 1, 6, 3, 2, 4, 5];
  assert.equal(median(samples), 4);
  assert.deepEqual(samples, [7, 1, 6, 3, 2, 4, 5]);
  assert.equal(passesTrendGate(50_000, 10, 20), true);
  assert.equal(passesTrendGate(50_000, 10, 20.001), false);
  assert.equal(passesTrendGate(1_000, 10, 21), true);
  assert.equal(passesTrendGate(10_000, 10, 21), true);
});

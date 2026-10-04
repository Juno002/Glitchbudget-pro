import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  previousComparableRange,
  resolveReportRange,
  selectSpendingReport,
  selectSpendingTrend,
  SPENDING_TREND_MAX_WINDOWS,
} from '../src/domain/reports.ts';

/** @type {readonly import('../src/domain/reports').ReportRangePreset[]} */
const presets = Object.freeze(['7d', '30d', '3m', '6m', '1y', 'custom']);

export const reportsBenchmarkConfig = Object.freeze({
  anchor: '2026-10-04',
  historyStart: '2023-01-01',
  customStart: '2026-08-17',
  sizes: Object.freeze([1_000, 10_000, 50_000]),
  presets,
  samples: 7,
  warmups: 1,
  dateStep: 37,
  trendRatioLimit: 2,
});

const dayMs = 86_400_000;

/** @param {number} size @returns {import('../src/domain/models').Expense[]} */
export function makeReportsDataset(size) {
  assert.ok(Number.isInteger(size) && size >= 2, 'El dataset necesita al menos dos gastos.');
  const start = Date.parse(reportsBenchmarkConfig.historyStart + 'T12:00:00.000Z');
  const end = Date.parse(reportsBenchmarkConfig.anchor + 'T12:00:00.000Z');
  const days = (end - start) / dayMs + 1;
  const dates = Array.from({ length: days }, (_, index) => new Date(end - index * dayMs).toISOString().slice(0, 10));
  const categories = ['vivienda', 'transporte', 'alimentacion'];
  /** @type {import('../src/domain/models').Expense['nature'][]} */
  const natures = ['Fijo', 'Variable', 'Ocasional'];
  return Array.from({ length: size }, (_, index) => {
    const date = index === 0 ? reportsBenchmarkConfig.historyStart : dates[((index - 1) * reportsBenchmarkConfig.dateStep) % days];
    const amount = 100 + (index % 10_000);
    return {
      id: 'reports-benchmark-expense-' + index,
      date,
      month: date.slice(0, 7),
      amount,
      amountBase: amount,
      currency: 'DOP',
      fxRate: 1,
      categoryId: categories[index % categories.length],
      nature: natures[index % natures.length],
      concept: 'Benchmark',
      paymentMethod: 'cash',
      // Intentionally no accountId: spending history is independent of accounts.
    };
  });
}

/** @param {number[]} values */
export function median(values) {
  assert.ok(values.length > 0 && values.every(Number.isFinite), 'Se necesitan muestras finitas.');
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** @param {number} expenses @param {number} singleWindowMedianMs @param {number} trendMedianMs */
export function passesTrendGate(expenses, singleWindowMedianMs, trendMedianMs) {
  return expenses !== 50_000 || trendMedianMs <= reportsBenchmarkConfig.trendRatioLimit * singleWindowMedianMs;
}

/** @param {import('../src/domain/reports').ReportRangePreset} preset */
export function benchmarkRange(preset) {
  return resolveReportRange(preset, reportsBenchmarkConfig.anchor, preset === 'custom' ? {
    start: reportsBenchmarkConfig.customStart,
    end: reportsBenchmarkConfig.anchor,
  } : undefined);
}

/**
 * Correctness oracle deliberately runs outside measured calls. Repeated report
 * scans are permitted here, never in the production trend selector.
 * @param {import('../src/domain/models').Expense[]} expenses
 * @param {import('../src/domain/periods').DateRange} range
 * @param {number} maxWindows
 */
export function verifyTrendAgainstReports(expenses, range, maxWindows) {
  const expectedRanges = [];
  let comparable = range;
  for (let index = 0; index < maxWindows; index += 1) {
    expectedRanges.push(comparable);
    comparable = previousComparableRange(comparable);
  }
  expectedRanges.reverse();
  const trend = selectSpendingTrend(expenses, range, maxWindows);
  assert.equal(trend.spendingHistoryStart, reportsBenchmarkConfig.historyStart, 'La historia parte del primer gasto canónico.');
  assert.deepEqual(trend.windows.map(window => window.range), expectedRanges, 'Todas las ventanas comparables tienen historia completa.');
  for (const [index, window] of trend.windows.entries()) {
    assert.equal(window.total, selectSpendingReport(expenses, window.range).total, 'Total exacto: ' + window.range.start + '–' + window.range.end);
    assert.equal(window.coverage, 'full');
    assert.equal(window.isCurrent, index === trend.windows.length - 1);
  }
  return trend;
}

/** @param {() => unknown} readSingleWindow @param {() => unknown} readTrend */
function measurePair(readSingleWindow, readTrend) {
  for (let index = 0; index < reportsBenchmarkConfig.warmups; index += 1) {
    readSingleWindow();
    readTrend();
  }
  const singleWindowSamples = [];
  const trendSamples = [];
  const sampleOrder = [];
  const measure = fn => {
    const start = performance.now();
    fn();
    return performance.now() - start;
  };
  for (let index = 0; index < reportsBenchmarkConfig.samples; index += 1) {
    const trendFirst = index % 2 === 1;
    sampleOrder.push(trendFirst ? ['trend', 'singleWindow'] : ['singleWindow', 'trend']);
    if (trendFirst) {
      trendSamples.push(measure(readTrend));
      singleWindowSamples.push(measure(readSingleWindow));
    } else {
      singleWindowSamples.push(measure(readSingleWindow));
      trendSamples.push(measure(readTrend));
    }
  }
  return {
    singleWindow: { medianMs: median(singleWindowSamples), samplesMs: singleWindowSamples },
    trend: { medianMs: median(trendSamples), samplesMs: trendSamples },
    sampleOrder,
  };
}

function main() {
  const output = value => process.stdout.write(JSON.stringify(value) + '\n');
  output({
    benchmark: 'reports-spending-trend',
    type: 'environment',
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    datasetTimeZone: 'UTC',
    config: reportsBenchmarkConfig,
    singleWindowSelector: 'selectSpendingReport',
    trendSelector: 'selectSpendingTrend',
  });
  let gatePassed = true;
  for (const expensesCount of reportsBenchmarkConfig.sizes) {
    const expenses = makeReportsDataset(expensesCount);
    for (const preset of reportsBenchmarkConfig.presets) {
      const range = benchmarkRange(preset);
      const maxWindows = SPENDING_TREND_MAX_WINDOWS[preset];
      const verified = verifyTrendAgainstReports(expenses, range, maxWindows);
      const measurements = measurePair(
        () => selectSpendingReport(expenses, range),
        () => selectSpendingTrend(expenses, range, maxWindows),
      );
      const passed = passesTrendGate(expensesCount, measurements.singleWindow.medianMs, measurements.trend.medianMs);
      gatePassed &&= passed;
      output({
        benchmark: 'reports-spending-trend',
        type: 'measurement',
        expenses: expensesCount,
        preset,
        range,
        maxWindows,
        windows: verified.windows.length,
        spendingHistoryStart: verified.spendingHistoryStart,
        oracle: 'passed',
        ...measurements,
        ratio: measurements.trend.medianMs / measurements.singleWindow.medianMs,
        gate: { required: expensesCount === 50_000, limit: reportsBenchmarkConfig.trendRatioLimit, passed },
      });
    }
  }
  output({ benchmark: 'reports-spending-trend', type: 'summary', measurements: reportsBenchmarkConfig.sizes.length * reportsBenchmarkConfig.presets.length, gatePassed });
  if (!gatePassed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

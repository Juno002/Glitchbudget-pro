import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveReportRange, type ReportRangePreset } from '../src/domain/reports';

const read = (file: string) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('P0 Reports delegates canonical financial reads through the existing facade', () => {
  const reports = read('src/components/dashboard/reports-tab.tsx');
  const facade = read('src/contexts/finance-context.tsx');
  assert.match(reports, /getReportSnapshot\(range,range\.end\)/);
  assert.match(facade, /const getReportSnapshot = useCallback\(\(range: DateRange, through = range.end\) => selectReportsSnapshot\(/);
  for (const file of ['src/components/dashboard/reports-tab.tsx', 'src/components/dashboard/charts/report-charts.tsx']) {
    const source = read(file);
    assert.doesNotMatch(source, /\.reduce\s*\(|(?:expenses|incomes|debtPayments|transfers)\.filter\s*\(/);
    assert.doesNotMatch(source, /@\/lib\/db|\bdb\.|Dexie|IndexedDB|selectSpendingReport|selectCashFlowReport|selectNetWorthReport/);
    assert.match(source, /usePrivateCurrency\(\)/);
  }
});

test('P0 protects editorial order and keeps all four exact tables outside disclosure', () => {
  const source = read('src/components/dashboard/reports-tab.tsx');
  const order = ['quick-read', 'spending', 'comparison', 'spending-breakdown', 'cash-flow', 'net-worth', 'detail'];
  const sections = [...source.matchAll(/data-report-section="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(sections, [...order, 'budget-followup']);
  assert.equal([...source.matchAll(/<Table>/g)].length, 4);
  assert.doesNotMatch(source, /Accordion|Collapsible|Ver tabla/);
  for (const binding of ['comparisonRows.map', 'report.spending.categories.map', 'report.spending.byNature.map', 'report.spending.largestTransactions.map']) {
    assert.ok(source.includes(binding), binding);
  }
});

test('P0 characterizes all anchored report ranges without changing their semantics', () => {
  const expected: Array<[ReportRangePreset, string]> = [
    ['7d', '2026-09-28'], ['30d', '2026-09-05'],
    ['3m', '2026-07-05'], ['6m', '2026-04-05'], ['1y', '2025-10-05'],
  ];
  for (const [preset, start] of expected) {
    assert.deepEqual(resolveReportRange(preset, '2026-10-04'), { start, end: '2026-10-04' });
  }
  const custom = { start: '2026-09-17', end: '2026-10-02' };
  assert.deepEqual(resolveReportRange('custom', '2026-10-04', custom), custom);
  assert.throws(() => resolveReportRange('custom', '2026-10-04', { start: '2026-10-04', end: '2026-10-05' }));
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { resolveReportRange, selectReportsSnapshot, type ReportsSnapshotInput } from '../src/domain/reports';

const read = (file: string) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

function heroSource() {
  const reports = read('src/components/dashboard/reports-tab.tsx');
  const start = reports.indexOf('data-report-hero="spending"');
  const end = reports.indexOf('data-report-section="comparison"', start);
  assert.ok(start >= 0 && end > start, 'P2 retains the spending hero before comparison');
  return { reports, hero: reports.slice(start, end) };
}

test('P2 spending hero presents the canonical snapshot without financial reconstruction or persistence', () => {
  const { reports, hero } = heroSource();
  const facade = read('src/contexts/finance-context.tsx');
  assert.match(reports, /getReportSnapshot\(range,range\.end\)/);
  assert.match(facade, /const getReportSnapshot = useCallback\(\(range: DateRange, through = range.end\) => selectReportsSnapshot\(/);
  for (const field of ['total', 'previousTotal', 'percentChange', 'transactionCount']) {
    assert.ok(hero.includes('report.spending.' + field), field);
  }
  assert.match(hero, /currentLabel/);
  assert.match(hero, /previousLabel/);
  assert.doesNotMatch(reports, /\.reduce\s*\(|(?:expenses|incomes|debtPayments|transfers)\.filter\s*\(/);
  assert.doesNotMatch(reports, /@\/lib\/db|\bdb\.|Dexie|IndexedDB|selectSpendingReport|selectCashFlowReport|selectNetWorthReport/);
  assert.doesNotMatch(hero, /amountBase|fxRate|openingBalance|JSON\.stringify|backup|migration|schema/i);
});

test('P2 retains a completed hero with only the canonical chart authorized by P3 and no semantic direction colors', () => {
  const { hero } = heroSource();
  const withoutAuthorizedTrend = hero.replace(/<ReportSpendingTrend\s+data=\{[^}]+\}\s*\/>/g, '');
  assert.doesNotMatch(withoutAuthorizedTrend, /<Report\w*Chart|<Report\w*Bars|<Report\w*Donut|ResponsiveContainer|recharts|sparkline|placeholder|spendingHistoryStart|reportHistoryStart|historyWindows|spendingTrend/i);
  assert.doesNotMatch(hero, /text-(?:bad|good|success|destructive)|brand-(?:mint|coral)|--(?:positive|negative)|(?:mint|coral)/);
});

test('P2 money remains private and a zero previous total has only the authorized presentation fallback', () => {
  const { reports, hero } = heroSource();
  assert.match(reports, /const money\s*=\s*usePrivateCurrency\(\)/);
  assert.match(hero, /money\(report\.spending\.total\)/);
  assert.match(hero, /money\(report\.spending\.previousTotal\)/);
  assert.doesNotMatch(hero, /formatCurrency|Intl\.NumberFormat|\.toLocaleString\(/);
  assert.doesNotMatch(hero, /[•●]/, 'P2 takes the shared privacy mask from usePrivateCurrency instead of inventing one');
  assert.doesNotMatch(hero, /(?:aria-label|aria-description|title)=\{[^}]*report\.spending/);
  assert.match(hero, /report\.spending\.previousTotal\s*===\s*0\s*\?\s*['"]Sin gasto anterior con el que comparar['"]/);
  assert.doesNotMatch(hero, /Sin referencia anterior|Sin gasto anterior con el que comparar[^'"<]*frente al rango comparable/);
});

type SpendingFixture = {
  name: string;
  current: number[];
  previous: number[];
  expected: { total: number; previousTotal: number; percentChange: number | null; transactionCount: number; difference: number };
};

// Golden values from the existing selectors before the P2 presentation change.
const fixtures: SpendingFixture[] = [
  { name: 'new spending from a zero previous total', current: [10_000, 20_000], previous: [], expected: { total: 30_000, previousTotal: 0, percentChange: null, transactionCount: 2, difference: 30_000 } },
  { name: 'increased spending', current: [20_000, 10_000], previous: [20_000], expected: { total: 30_000, previousTotal: 20_000, percentChange: 50, transactionCount: 2, difference: 10_000 } },
  { name: 'decreased spending', current: [5_000, 5_000], previous: [20_000], expected: { total: 10_000, previousTotal: 20_000, percentChange: -50, transactionCount: 2, difference: -10_000 } },
  { name: 'equal spending', current: [7_500, 12_500], previous: [20_000], expected: { total: 20_000, previousTotal: 20_000, percentChange: 0, transactionCount: 2, difference: 0 } },
  { name: 'no current spending with a nonzero previous total', current: [], previous: [20_000], expected: { total: 0, previousTotal: 20_000, percentChange: -100, transactionCount: 0, difference: -20_000 } },
  { name: 'both windows empty retain canonical zero percent', current: [], previous: [], expected: { total: 0, previousTotal: 0, percentChange: 0, transactionCount: 0, difference: 0 } },
];

function snapshotInput(fixture: SpendingFixture): ReportsSnapshotInput {
  const expenses = (values: number[], date: string, period: string): ReportsSnapshotInput['expenses'] => values.map((amount, index) => ({
    id: period + '-' + index, accountId: 'cash', nature: 'Variable', concept: '',
    amount, date, month: date.slice(0, 7), categoryId: 'vivienda', paymentMethod: 'cash',
  }));
  return {
    accounts: [{ id: 'cash', name: 'Efectivo', type: 'cash', currency: 'DOP', openingBalance: 100_000, startDate: '2026-08-01' }],
    debts: [], incomes: [], debtPayments: [], transfers: [],
    expenses: [...expenses(fixture.current, '2026-10-04', 'current'), ...expenses(fixture.previous, '2026-09-01', 'previous')],
  };
}

for (const fixture of fixtures) {
  test('P2 preserves canonical spending values: ' + fixture.name, () => {
    const input = snapshotInput(fixture);
    const before = structuredClone(input);
    const range = resolveReportRange('30d', '2026-10-04');
    const report = selectReportsSnapshot(input, range, range.end);
    const { total, previousTotal, percentChange, transactionCount, difference } = report.spending;

    assert.deepEqual(range, { start: '2026-09-05', end: '2026-10-04' });
    assert.deepEqual(report.previousRange, { start: '2026-08-06', end: '2026-09-04' });
    assert.deepEqual({ total, previousTotal, percentChange, transactionCount, difference }, fixture.expected);
    assert.deepEqual(report.comparison.spending, {
      current: fixture.expected.total, previous: fixture.expected.previousTotal,
      difference: fixture.expected.difference, percentChange: fixture.expected.percentChange,
    });
    assert.deepEqual(input, before, 'P2 characterization never mutates canonical rows');
  });
}

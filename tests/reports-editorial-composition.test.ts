import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { projectReportBarGeometry } from '../src/lib/report-visualization';
import { presentReportInsight } from '../src/lib/report-editorial';
import { selectReportsSnapshot, type ReportsSnapshotInput } from '../src/domain/reports';

const read = (file: string) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const reports = read('src/components/dashboard/reports-tab.tsx');
const charts = read('src/components/dashboard/charts/report-charts.tsx');
const ranges = read('src/components/dashboard/report-range-controls.tsx');

test('editorial opening gives period and consultation controls context before the single spending hero', () => {
  const headerStart = reports.indexOf('data-report-editorial-header');
  const heroStart = reports.indexOf('data-report-hero="spending"');
  const opening = reports.slice(headerStart, heroStart);
  assert.ok(headerStart > 0 && heroStart > headerStart);
  assert.match(opening, /data-report-period/);
  assert.match(opening, /currentLabel/);
  assert.match(opening, /<ReportRangeControls/);
  assert.doesNotMatch(ranges, /<Card|<SectionHeader/);
  assert.match(ranges, /role="group" aria-label="Rango de Reportes"/);
  assert.match(ranges, /aria-pressed=\{preset===option.value\}/);
  assert.match(ranges, /preset==='custom' &&/);
  assert.equal([...reports.matchAll(/data-report-hero="spending"/g)].length, 1);
  const hero = reports.slice(heroStart, reports.indexOf('data-report-section="quick-read"'));
  for (const field of ['total', 'previousTotal', 'percentChange', 'transactionCount']) assert.ok(hero.includes('report.spending.' + field));
  assert.match(hero, /<ReportSpendingTrend data=\{spendingTrend.windows\}/);
  assert.doesNotMatch(hero, /<Card|<MetricCard/);
});

test('canonical quick read follows spending and keeps one primary without dropping secondary insights', () => {
  const order = [...reports.matchAll(/data-report-section="([^"]+)"/g)].map(row => row[1]);
  assert.deepEqual(order.slice(0, 5), ['spending', 'quick-read', 'spending-breakdown', 'comparison', 'analysis-access']);
  assert.match(reports, /report.quickRead.map\(presentReportInsight\)/);
  assert.match(reports, /editorialQuickRead.map\(/);
  assert.doesNotMatch(reports, /editorialQuickRead\.(?:slice|filter|sort)/);
  assert.match(reports, /data-quick-read-primary=\{index===0\?'true':undefined\}/);
  assert.match(reports, /data-quick-read-kind=\{insight.kind\}/);
});

test('category projection and all comparison amounts remain canonical and readable without tooltips', () => {
  assert.match(reports, /projectReportCategoryDistribution\(/);
  assert.match(reports, /report.spending.categories.map/);
  assert.match(charts, /data-category-legend/);
  assert.match(charts, /row.percentTenths/);
  assert.match(reports, /difference:row.data.difference/);
  assert.match(reports, /percentChange:row.data.percentChange/);
  const comparison = charts.slice(charts.indexOf('export function ReportComparisonBars'), charts.indexOf('export type ReportEquationRow'));
  for (const field of ['difference', 'percentChange', 'previous', 'current']) assert.ok(comparison.includes(field));
  assert.match(comparison, /data-comparison-money/);
  assert.doesNotMatch(comparison, /<Tooltip|<Legend|<YAxis|CartesianGrid/);
});

test('financial equations receive results and terms directly, including real positive card assets', () => {
  for (const field of ['income', 'cashExpenses', 'debtPayments', 'netCashFlow']) assert.ok(reports.includes('report.cashFlow.' + field));
  for (const field of ['cash', 'banks', 'investments', 'liabilities', 'cardPositiveBalance', 'netWorth']) assert.ok(reports.includes('report.netWorth.' + field));
  assert.match(reports, /label="Flujo neto" amount=\{report.cashFlow.netCashFlow\}/);
  assert.match(reports, /label="Patrimonio neto" amount=\{report.netWorth.netWorth\}/);
  assert.match(reports, /Saldo a favor en tarjetas',value:report.netWorth.cardPositiveBalance/);
  assert.match(reports, /el crédito disponible nunca se trata como activo/);
  assert.match(charts, /data-report-equation-result=\{label\}/);
  assert.match(charts, /money\(amount\)/);
  assert.doesNotMatch(reports, /<MetricCard/);
});

test('one initially closed audit keeps four exact tables and reusable mobile movements with all metadata', () => {
  assert.match(reports, /\[showDetailedAnalysis,setShowDetailedAnalysis\]=useState\(false\)/);
  assert.match(reports, /aria-expanded=\{showDetailedAnalysis\}/);
  assert.match(reports, /aria-controls="report-detailed-analysis"/);
  assert.match(reports, /hidden=\{!showDetailedAnalysis\}/);
  assert.equal([...reports.matchAll(/<Table>/g)].length, 4);
  assert.match(reports, /data-report-featured-list/);
  assert.match(reports, /<TransactionRow/);
  for (const field of ['title', 'date', 'nature', 'categoryId', 'amount']) assert.ok(reports.includes('row.' + field));
  assert.match(reports, /getBudgetStatusDetails\(currentMonth\)/);
  assert.match(reports, /row.status==='over'/);
  assert.match(reports, /setPlanningTab\('budgets'\)/);
});

test('presentation components introduce no financial aggregation, arithmetic on snapshot fields, or demo amounts', () => {
  for (const source of [reports, charts, ranges]) {
    assert.doesNotMatch(source, /\.reduce\s*\(|(?:expenses|incomes|debtPayments|transfers)\.filter\s*\(/);
    assert.doesNotMatch(source, /@\/lib\/db|Dexie|IndexedDB|selectSpendingReport|selectCashFlowReport|selectNetWorthReport/);
    assert.doesNotMatch(source, /Alex Rivera|Internet hogar|Netflix|11,520|30,000|6\.8%/);
    const ast = ts.createSourceFile('report.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const arithmetic = new Set([ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken, ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.SlashToken]);
    const visit = (node: ts.Node) => {
      if (ts.isBinaryExpression(node) && arithmetic.has(node.operatorToken.kind)) {
        for (const operand of [node.left, node.right]) {
          if (ts.isPropertyAccessExpression(operand)) assert.doesNotMatch(operand.getText(ast), /^report\.(?:spending|cashFlow|netWorth|comparison)\./, 'snapshot terms must not be recomputed');
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  for (const source of [reports, charts]) assert.match(source, /usePrivateCurrency\(\)/);
  assert.match(charts, /!balancesHidden/);
  assert.match(charts, /isAnimationActive=\{false\}/);
});

test('signed visual geometry preserves a shared zero, both directions, zero values and immutable input', () => {
  assert.deepEqual(projectReportBarGeometry([]), { zeroPercent: 0, bars: [] });
  assert.deepEqual(projectReportBarGeometry([0, 0]), { zeroPercent: 0, bars: [{ leftPercent: 0, widthPercent: 0 }, { leftPercent: 0, widthPercent: 0 }] });
  const input = Object.freeze([-300, 100, 0]);
  const projected = projectReportBarGeometry(input);
  assert.equal(projected.zeroPercent, 75);
  assert.deepEqual(projected.bars, [{ leftPercent: 0, widthPercent: 75 }, { leftPercent: 75, widthPercent: 25 }, { leftPercent: 75, widthPercent: 0 }]);
  assert.deepEqual(input, [-300, 100, 0]);
  assert.deepEqual(projectReportBarGeometry([100, 400]), { zeroPercent: 0, bars: [{ leftPercent: 0, widthPercent: 25 }, { leftPercent: 0, widthPercent: 100 }] });
  assert.deepEqual(projectReportBarGeometry([-400, -100]), { zeroPercent: 100, bars: [{ leftPercent: 0, widthPercent: 100 }, { leftPercent: 75, widthPercent: 25 }] });
});

test('browser fixture is independently checked against the unchanged canonical financial snapshot', () => {
  const fixture = JSON.parse(read('tests/fixtures/reports-editorial-composition.json'));
  const { rows, expected } = fixture;
  const input: ReportsSnapshotInput = {
    accounts: rows.accounts, incomes: rows.incomes, expenses: rows.expenses, debts: rows.debts,
    debtPayments: rows.debt_payments, transfers: rows.account_transfers,
  };
  const before = structuredClone(input);
  const report = selectReportsSnapshot(input, fixture.range);
  assert.equal(report.spending.total, expected.spending);
  assert.equal(report.spending.previousTotal, expected.previousSpending);
  assert.deepEqual(report.cashFlow, expected.cashFlow);
  assert.deepEqual(report.quickRead.map(presentReportInsight).map(({ kind, title }) => ({ kind, title })), expected.quickRead);
  for (const field of Object.keys(expected.netWorth)) assert.equal(report.netWorth[field as keyof typeof report.netWorth], expected.netWorth[field]);
  for (const [index, key] of (['spending', 'income', 'netCashFlow', 'netWorth'] as const).entries()) {
    const { label: _label, ...values } = expected.comparison[index];
    for (const field of Object.keys(values)) assert.equal(report.comparison[key][field as keyof typeof report.comparison.spending], values[field]);
  }
  assert.deepEqual(input, before);
});

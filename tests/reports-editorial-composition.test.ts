import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const reports = read('src/components/dashboard/reports-tab.tsx');
const charts = read('src/components/dashboard/charts/report-charts.tsx');
const ranges = read('src/components/dashboard/report-range-controls.tsx');

test('Reports opening has one dominant spending hero and one subordinate warm quick-read surface', () => {
  assert.match(reports, /data-report-opening="editorial"/);
  assert.match(reports, /data-report-hero="spending"/);
  assert.match(reports, /bg-primary text-primary-foreground/);
  assert.match(reports, /<ReportSpendingTrend data=\{spendingTrend\.windows\} variant="hero"/);
  assert.match(reports, /Lectura rápida/);
  assert.match(reports, /brand-gold/);
  assert.match(reports, /data-quick-read-primary=\{index===0\?'true':undefined\}/);
});

test('range selection is contextual navigation instead of another content card', () => {
  assert.match(reports, /data-report-header="editorial"/);
  assert.match(reports, /description=\{<span>\{currentLabel\}<\/span>\}/);
  assert.match(ranges, /role="group"/);
  assert.match(ranges, /aria-label="Rango del reporte"/);
  assert.match(ranges, /rounded-full/);
  assert.doesNotMatch(ranges, /<Card|SectionHeader|shadow-\[var\(--shadow-card\)\]/);
});

test('primary report evidence varies surface roles instead of repeating cards', () => {
  assert.match(reports, /data-report-evidence="primary"/);
  assert.match(reports, /data-report-visual="categories"/);
  assert.match(reports, /data-report-visual="comparison"/);
  assert.match(reports, /xl:border-l/);
  assert.match(reports, /Dónde se fue el gasto/);
  assert.match(reports, /Actual vs\. anterior/);
});

test('chart language is compact and value-led rather than generic dashboard chrome', () => {
  assert.doesNotMatch(charts, /CartesianGrid|Legend|YAxis/);
  assert.match(charts, /CATEGORY_COLORS/);
  assert.match(charts, /brand-coral/);
  assert.match(charts, /brand-mint/);
  assert.match(charts, /brand-lavender/);
  assert.match(charts, /brand-gold/);
  assert.match(charts, /data-report-chart="comparison-bars"/);
  assert.match(charts, /data-report-chart="value-bars"/);
  assert.match(charts, /font-mono text-xs tabular-nums/);
});

test('cash flow and net worth read as compositions over canonical values', () => {
  assert.match(reports, /data-report-equation="cash-flow"/);
  assert.match(reports, /label="Ingresos" amount=\{report\.cashFlow\.income\}/);
  assert.match(reports, /label="Gastos en efectivo" amount=\{report\.cashFlow\.cashExpenses\}/);
  assert.match(reports, /label="Pagos de deuda" amount=\{report\.cashFlow\.debtPayments\}/);
  assert.match(reports, /label="Flujo neto" amount=\{report\.cashFlow\.netCashFlow\}/);
  assert.match(reports, /data-report-equation="net-worth"/);
  for (const binding of ['cash','banks','investments','liabilities','netWorth']) assert.ok(reports.includes('report.netWorth.' + binding), binding);
});

test('largest movements use the shared movement language while exact tables stay available elsewhere', () => {
  assert.match(reports, /data-report-largest-list="editorial"/);
  assert.match(reports, /<TransactionRow/);
  const start=reports.indexOf('data-report-section="detail"');
  const end=reports.indexOf('data-report-section="budget-followup"',start);
  const detail=reports.slice(start,end);
  assert.doesNotMatch(detail, /<Table>/);
  assert.equal([...reports.matchAll(/<Table>/g)].length,3);
});

test('editorial recomposition does not rebuild financial semantics or persistence', () => {
  assert.match(reports, /getReportSnapshot\(range,range\.end\)/);
  assert.match(reports, /getSpendingTrend\(range,SPENDING_TREND_MAX_WINDOWS\[preset\]\)/);
  assert.match(reports, /getBudgetStatusDetails\(currentMonth\)/);
  assert.doesNotMatch(reports, /\.reduce\s*\(|(?:expenses|incomes|debtPayments|transfers)\.filter\s*\(/);
  assert.doesNotMatch(reports + charts, /@\/lib\/db|Dexie|IndexedDB|db\./i);
  assert.doesNotMatch(charts, /useFinances|selectReportsSnapshot|selectPosition|selectCashFlowReport|selectSpendingReport/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('20.6 Reports preserves every canonical analytical section and range', () => {
  const reports = read('src/components/dashboard/reports-tab.tsx');
  const ranges = read('src/components/dashboard/report-range-controls.tsx');
  assert.match(reports, /data-reports-prisma="true"/);
  for (const section of ['spending','cash-flow','net-worth','comparison']) {
    assert.ok(reports.includes('data-report-section="' + section + '"'), section);
  }
  for (const label of ['Gastos','Flujo de caja','Patrimonio neto','Comparación','Distribución por categoría','Fijo / Variable / Ocasional','Movimientos de mayor importe']) {
    assert.ok(reports.includes(label), label);
  }
  for (const preset of ['7d','30d','3m','6m','1y','custom']) {
    assert.ok(ranges.includes("value:'" + preset + "'"), preset);
    assert.ok(ranges.includes('data-report-preset={option.value}'));
  }
});

test('20.6 Reports consumes the canonical report snapshot rather than rebuilding finance semantics', () => {
  const reports = read('src/components/dashboard/reports-tab.tsx');
  assert.match(reports, /getReportSnapshot\(range,range\.end\)/);
  assert.match(reports, /getBudgetStatusDetails\(currentMonth\)/);
  assert.doesNotMatch(reports, /\.reduce\(/);
  assert.doesNotMatch(reports, /expenses\.filter|incomes\.filter|debtPayments\.filter/);
  assert.doesNotMatch(reports, /selectPosition|selectCashFlowReport|selectSpendingReport|selectNetWorthReport/);
});

test('20.6 chart renderers receive derived values only and never access finance context or persistence', () => {
  const charts = read('src/components/dashboard/charts/report-charts.tsx');
  assert.match(charts, /ReportCategoryDonut/);
  assert.match(charts, /ReportValueBars/);
  assert.match(charts, /ReportComparisonBars/);
  assert.doesNotMatch(charts, /useFinances|finance-context/);
  assert.doesNotMatch(charts, /@\/lib\/db|Dexie|IndexedDB|db\./i);
  assert.doesNotMatch(charts, /selectReportsSnapshot|selectPosition|selectCashFlowReport|selectSpendingReport/);
});

test('20.6 Reports keeps visual charts paired with exact tables or financial equations', () => {
  const reports = read('src/components/dashboard/reports-tab.tsx');
  for (const visual of ['categories','nature','cash-flow','net-worth','comparison']) {
    assert.ok(reports.includes('data-report-visual="' + visual + '"'), visual);
  }
  assert.match(reports, /<Table>/);
  assert.match(reports, /<ReportFinancialEquation/);
  assert.match(reports, /ReportCategoryDonut/);
  assert.match(reports, /ReportComparisonBars/);
  assert.match(reports, /ReportValueBars/);
});

test('20.6 report UI introduces no Prisma demo finance data or direct database access', () => {
  const source = read('src/components/dashboard/reports-tab.tsx') + '\n' + read('src/components/dashboard/charts/report-charts.tsx');
  assert.doesNotMatch(source, /@\/lib\/db|Dexie|IndexedDB|db\./i);
  for (const demo of ['Alex','Internet hogar','Netflix','8.4%','12.6%','30,000']) assert.equal(source.includes(demo), false, demo);
});

test('20.6 preserves current-budget follow-up as secondary context without changing report range', () => {
  const reports = read('src/components/dashboard/reports-tab.tsx');
  assert.match(reports, /data-report-section="budget-followup"/);
  assert.match(reports, /getBudgetStatusDetails\(currentMonth\)/);
  assert.match(reports, /setPlanningTab\('budgets'\)/);
  assert.match(reports, /setActiveTab\('planning'\)/);
});

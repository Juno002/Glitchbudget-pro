import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const reports=read('src/components/dashboard/reports-tab.tsx');
const ranges=read('src/components/dashboard/report-range-controls.tsx');

test('20.8.6 Reports follows the canonical editorial hierarchy', () => {
  const order=[
    'data-report-section="spending"',
    'data-report-section="quick-read"',
    'data-report-section="spending-breakdown"',
    'data-report-section="comparison"',
    'data-report-section="analysis-access"',
    'data-report-section="comparison-detail"',
    'data-report-section="spending-detail"',
    'data-report-section="cash-flow"',
    'data-report-section="net-worth"',
    'data-report-section="detail"',
  ];
  let previous=-1;
  for(const marker of order){
    const current=reports.indexOf(marker);
    assert.ok(current>previous,marker);
    previous=current;
  }
});

test('20.8.6 surfaces the deterministic quick read before exact analytics', () => {
  assert.match(reports,/report\.quickRead\.map\(/);
  assert.match(reports,/data-quick-read-kind=\{insight\.kind\}/);
  assert.match(reports,/report\.quickRead\.map\(presentReportInsight\)/);
  assert.match(reports,/insight\.title/);
  assert.match(reports,/quickReadBody\(insight,money/);
  assert.ok(reports.indexOf('report.quickRead.map') < reports.indexOf('data-report-hero="spending"'));
  assert.doesNotMatch(reports,/Math\.random|Date\.now|fetch\(/);
});

test('20.8.6 establishes one analytical hero without rebuilding finance semantics', () => {
  const heroStart=reports.indexOf('data-report-hero="spending"');
  const heroEnd=reports.indexOf('data-report-section="comparison"',heroStart);
  const hero=reports.slice(heroStart,heroEnd);
  assert.match(hero,/report\.spending\.total/);
  assert.match(hero,/report\.spending\.previousTotal/);
  assert.match(hero,/report\.spending\.percentChange/);
  assert.match(hero,/report\.spending\.transactionCount/);
  assert.doesNotMatch(hero,/\.reduce\(|selectSpendingReport|selectCashFlowReport|selectNetWorthReport|selectPosition/);
});

test('20.8.6 preserves comparison, category, nature, cash-flow and net-worth visuals with exact data under progressive disclosure', () => {
  for(const visual of ['comparison','categories','nature','cash-flow','net-worth']){
    assert.ok(reports.includes('data-report-visual="'+visual+'"'),visual);
  }
  assert.match(reports,/ReportComparisonBars/);
  assert.match(reports,/ReportCategoryDonut/);
  assert.match(reports,/ReportValueBars/);
  assert.match(reports,/<Table>/);
  assert.match(reports,/<ReportFinancialEquation/);
});

test('20.8.6 keeps detailed transactions after Net Worth inside the audit block', () => {
  const netWorth=reports.indexOf('data-report-section="net-worth"');
  const detail=reports.indexOf('data-report-section="detail"');
  const largest=reports.indexOf('Movimientos de mayor importe');
  assert.ok(netWorth>=0 && detail>netWorth && largest>detail);
  assert.match(reports,/report\.spending\.largestTransactions\.map/);
  assert.match(reports,/<TableHead>Fecha<\/TableHead>/);
  assert.match(reports,/<TableHead>Movimiento<\/TableHead>/);
  assert.doesNotMatch(reports,/El resumen editorial no reemplaza los importes y filas exactas del rango\./);
});

test('20.8.6 preserves every report range and secondary budget follow-up', () => {
  for(const preset of ['7d','30d','3m','6m','1y','custom']){
    assert.ok(ranges.includes("value:'"+preset+"'"),preset);
  }
  assert.match(reports,/data-report-section="budget-followup"/);
  assert.match(reports,/getBudgetStatusDetails\(currentMonth\)/);
  assert.match(reports,/setPlanningTab\('budgets'\)/);
});

test('20.8.6 remains a UI composition change over the canonical report snapshot', () => {
  assert.match(reports,/getReportSnapshot\(range,range\.end\)/);
  assert.doesNotMatch(reports,/expenses\.filter|incomes\.filter|debtPayments\.filter/);
  assert.doesNotMatch(reports,/\.reduce\(/);
  assert.doesNotMatch(reports,/@\/lib\/db|Dexie|IndexedDB|db\./i);
});
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/components/dashboard/reports-tab.tsx', import.meta.url), 'utf8');

function section(name: string, next: string) {
  const start = source.indexOf('data-report-section="' + name + '"');
  const end = source.indexOf('data-report-section="' + next + '"', start + 1);
  assert.ok(start >= 0, 'missing section ' + name);
  assert.ok(end > start, 'missing following section ' + next);
  return source.slice(start, end);
}

test('Reports now prioritizes progressive reading before on-demand audit detail', () => {
  const order = [...source.matchAll(/data-report-section="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(order, [
    'spending',
    'top-expenses',
    'budget-followup',
    'accounts',
    'analysis-access',
    'comparison-detail',
    'spending-detail',
    'cash-flow',
    'net-worth',
    'detail',
  ]);
});

test('trend compares income and spending across the selected range and exact comparison stays on demand', () => {
  const hero = section('spending', 'top-expenses');
  assert.match(hero, /<ReportIncomeExpenseTrend data=\{incomeExpenseTrend\}/);
  assert.match(source, /selectIncomeExpenseTrend\(incomes\|\|\[\],expenses\|\|\[\],range,preset\)/);

  const detail = section('comparison-detail', 'spending-detail');
  assert.match(detail, /<Table>/);
  for (const label of ['Comparación exacta', 'Métrica', 'Cambio']) assert.ok(detail.includes(label), label);
  for (const binding of ['money(row.data.previous)','money(row.data.current)','money(row.data.difference)','row.data.percentChange']) {
    assert.ok(detail.includes(binding), binding);
  }
});

test('top expense ranking uses canonical categories while detailed nature remains available', () => {
  const ranking = section('top-expenses', 'budget-followup');
  assert.match(ranking, /topCategories/);
  assert.match(ranking, /money\(row\.value\)/);
  assert.match(ranking, /row\.sharePercent\.toFixed\(1\)/);
  assert.match(ranking, /Ver todo/);
  assert.doesNotMatch(ranking, /categoryCounts/);
  assert.doesNotMatch(ranking, /ReportCategoryDonut/);

  const detail = section('spending-detail', 'cash-flow');
  assert.match(detail, /Fijo \/ Variable \/ Ocasional/);
  assert.match(detail, /report\.spending\.byNature\.map\(row=>\(/);
});

test('deep analysis preserves every canonical cash-flow and net-worth binding', () => {
  const cashFlow = section('cash-flow', 'net-worth');
  for (const binding of [
    "label:'Ingresos',value:report.cashFlow.income",
    "label:'Gastos en efectivo',value:report.cashFlow.cashExpenses",
    "label:'Pagos de deuda',value:report.cashFlow.debtPayments",
    'label="Flujo neto" amount={report.cashFlow.netCashFlow}',
  ]) assert.ok(cashFlow.includes(binding), binding);

  const netWorth = section('net-worth', 'detail');
  for (const binding of [
    "label:'Efectivo',value:report.netWorth.cash",
    "label:'Bancos',value:report.netWorth.banks",
    "label:'Inversiones',value:report.netWorth.investments",
    "label:'Pasivos',value:report.netWorth.liabilities",
    'label="Patrimonio neto" amount={report.netWorth.netWorth}',
  ]) assert.ok(netWorth.includes(binding), binding);
  assert.match(netWorth, /el crédito disponible nunca se trata como activo/);
});

test('largest movements remain exact and available inside detailed analysis', () => {
  const detail = source.slice(source.indexOf('data-report-section="detail"'));
  assert.match(detail, /Movimientos de mayor importe/);
  assert.match(detail, /report\.spending\.largestTransactions\.map\(row=>\(/);
  assert.match(detail, /money\(row\.amount\)/);
  assert.match(detail, /<Table>/);
});

test('one accessible disclosure controls the audit block without rebuilding finance semantics', () => {
  assert.match(source, /const \[showDetailedAnalysis,setShowDetailedAnalysis\]=useState\(false\)/);
  assert.match(source, /aria-expanded=\{showDetailedAnalysis\}/);
  assert.match(source, /aria-controls="report-detailed-analysis"/);
  assert.match(source, /hidden=\{!showDetailedAnalysis\}/);
  assert.match(source, /Ver análisis detallado/);
  assert.match(source, /Ocultar análisis detallado/);
  assert.equal([...source.matchAll(/<Table>/g)].length, 3);
  assert.doesNotMatch(source, /\.reduce\s*\(|(?:expenses|incomes|debtPayments|transfers)\.filter\s*\(/);
  assert.doesNotMatch(source, /selectSpendingReport|selectCashFlowReport|selectNetWorthReport|@\/lib\/db|Dexie|IndexedDB/);
});

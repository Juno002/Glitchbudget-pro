import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/components/dashboard/reports-tab.tsx', import.meta.url), 'utf8');

function section(name: string, next: string) {
  const start = source.indexOf(`data-report-section="${name}"`);
  const end = source.indexOf(`data-report-section="${next}"`, start + 1);
  assert.ok(start >= 0, 'missing section ' + name);
  assert.ok(end > start, 'missing following section ' + next);
  return source.slice(start, end);
}

test('P5 keeps the protected Reports editorial order with budget follow-up last', () => {
  const order = [...source.matchAll(/data-report-section="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(order, [
    'quick-read',
    'spending',
    'comparison',
    'spending-breakdown',
    'cash-flow',
    'net-worth',
    'detail',
    'budget-followup',
  ]);
});

test('P5 keeps comparison visual first and exact evidence immediately after it', () => {
  const comparison = section('comparison', 'spending-breakdown');
  const chart = comparison.indexOf('<ReportComparisonBars');
  const table = comparison.indexOf('<Table>');
  assert.ok(chart >= 0 && table > chart);
  for (const label of ['Actual vs. anterior', 'Métrica', 'Cambio']) assert.ok(comparison.includes(label), label);
  for (const binding of [
    'money(row.data.previous)',
    'money(row.data.current)',
    'money(row.data.difference)',
    'row.data.percentChange',
  ]) assert.ok(comparison.includes(binding), binding);
  assert.doesNotMatch(comparison, /Accordion|Collapsible|Ver tabla/);
});

test('P5 keeps category evidence ahead of nature and preserves every exact category row', () => {
  const breakdown = section('spending-breakdown', 'cash-flow');
  const categories = breakdown.indexOf('data-report-visual="categories"');
  const nature = breakdown.indexOf('data-report-visual="nature"');
  assert.ok(categories >= 0 && nature > categories);
  assert.match(breakdown, /<ReportCategoryDonut data=\{categoryDistribution\.segments\} total=\{categoryDistribution\.total\}/);
  assert.match(breakdown, /report\.spending\.categories\.map\(row=>\(/);
  assert.match(breakdown, /money\(row\.value\)/);
  assert.match(breakdown, /shareLabel\(row\.value,report\.spending\.total\)/);
  assert.match(breakdown, /Fijo \/ Variable \/ Ocasional/);
  assert.match(breakdown, /report\.spending\.byNature\.map\(row=>\(/);
});

test('P5 preserves every canonical cash-flow and net-worth binding', () => {
  const cashFlow = section('cash-flow', 'net-worth');
  for (const binding of [
    'label="Ingresos" amount={report.cashFlow.income}',
    'label="Gastos en efectivo" amount={report.cashFlow.cashExpenses}',
    'label="Pagos de deuda" amount={report.cashFlow.debtPayments}',
    'label="Flujo neto" amount={report.cashFlow.netCashFlow}',
  ]) assert.ok(cashFlow.includes(binding), binding);

  const netWorth = section('net-worth', 'detail');
  for (const binding of [
    'label="Efectivo" amount={report.netWorth.cash}',
    'label="Bancos" amount={report.netWorth.banks}',
    'label="Inversiones" amount={report.netWorth.investments}',
    'label="Pasivos" amount={report.netWorth.liabilities}',
    'label="Patrimonio neto" amount={report.netWorth.netWorth}',
  ]) assert.ok(netWorth.includes(binding), binding);
  assert.match(netWorth, /el crédito disponible nunca se trata como activo/);
});

test('P5 keeps largest movements visible after net worth and before budget follow-up', () => {
  const detail = section('detail', 'budget-followup');
  assert.match(detail, /Movimientos de mayor importe/);
  assert.match(detail, /report\.spending\.largestTransactions\.map\(row=>\(/);
  assert.match(detail, /money\(row\.amount\)/);
  assert.match(detail, /<Table>/);
});

test('P5 closes Reports without hiding exact tables or rebuilding finance semantics in React', () => {
  assert.equal([...source.matchAll(/<Table>/g)].length, 4);
  assert.doesNotMatch(source, /Accordion|Collapsible|Ver tabla/);
  assert.doesNotMatch(source, /\.reduce\s*\(|(?:expenses|incomes|debtPayments|transfers)\.filter\s*\(/);
  assert.doesNotMatch(source, /selectSpendingReport|selectCashFlowReport|selectNetWorthReport|@\/lib\/db|Dexie|IndexedDB/);
});

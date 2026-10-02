import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('20.3 Summary keeps the canonical Home read model and five protected modules', () => {
  const source = read('src/components/dashboard/summary-tab.tsx');

  assert.match(source, /selectHomeReadModel/);
  assert.match(source, /getReportSnapshot/);
  assert.match(source, /getBudgetStatusDetails/);

  for (const id of ['position','budget','upcoming','goals','investments']) {
    assert.ok(source.includes('HomeSection id="' + id + '"'), id);
  }
  assert.equal((source.match(/HomeSection id="/g) || []).length, 5);

  assert.match(source, /Personalizar Resumen/);
  assert.match(source, /Sección inicial al abrir Resumen/);
});

test('20.3 Summary adopts Prisma hierarchy without importing demo finance data', () => {
  const source = read('src/components/dashboard/summary-tab.tsx');

  assert.match(source, /data-home-prisma="true"/);
  assert.match(source, /data-home-layout="module-grid"/);
  assert.match(source, /data-home-layout="position-metrics"/);
  assert.match(source, /Disponible líquido/);
  assert.match(source, /Patrimonio neto/);
  assert.match(source, /Deuda total/);
  assert.match(source, /Presupuesto disponible/);
  assert.match(source, /Próximos pagos/);
  assert.match(source, /Metas relevantes/);
  assert.match(source, /Inversiones/);

  for (const forbidden of ['Alex', '8.4%', '3.1%', '12.6%', '30,000', 'Internet hogar', 'Netflix']) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test('20.3 Summary preserves finance-context navigation and planned-payment actions', () => {
  const source = read('src/components/dashboard/summary-tab.tsx');

  assert.match(source, /navigate\(\{area:'movements',movementSection:'accounts'\}\)/);
  assert.match(source, /navigate\(\{area:'movements',movementSection:'investments'\}\)/);
  assert.match(source, /navigate\(\{area:'planning',planningTab:'budgets'\}\)/);
  assert.match(source, /navigate\(\{area:'planning',planningTab:'goals'\}\)/);
  assert.match(source, /navigate\(\{area:'planning',planningTab:'subscriptions'\}\)/);
  assert.match(source, /confirmPlannedOccurrenceItem/);
  assert.match(source, /skipPlannedOccurrenceItem/);
});

test('20.3 Summary introduces no persistence access or financial formulas in React', () => {
  const source = read('src/components/dashboard/summary-tab.tsx');

  assert.doesNotMatch(source, /@\/lib\/db|dexie|IndexedDB|db\./i);
  assert.doesNotMatch(source, /accountBalance|liabilities\(|selectPosition|selectNetWorthReport/);
  assert.doesNotMatch(source, /\.reduce\(/);
});

test('20.3 keeps analytical category charts out of Home and retains shared renderers', () => {
  const source = read('src/components/dashboard/summary-tab.tsx');

  assert.doesNotMatch(source, /recharts|PieChart|BarChart|expense-donut-chart|monthly-result-chart/);
  assert.match(source, /MoneyValue/);
  assert.match(source, /ProgressMetric/);
  assert.match(source, /PlannedPaymentRow/);
  assert.match(source, /StatusBadge/);
});

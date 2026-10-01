import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const summary = readFileSync('src/components/dashboard/summary-tab.tsx', 'utf8');
const reports = readFileSync('src/components/dashboard/reports-tab.tsx', 'utf8');

test('20.8.7 keeps stable KPI definitions behind touch and keyboard accessible disclosure', () => {
  assert.match(summary, /<Popover>/);
  assert.match(summary, /<PopoverTrigger asChild>/);
  assert.match(summary, /type="button"/);
  assert.match(summary, /aria-label=\{'Qué significa '\+label\}/);
  assert.match(summary, /<PopoverContent/);
});

test('20.8.7 keeps decision-changing financial consequences permanently visible', () => {
  assert.match(summary, /warning="No incluye crédito disponible\."/);
  assert.match(summary, /warning="Deuda real registrada\."/);
  assert.match(summary, /warning="No incluye rendimiento proyectado\."/);
  assert.match(reports, /una compra a crédito no sale de caja hasta que pagas la tarjeta/i);
  assert.match(reports, /el crédito disponible nunca se trata como activo/i);
});

test('20.8.7 preserves exact report detail instead of hiding it behind disclosure', () => {
  assert.match(reports, /data-report-section="detail"/);
  assert.match(reports, /Largest transactions/);
  assert.match(reports, /data-report-section="comparison"/);
  assert.match(reports, /<TableHead>Métrica<\/TableHead>/);
});

test('20.8.7 does not rely on hover-only disclosure for required meaning', () => {
  assert.doesNotMatch(summary, /group-hover:[^"']*(?:block|visible|opacity-100)/);
  assert.doesNotMatch(reports, /group-hover:[^"']*(?:block|visible|opacity-100)/);
  assert.doesNotMatch(summary, /onMouseEnter=/);
  assert.doesNotMatch(reports, /onMouseEnter=/);
});

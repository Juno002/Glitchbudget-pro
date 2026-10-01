import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const summary = readFileSync(new URL('../src/components/dashboard/summary-tab.tsx', import.meta.url), 'utf8');
const reports = readFileSync(new URL('../src/components/dashboard/reports-tab.tsx', import.meta.url), 'utf8');

const positionCard = summary.slice(
  summary.indexOf('function PositionCard('),
  summary.indexOf('function PanelHeading('),
);

test('20.8.7 keeps stable KPI definitions behind touch and keyboard accessible disclosure', () => {
  assert.match(positionCard, /<Popover>[\s\S]*?<PopoverTrigger asChild>[\s\S]*?<button\s+[\s\S]*?type="button"[\s\S]*?aria-label=\{'Qué significa '\+label\}[\s\S]*?>[\s\S]*?<\/button>[\s\S]*?<\/PopoverTrigger>[\s\S]*?<PopoverContent/);
});

test('20.8.7 keeps decision-changing financial consequences permanently visible', () => {
  const popoverEnd = positionCard.indexOf('</Popover>');
  const warningRender = positionCard.indexOf('{warning ? (');
  assert.ok(popoverEnd >= 0 && warningRender > popoverEnd, 'PositionCard warnings must render outside the definition popover');
  assert.match(summary, /warning="No incluye crédito disponible\."/);
  assert.match(summary, /warning="Deuda real registrada\."/);
  assert.match(summary, /warning="No incluye rendimiento proyectado\."/);
  assert.match(reports, /una compra a crédito no sale de caja hasta que pagas la tarjeta/i);
  assert.match(reports, /el crédito disponible nunca se trata como activo/i);
  assert.doesNotMatch(reports, /<PopoverContent[\s\S]*?(?:una compra a crédito no sale de caja hasta que pagas la tarjeta|el crédito disponible nunca se trata como activo)[\s\S]*?<\/PopoverContent>/i);
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

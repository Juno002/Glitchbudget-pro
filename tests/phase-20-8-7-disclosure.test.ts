import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const summary = readFileSync(new URL('../src/components/dashboard/summary-tab.tsx', import.meta.url), 'utf8');
const reports = readFileSync(new URL('../src/components/dashboard/reports-tab.tsx', import.meta.url), 'utf8');
const contextHelp = readFileSync(new URL('../src/components/finance-ui/context-help.tsx', import.meta.url), 'utf8');

const positionCard = summary.slice(
  summary.indexOf('function PositionCard('),
  summary.indexOf('function PanelHeading('),
);

test('20.8.7 keeps stable KPI definitions behind touch and keyboard accessible disclosure', () => {
  assert.ok(positionCard.includes("<ContextHelp label={'Qué significa '+label} contextLabel={label}>"));
  assert.match(contextHelp, /<PopoverTrigger asChild>/);
  assert.match(contextHelp, /type="button"/);
  assert.match(contextHelp, /aria-label=\{label\}/);
  assert.match(contextHelp, /showCloseButton/);
  assert.match(contextHelp, /data-context-help=\{displayLabel\}/);
});

test('20.8.7 keeps financial interpretation details accessible without permanent helper rows', () => {
  assert.doesNotMatch(positionCard, /warning\?:string|\{warning \? \(/);
  assert.match(summary, /No incluye crédito disponible\./);
  assert.match(summary, /No incluye rendimiento proyectado\./);
  assert.match(reports, /el crédito disponible nunca se trata como activo/i);
});

test('20.8.7 preserves exact report detail instead of hiding it behind disclosure', () => {
  assert.match(reports, /data-report-section="detail"/);
  assert.match(reports, /Movimientos de mayor importe/);
  assert.match(reports, /data-report-section="comparison"/);
  assert.match(reports, /<TableHead>Métrica<\/TableHead>/);
});

test('20.8.7 does not rely on hover-only disclosure for required meaning', () => {
  assert.doesNotMatch(summary, /group-hover:[^"']*(?:block|visible|opacity-100)/);
  assert.doesNotMatch(reports, /group-hover:[^"']*(?:block|visible|opacity-100)/);
  assert.doesNotMatch(summary, /onMouseEnter=/);
  assert.doesNotMatch(reports, /onMouseEnter=/);
});
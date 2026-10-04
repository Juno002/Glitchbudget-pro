import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/components/dashboard/summary-tab.tsx', import.meta.url), 'utf8');

function sliceBetween(start:string,end:string) {
  const from=source.indexOf(start);
  const to=source.indexOf(end,from+start.length);
  assert.ok(from>=0,'missing '+start);
  assert.ok(to>from,'missing '+end);
  return source.slice(from,to);
}

test('20.8.5 removes non-actionable Home prose while preserving period context and navigation', () => {
  assert.match(source,/Tu panorama financiero/); // Final UI Polish P6 supersedes the old neutral heading.
  assert.doesNotMatch(source,/Dinero líquido, activos registrados y deuda real\./);
  assert.doesNotMatch(source,/eyebrow="/);
  assert.match(source,/formatPeriodRange\(currentPeriod\)/);
  for (const action of ['Ver cuentas','Ver presupuestos','Ver Plan','Ver metas','Ver inversiones']) {
    assert.ok(source.includes(action),action);
  }
});

test('20.8.5 budget leads with remaining money and keeps exact decision inputs visible', () => {
  const budget=sliceBetween('budget:(', 'upcoming:(');
  assert.match(budget,/data-home-budget-summary="decision-first"/);
  assert.match(budget,/amount=\{home\.budget\.remaining\}/);
  assert.match(budget,/money\(home\.budget\.spent\)/);
  assert.match(budget,/money\(home\.budget\.limit\)/);
  assert.match(budget,/budgetStatus\.status/);
  assert.match(budget,/home\.budget\.overCount>0 \|\| home\.budget\.alertCount>0/);
  assert.doesNotMatch(budget,/<ProgressMetric/);
});

test('20.8.5 upcoming suppresses reassuring filler but keeps actionable counts and row actions', () => {
  const upcoming=sliceBetween('upcoming:(', 'goals:(');
  assert.doesNotMatch(upcoming,/Sin pagos vencidos|Nada adicional para hoy/);
  assert.match(upcoming,/home\.upcoming\.overdueCount>0 \|\| home\.upcoming\.todayCount>0/);
  assert.match(upcoming,/confirmPlannedOccurrenceItem/);
  assert.match(upcoming,/skipPlannedOccurrenceItem/);
});

test('20.8.5 goals keep progress and consequence while shortening repeated instruction copy', () => {
  const goals=sliceBetween('goals:(', 'investments:(');
  assert.match(goals,/<ProgressMetric/);
  assert.match(goals,/Fecha límite vencida/);
  assert.match(goals,/Aporta /);
  assert.doesNotMatch(goals,/Aporte mensual requerido:/);
});

test('20.8.5 investments prioritize items requiring action instead of repeating the position total', () => {
  const investments=sliceBetween('investments:(', '\n  };');
  assert.match(investments,/data-home-investments="action-first"/);
  assert.match(investments,/home\.investments\.maturedCount>0/);
  assert.match(investments,/Revisar vencimiento/);
  assert.match(investments,/home\.investments\.rows\.map/);
  assert.doesNotMatch(investments,/home\.investments\.totalRegistered/);
  assert.doesNotMatch(investments,/sin proyecciones futuras/);
});

test('20.8.5 contextual attention remains while Final UI Polish P6 owns the global summary', () => {
  assert.match(source,/selectHomeAttentionState/);
  assert.match(source,/data-home-status-pill/);
  assert.doesNotMatch(source,/elementos requieren atención/);
  assert.doesNotMatch(source,/pagos tienen datos inválidos y no se incluyen en saldos ni reportes/);
  assert.doesNotMatch(source,/Todo está en orden/);
});

test('20.8.5 does not introduce financial aggregation math in React', () => {
  assert.doesNotMatch(source,/\.reduce\(/);
  assert.doesNotMatch(source,/selectPosition\(|selectNetWorthReport\(|compareKpi\(/);
});

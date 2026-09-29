import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Phase 20.1 parity gate inventories every major product surface', () => {
  const gate = read('docs/roadmap/phase-20-1.md');
  for (const surface of [
    'Resumen','Movimientos','Compositor','Cuentas','Tarjetas/deuda','Inversiones',
    'Plan','Presupuestos','Metas','Planificados','Reportes','Categorías',
    'Automatización','Ajustes','Seguridad','Backup/restore','Persistent storage',
    'Logros','Help','Error/loading/empty'
  ]) {
    assert.ok(gate.includes(surface), `Falta superficie de paridad: ${surface}`);
  }
});

test('Phase 20.1 protects charts, sounds, motion and accessibility', () => {
  const gate = read('docs/roadmap/phase-20-1.md');
  for (const chart of ['expense-donut-chart.tsx','monthly-result-chart.tsx','percentage-spent-ring.tsx']) {
    assert.ok(gate.includes(chart), chart);
  }
  for (const sound of [
    'playExpense','playIncome','playBudgetExceeded','playGoalComplete','playCoinDrop','playAchievementUnlock'
  ]) {
    assert.ok(gate.includes(sound), sound);
  }
  assert.match(gate, /prefers-reduced-motion/);
  assert.match(gate, /MotionConfig/);
  assert.match(gate, /focus-visible/);
});

test('Phase 20.1 forbids importing Prisma financial/runtime layers', () => {
  const gate = read('docs/roadmap/phase-20-1.md');
  for (const forbidden of [
    'client/src/domain/**',
    'client/src/application/**',
    'client/src/persistence/**',
    'server/**',
    'initialTransactions',
    'chartBars',
    'budgetRows'
  ]) {
    assert.ok(gate.includes(forbidden), forbidden);
  }
  assert.match(gate, /GlitchBudget financial engine/);
  assert.match(gate, /dato financiero demo\/hardcoded/);
});

test('Phase 20.1 authorizes 20.2 only after explicit parity closure', () => {
  const gate = read('docs/roadmap/phase-20-1.md');
  assert.match(gate, /Gate 20\.1/);
  assert.match(gate, /completado \/ Gate 20\.1 aprobado/);
  assert.match(gate, /Siguiente etapa autorizada: \*\*20\.2/);
});

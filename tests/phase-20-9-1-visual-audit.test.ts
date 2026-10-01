import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const audit = readFileSync(new URL('../docs/roadmap/phase-20-9-1.md', import.meta.url), 'utf8');

test('20.9.1 visual audit covers every roadmap dimension', () => {
  for (const dimension of [
    'Radios',
    'Bordes',
    'Sombras',
    'fondos',
    'overlays',
    'Tipografía',
    'Iconografía',
    'Spacing',
    'densidad',
    'Hover / press',
    'Focus',
    'Disabled',
    'Scroll interno',
    'Responsive',
  ]) {
    assert.ok(audit.toLowerCase().includes(dimension.toLowerCase()), dimension);
  }
});

test('20.9.1 visual audit includes every protected visible surface family', () => {
  for (const surface of [
    'Shell / sidebar / header / bottom-nav / FAB',
    'Resumen',
    'Movimientos',
    'Compositor global',
    'Plan',
    'Reportes',
    'Cuentas / deuda / inversiones',
    'Logros',
    'Ajustes',
    'Backups',
    'App Lock / Auto-lock',
    'UI primitives',
    'finance-ui primitives',
  ]) {
    assert.ok(audit.includes(surface), surface);
  }
});

test('20.9.1 assigns priorities and an explicit owner to all later premium-polish stages', () => {
  for (const priority of ['P0', 'P1', 'P2']) assert.ok(audit.includes(priority));
  const ownerLines = audit.split('\n').filter(line => line.includes('Dueño:')).join('\n');
  for (let stage = 2; stage <= 9; stage += 1) {
    assert.ok(ownerLines.includes(`20.9.${stage}`), `missing explicit owner 20.9.${stage}`);
  }
});

test('20.9.1 removes theme-scope ambiguity without changing compatibility', () => {
  assert.ok(audit.includes('Prisma + Neón') && audit.includes('dos objetivos premium'));
  assert.ok(audit.includes('Minimalista legado') && audit.includes('compatibilidad'));
  assert.match(audit, /no tercer destino de paridad premium/i);
});

test('20.9.1 records confirmed focus and functional-icon inconsistencies', () => {
  assert.match(audit, /defecto confirmado:[\s\S]*BadgeCard/i);
  assert.match(audit, /remediación obligatoria de 20\.9\.8/i);
  assert.ok(audit.includes('➕ Agregar'));
  assert.ok(audit.includes('🔄 Restablecer'));
  assert.match(audit, /inconsistencia funcional confirmada frente al sistema Lucide/i);
});

test('20.9.1 remains an inventory gate rather than a component-fix iteration', () => {
  assert.match(audit, /20\.9\.1 no corrige componentes/i);
  assert.match(audit, /inconsistencias sistémicas se resuelven en primitives\/tokens antes de parchear consumidores/i);
  assert.match(audit, /20\.9\.1 no autoriza correcciones visuales/i);
});

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
  for (let stage = 2; stage <= 9; stage += 1) {
    assert.ok(audit.includes(`20.9.${stage}`), `missing owner 20.9.${stage}`);
  }
});

test('20.9.1 removes theme-scope ambiguity without changing compatibility', () => {
  assert.match(audit, /Prisma \+ Neón.*dos objetivos premium/s);
  assert.match(audit, /Minimalista legado[\\s\\S]*compatibilidad/);
  assert.match(audit, /no tercer destino de paridad premium/i);
});

test('20.9.1 remains an inventory gate rather than a component-fix iteration', () => {
  assert.match(audit, /20\.9\.1 no corrige componentes/i);
  assert.match(audit, /inconsistencias sistémicas se resuelven en primitives\/tokens antes de parchear consumidores/i);
  assert.match(audit, /20\.9\.1 no autoriza correcciones visuales/i);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PRIMARY_NAV_ITEMS } from '../src/components/layout/primary-navigation';
import { PLAN_SECTIONS } from '../src/components/layout/plan-navigation';

test('primary UX architecture exposes exactly four consistent destinations', () => {
  assert.deepEqual(
    PRIMARY_NAV_ITEMS.map(({ value, label }) => ({ value, label })),
    [
      { value:'summary', label:'Resumen' },
      { value:'movements', label:'Movimientos' },
      { value:'planning', label:'Plan' },
      { value:'reports', label:'Reportes' },
    ],
  );
  assert.equal(PRIMARY_NAV_ITEMS.length, 4);
});

test('Plan architecture exposes exactly budgets goals and planned', () => {
  assert.deepEqual(
    PLAN_SECTIONS.map(({ value, label }) => ({ value, label })),
    [
      { value:'budgets', label:'Presupuestos' },
      { value:'goals', label:'Metas' },
      { value:'subscriptions', label:'Planificados' },
    ],
  );
  assert.equal(PLAN_SECTIONS.length, 3);
  assert.equal(PLAN_SECTIONS.some(section => (section.value as string) === 'cards'), false);
});

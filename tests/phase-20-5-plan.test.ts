import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('20.5 Plan keeps exactly Presupuestos, Metas and Planificados as its secondary navigation', () => {
  const nav = read('src/components/layout/plan-navigation.ts');
  const plan = read('src/components/dashboard/planning-tab.tsx');
  assert.match(plan, /data-plan-prisma="true"/);
  assert.match(plan, /data-plan-navigation="prisma"/);
  for (const label of ['Presupuestos','Metas','Planificados']) assert.ok(nav.includes(label), label);
  assert.equal((nav.match(/label:/g) || []).length, 3);
});

test('20.5 budgets consume canonical status details and period selection instead of rebuilding remaining/status', () => {
  const plan = read('src/components/dashboard/planning-tab.tsx');
  const period = read('src/hooks/use-budget-period.ts');
  assert.match(plan, /getBudgetStatusDetails/);
  assert.match(plan, /selectBudgetCategoryGroups/);
  assert.match(plan, /updateAllBudgets/);
  assert.match(plan, /prepareBudgetPeriod/);
  assert.match(plan, /BudgetPeriodControls/);
  assert.match(period, /budgetPeriodContaining/);
  assert.match(period, /savedBudgetRanges/);
  assert.match(period, /previousBudgetPeriod/);
  assert.match(period, /nextBudgetPeriod/);
  assert.doesNotMatch(plan, /remaining\s*=\s*[^\n]*limit\s*-/);
  assert.doesNotMatch(plan, /status\s*=\s*remaining/);
});

test('20.5 goals render canonical goal read models and preserve contribution semantics', () => {
  const goals = read('src/components/dashboard/goals-manager.tsx');
  assert.match(goals, /data-plan-goals="prisma"/);
  assert.match(goals, /goalManagerReadModel/);
  assert.match(goals, /goalDraftFundingSchedule/);
  assert.match(goals, /goalWouldComplete/);
  assert.match(goals, /contributeToGoal/);
  assert.match(goals, /Aporte mensual requerido/);
  assert.match(goals, /El efectivo y los saldos bancarios no cambian/);
  assert.doesNotMatch(goals, /goal\.target\s*-\s*goal\.saved/);
});

test('20.5 Planificados use the canonical planned-payments read model and preserve lifecycle actions', () => {
  const planned = read('src/components/dashboard/subscriptions-manager.tsx');
  const upcoming = read('src/domain/upcoming.ts');
  assert.match(planned, /data-plan-planned-manager="prisma"/);
  assert.match(planned, /selectPlannedPaymentsManagerReadModel/);
  assert.match(planned, /confirmPlannedOccurrenceItem/);
  assert.match(planned, /skipPlannedOccurrenceItem/);
  assert.match(planned, /addRecurringRule/);
  assert.match(planned, /updateRecurringRule/);
  for (const label of ['Vencidos','Hoy','Mañana','Próximos 7 días','Después']) assert.ok(planned.includes(label), label);
  assert.match(planned, /status=\{occurrence\.status\}/);
  assert.match(upcoming, /row\.status === 'confirmed' \|\| row\.status === 'skipped'/);
});

test('20.5 planning surfaces introduce no direct Dexie/IndexedDB access or Prisma demo finance data', () => {
  const source = [
    'src/components/dashboard/planning-tab.tsx',
    'src/components/dashboard/goals-manager.tsx',
    'src/components/dashboard/subscriptions-manager.tsx',
    'src/components/dashboard/budget-period-controls.tsx',
    'src/components/dashboard/transfer-dialog.tsx',
  ].map(read).join('\n');
  assert.doesNotMatch(source, /@\/lib\/db|Dexie|IndexedDB|db\./i);
  for (const demo of ['Alex','Internet hogar','Netflix','8.4%','12.6%']) assert.equal(source.includes(demo), false, demo);
});

test('20.5 preserves explicit planned/real boundaries and shared occurrence status presentation', () => {
  const planned = read('src/components/dashboard/subscriptions-manager.tsx');
  const row = read('src/components/finance-ui/planned-payment-row.tsx');
  assert.match(planned, /Solo confirmar una ocurrencia crea un ingreso o gasto real/);
  assert.match(planned, /Pausar una regla detiene nuevas ocurrencias/);
  assert.match(row, /PlannedOccurrenceDisplayStatus/);
  assert.match(row, /StatusBadge/);
});

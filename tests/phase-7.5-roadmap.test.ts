import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('roadmap 7.5 stabilizes every required reusable UI pattern', () => {
  const index = read('src/components/finance-ui/index.ts');
  for (const name of [
    'PageHeader',
    'SectionHeader',
    'MetricCard',
    'MoneyValue',
    'DeltaValue',
    'ProgressMetric',
    'StatusBadge',
    'EmptyState',
    'DetailHeader',
    'ActionMenu',
    'FilterChip',
    'TransactionRow',
    'PlannedPaymentRow',
  ]) {
    assert.ok(index.includes(name), `Falta el patrón ${name}`);
  }
});

test('Movements prioritizes real activity before secondary account management', () => {
  const source = read('src/components/dashboard/movements-tab.tsx');
  const history = source.indexOf('<MovementsView />');
  const accounts = source.indexOf('<AccountsOverview />');
  assert.ok(history >= 0 && accounts >= 0);
  assert.ok(history < accounts, 'AccountsOverview vuelve a empujar el historial hacia abajo.');
});

test('Summary preserves status/action hierarchy while Phase 14 replaces the historical recent-movements block', () => {
  const source = read('src/components/dashboard/summary-tab.tsx');
  const preferences = read('src/lib/home-preferences.ts');
  for (const heading of ['Posición financiera','Presupuesto disponible','Próximos pagos','Metas relevantes','Inversiones']) {
    assert.ok(source.includes(heading), `Falta módulo Home: ${heading}`);
  }
  const defaultIds = ["'position'","'budget'","'upcoming'","'goals'","'investments'"];
  let last = -1;
  for (const id of defaultIds) {
    const index = preferences.indexOf(id);
    assert.ok(index > last, `Orden por defecto incorrecto o faltante: ${id}`);
    last = index;
  }
  assert.doesNotMatch(source, /Movimientos recientes/);
  assert.doesNotMatch(source, /PieChart|recharts/);
});

test('global movement composer offers expense income and transfer in one surface', () => {
  const modal = read('src/components/dashboard/TransactionModal.tsx');
  assert.match(modal, /type TransactionType = QuickAddTransactionType/);
  const templateTypes = read('src/lib/quick-add-templates.ts');
  assert.match(templateTypes, /'expense' \| 'income' \| 'transfer'/);
  assert.ok(modal.includes('Gasto'));
  assert.ok(modal.includes('Ingreso'));
  assert.ok(modal.includes('Transferencia'));
  assert.match(modal, /txType !== 'transfer' && \(/);
  assert.match(modal, /Cuenta de origen/);
  assert.match(modal, /Cuenta de destino/);
});

test('mobile header prioritizes brand period privacy and settings while gamification stays secondary', () => {
  const header = read('src/components/layout/header.tsx');
  assert.match(header, /GlitchBudget Pro/);
  assert.match(header, /BalanceVisibilityToggle/);
  assert.match(header, /SettingsDialog/);
  assert.match(header, /Período actual/);
  assert.match(header, /hidden md:block/);
  assert.doesNotMatch(header, /Nuevo movimiento/);
});

test('planned payments use the stable row and expose confirmed movement navigation', () => {
  const planned = read('src/components/dashboard/subscriptions-manager.tsx');
  assert.match(planned, /PlannedPaymentRow/);
  assert.match(planned, /viewMovement/);
  assert.match(planned, /requestMovementFocus\(occurrence\.transactionId/);
  assert.match(planned, /setActiveTab\('movements'\)/);

  const movements = read('src/components/dashboard/MovementsView.tsx');
  assert.match(movements, /movementFocusId/);
  assert.match(movements, /setModalOpen\(true\)/);
});

test('settings hierarchy includes roadmap sections without pretending future security exists', () => {
  const settings = read('src/components/layout/settings-dialog.tsx');
  for (const label of ['General','Finanzas','Categorías','Privacidad','Datos','Apariencia','Acerca de']) {
    assert.ok(settings.includes(label), label);
  }
  assert.match(settings, /Moneda base/);
  assert.match(settings, /Bloqueo de aplicación/);
  assert.match(settings, /Auto-lock/);
  assert.match(settings, /AppLockSettings/);
  assert.match(settings, /Se implementará en 17\.3 sobre App lock/);
  assert.match(settings, /Zona destructiva/);
});

test('roadmap structural prototypes cover the six required surfaces', () => {
  const wireframes = read('docs/ux/wireframes-phase-7.5.md');
  for (const title of ['Resumen','Quick Add','Movimientos','Plan','Account Detail','Settings']) {
    assert.ok(wireframes.includes(title), title);
  }
  assert.match(wireframes, /No copiar de Wallet/);
  assert.match(wireframes, /Registrar gasto cotidiano/);
  assert.match(wireframes, /Confirmar pago planificado/);
});

test('roadmap gate contains the exact ten requested deliverable sections', () => {
  const gate = read('docs/roadmap/phase-7.5-gate.md');
  for (let index = 1; index <= 10; index += 1) {
    assert.match(gate, new RegExp(`## ${index}\\.`));
  }
  assert.match(gate, /No pasar a Fase 8 antes de revisar este gate/);
});


test('roadmap 7.5 empty states and destructive confirmations explain the next consequence', () => {
  const reports = read('src/components/dashboard/reports-tab.tsx');
  assert.match(reports, /Aún no tienes presupuestos/);
  assert.match(reports, /Crea un presupuesto en Plan → Presupuestos/);
  assert.match(reports, /Crear presupuesto/);
  assert.match(reports, /setPlanningTab\('budgets'\)/);
  assert.doesNotMatch(reports, /No hay presupuestos configurados para este período/);

  const settings = read('src/components/layout/settings-dialog.tsx');
  assert.match(settings, /Borrar todos los datos eliminará movimientos, planes, cuentas, metas y copias locales del sitio/);
  assert.match(settings, /Esta acción no se puede deshacer/);
});

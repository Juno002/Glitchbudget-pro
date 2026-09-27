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

test('Summary follows the roadmap status/action hierarchy', () => {
  const source = read('src/components/dashboard/summary-tab.tsx');
  const headings = [
    'Posición financiera',
    'Presupuesto disponible',
    'Próximos pagos',
    'Metas relevantes',
    'Movimientos recientes',
  ];
  let last = -1;
  for (const heading of headings) {
    const index = source.indexOf(heading);
    assert.ok(index > last, `Orden incorrecto o faltante: ${heading}`);
    last = index;
  }
  assert.doesNotMatch(source, /PieChart|recharts/);
});

test('global movement composer offers expense income and transfer in one surface', () => {
  const modal = read('src/components/dashboard/TransactionModal.tsx');
  assert.match(modal, /type TransactionType = 'income' \| 'expense' \| 'transfer'/);
  assert.ok(modal.includes('Gasto'));
  assert.ok(modal.includes('Ingreso'));
  assert.ok(modal.includes('Transferencia'));
  assert.match(modal, /txType !== 'transfer' && <ToolbarItem/);
  assert.match(modal, /Cuenta de origen/);
  assert.match(modal, /Cuenta de destino/);
});

test('planned payments use the stable row and expose confirmed movement navigation', () => {
  const planned = read('src/components/dashboard/subscriptions-manager.tsx');
  assert.match(planned, /PlannedPaymentRow/);
  assert.match(planned, /viewMovement/);
  assert.match(planned, /setActiveTab\('movements'\)/);
});

test('settings hierarchy includes roadmap sections without pretending future security exists', () => {
  const settings = read('src/components/layout/settings-dialog.tsx');
  for (const label of ['General','Finanzas','Categorías','Privacidad','Datos','Apariencia','Acerca de']) {
    assert.ok(settings.includes(label), label);
  }
  assert.match(settings, /Moneda base/);
  assert.match(settings, /Bloqueo de aplicación/);
  assert.match(settings, /Auto-lock/);
  assert.match(settings, /Reservado para Fase 17/);
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

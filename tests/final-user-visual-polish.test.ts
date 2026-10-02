import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('final visual polish removes persistent tutorial copy from primary surfaces', () => {
  const sidebar = source('src/components/layout/desktop-sidebar.tsx');
  const movements = source('src/components/dashboard/movements-tab.tsx');
  const reports = source('src/components/dashboard/reports-tab.tsx');
  const plan = source('src/components/dashboard/planning-tab.tsx');

  for (const [content, forbidden] of [
    [sidebar, ['Local / privado', 'Solo en tu dispositivo', 'Sincronización financiera remota desactivada']],
    [movements, ['Actividad real, búsqueda y gestión de cuentas en un solo lugar.', 'Gestión secundaria', 'Se conserva aquí hasta su migración visual final en 20.7.']],
    [reports, ['Hero analítico', 'Ventana analítica', 'El resumen editorial no reemplaza los importes y filas exactas del rango.']],
    [plan, ['Presupuestos, metas y movimientos planificados', 'Define cuánto quieres gastar por categoría y sigue tu progreso.']],
  ] as const) {
    for (const phrase of forbidden) assert.ok(!content.includes(phrase), phrase);
  }
});

test('final visual polish keeps non-obvious financial meaning available on demand', () => {
  const summary = source('src/components/dashboard/summary-tab.tsx');
  const accounts = source('src/components/dashboard/accounts-overview.tsx');
  const settings = source('src/components/layout/settings-dialog.tsx');
  const help = source('src/components/finance-ui/context-help.tsx');

  assert.match(summary, /ContextHelp/);
  assert.match(summary, /No incluye crédito disponible\./);
  assert.match(summary, /No incluye rendimiento proyectado\./);
  assert.match(accounts, /ContextHelp label="Qué incluye el saldo neto"/);
  assert.match(settings, /ContextHelp label="Acerca de la moneda base"/);
  assert.match(help, /showCloseButton/);
  assert.match(help, /data-context-help=\{displayLabel\}/);
});

test('final visual polish keeps settings navigation in one scrollable row', () => {
  const settings = source('src/components/layout/settings-dialog.tsx');

  assert.match(settings, /flex-nowrap/);
  assert.match(settings, /overflow-x-auto/);
  assert.match(settings, /shrink-0/);
  assert.doesNotMatch(settings, /flex-wrap justify-start/);
});

test('final visual polish allows concise empty states without duplicating labels', () => {
  const primitive = source('src/components/finance-ui/empty-state.tsx');
  const movements = source('src/components/dashboard/MovementsView.tsx');
  const reports = source('src/components/dashboard/reports-tab.tsx');

  assert.match(primitive, /title\?: ReactNode/);
  assert.match(movements, /<EmptyState description="No hay movimientos registrados que coincidan con estos filtros\."/);
  assert.doesNotMatch(reports, /<EmptyState title="Sin gastos"/);
  assert.doesNotMatch(reports, /<EmptyState title="Sin transacciones"/);
});
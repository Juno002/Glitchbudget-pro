import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('secondary surfaces do not regress to permanently over-explained copy', () => {
  const accounts = read('src/components/dashboard/accounts-overview.tsx');
  const planning = read('src/components/dashboard/planning-tab.tsx');
  const goals = read('src/components/dashboard/goals-manager.tsx');
  const investments = read('src/components/dashboard/investments-manager.tsx');
  const debts = read('src/components/dashboard/debts-tab.tsx');
  const composer = read('src/components/dashboard/TransactionModal.tsx');
  const templates = read('src/components/dashboard/transaction-modal-automation.tsx');
  const transfer = read('src/components/dashboard/transfer-dialog.tsx');
  const categories = read('src/components/dashboard/category-maintenance.tsx');
  const movements = read('src/components/dashboard/MovementsView.tsx');

  const obsoletePairs: Array<[string, string]> = [
    [accounts, 'Registra tus bancos con su saldo actual. Efectivo se administra automáticamente con tus ingresos y gastos.'],
    [accounts, 'Después registra los movimientos históricos desde esa fecha; el saldo inicial no cuenta como ingreso.'],
    [planning, 'Asigna un límite a una categoría para el rango seleccionado.'],
    [planning, 'Un límite de 0 mantiene el presupuesto activo sin margen para gastar. Se aplica tu política de excesos.'],
    [goals, 'Define tu objetivo. Puedes empezar aunque todavía no tengas un aporte mensual planificado.'],
    [investments, 'Elige si ya existía al empezar a usar Prisma o si la financias ahora desde una cuenta registrada.'],
    [debts, 'Límites, saldo pendiente y pagos registrados.'],
    [composer, 'La transferencia mueve dinero entre tus cuentas y no crea ingreso ni gasto.'],
    [templates, 'Guarda estos valores para reutilizarlos. La fecha siempre se restablece al día en que uses la plantilla.'],
    [transfer, 'Esto no mueve dinero entre cuentas ni crea movimientos reales.'],
    [categories, 'El historial conserva esta categoría aunque cambies su nombre o la archives.'],
    [movements, 'Puedes editar la transferencia desde Cuentas, abriendo la cuenta de origen o destino.'],
  ];

  for (const [source, obsolete] of obsoletePairs) assert.equal(source.includes(obsolete), false);
});

test('editorial cleanup preserves consequential financial and destructive warnings', () => {
  const accounts = read('src/components/dashboard/accounts-overview.tsx');
  const goals = read('src/components/dashboard/goals-manager.tsx');
  const debts = read('src/components/dashboard/debts-tab.tsx');
  const composer = read('src/components/dashboard/TransactionModal.tsx');
  const categories = read('src/components/dashboard/category-maintenance.tsx');

  assert.match(accounts, /Con historial existente, la fecha solo puede moverse hacia atrás/);
  assert.match(accounts, /no cuenta como ingreso/);
  assert.match(goals, /Este aporte no mueve dinero entre cuentas/);
  assert.match(goals, /Se eliminarán la meta y sus reservas de planificación/);
  assert.match(debts, /Si conserva compras o pagos históricos vinculados, la operación puede ser rechazada/);
  assert.match(debts, /El pago se descuenta de la cuenta seleccionada/);
  assert.match(composer, /Solo puedes ampliar el historial desde/);
  assert.match(composer, /Eliminar este gasto actualizará tus totales/);
  assert.match(categories, /Renombrar o archivar no altera el historial/);
});

test('contextual explanations are hidden or compact where appropriate', () => {
  const accounts = read('src/components/dashboard/accounts-overview.tsx');
  const goals = read('src/components/dashboard/goals-manager.tsx');
  const investments = read('src/components/dashboard/investments-manager.tsx');

  assert.match(accounts, /DialogDescription className="sr-only">Administra bancos y transferencias/);
  assert.match(accounts, /DialogDescription className="sr-only">Administra tarjetas y pagos/);
  assert.match(goals, /DialogDescription className="sr-only">Configura objetivo, plazo y aporte planificado/);
  assert.match(investments, /DialogDescription className="sr-only">Registra una inversión existente o nueva/);
});

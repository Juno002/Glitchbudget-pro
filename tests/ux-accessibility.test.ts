import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('hide balances is a local UI preference and does not enter the financial database', () => {
  const visibility = read('src/contexts/balance-visibility-context.tsx');
  assert.match(visibility, /localStorage/);
  assert.match(visibility, /glitchbudget_balances_hidden_v1/);
  assert.doesNotMatch(visibility, /from ['"]@\/lib\/db['"]/);
  assert.doesNotMatch(visibility, /fetch\(/);

  const settings = read('src/components/layout/settings-dialog.tsx');
  assert.match(settings, /Ocultar importes/);
  assert.match(settings, /useBalanceVisibility/);

  const header = read('src/components/layout/header.tsx');
  assert.match(header, /BalanceVisibilityToggle/);
});

test('primary financial read surfaces use privacy-aware currency rendering', () => {
  const surfaces = [
    'src/components/dashboard/summary-tab.tsx',
    'src/components/dashboard/budget-status.tsx',
    'src/components/dashboard/MovementsView.tsx',
    'src/components/dashboard/accounts-overview.tsx',
    'src/components/dashboard/planning-tab.tsx',
    'src/components/dashboard/goals-manager.tsx',
    'src/components/dashboard/subscriptions-manager.tsx',
    'src/components/dashboard/debts-tab.tsx',
    'src/components/dashboard/reports-tab.tsx',
    'src/components/dashboard/charts/monthly-result-chart.tsx',
    'src/components/dashboard/charts/expense-donut-chart.tsx',
    'src/components/dashboard/transfer-dialog.tsx',
    'src/components/transactions/transaction-table.tsx',
  ];

  for (const path of surfaces) {
    assert.doesNotMatch(read(path), /formatCurrency\(/, `${path} bypasses the privacy-aware money renderer`);
  }

  const moneyValue = read('src/components/finance-ui/money-value.tsx');
  assert.match(moneyValue, /useBalanceVisibility/);
  assert.match(moneyValue, /Importe oculto/);
});

test('planned payments expose textual lifecycle states and recent resolved items', () => {
  const planned = read('src/components/dashboard/subscriptions-manager.tsx');
  assert.match(planned, /StatusBadge/);
  assert.match(planned, /status=\{group\.key === 'overdue' \? 'overdue' : 'pending'\}/);
  assert.match(planned, /Actividad planificada reciente/);
  assert.match(planned, /occurrence\.status/);
  assert.match(planned, /aria-live="polite"/);
});

test('keyboard and touch navigation have explicit access paths', () => {
  const shell = read('src/components/layout/app-shell.tsx');
  assert.match(shell, /Saltar al contenido/);
  assert.match(shell, /id="main-content"/);
  assert.match(shell, /focus-visible:ring-2/);

  const bottom = read('src/components/layout/bottom-nav.tsx');
  assert.match(bottom, /min-h-14/);
  assert.match(bottom, /focus-visible:ring-2/);
  assert.match(bottom, /aria-current/);
});

test('destructive settings remain separated from everyday preferences', () => {
  const settings = read('src/components/layout/settings-dialog.tsx');
  assert.match(settings, /Zona destructiva/);
  assert.match(settings, /Borrar todos los datos/);
  assert.match(settings, /AlertDialog/);
});

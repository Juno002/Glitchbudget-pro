import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('20.4 Movimientos keeps history, search, every canonical filter, saved filters and metadata', () => {
  const source = read('src/components/dashboard/MovementsView.tsx');
  assert.match(source, /data-movements-prisma="true"/);
  assert.match(source, /data-movement-history="list"/);
  for (const label of [
    'Buscar movimientos','Filtrar por tipo','Filtrar por cuenta','Filtrar por categoría',
    'Filtrar por necesidad','Desde','Hasta','Monto mínimo','Monto máximo','Filtrar por etiqueta',
    'Filtro guardado','Guardar filtro'
  ]) assert.ok(source.includes(label), label);
  assert.match(source, /NECESSITY_LABELS/);
  assert.match(source, /item\.labels/);
});

test('20.4 global composer remains the single Quick Add path for expense, income and transfer', () => {
  const source = read('src/components/dashboard/TransactionModal.tsx');
  assert.match(source, /data-global-composer="prisma"/);
  const steps = ['amount','type','account','category','save'].map(step => source.indexOf('data-quick-add-step="' + step + '"'));
  assert.ok(steps.every(index => index >= 0));
  assert.deepEqual([...steps].sort((a,b)=>a-b), steps);
  for (const call of ['addExpense','updateExpense','deleteExpense','addIncomeItem','updateIncomeItem','deleteIncomeItem','addAccountTransfer']) {
    assert.ok(source.includes(call), call);
  }
  assert.match(source, /loadQuickAddTemplates/);
  assert.match(source, /loadTransactionRules/);
  assert.match(source, /QuickAddTemplateSelector/);
  assert.match(source, /TransactionRuleSuggestions/);
});

test('20.4 composer and Movimientos do not introduce direct financial persistence or Prisma demo data', () => {
  const source = read('src/components/dashboard/TransactionModal.tsx') + '\n' + read('src/components/dashboard/MovementsView.tsx');
  assert.doesNotMatch(source, /@\/lib\/db|Dexie|IndexedDB|db\./i);
  for (const demo of ['Alex','Internet hogar','Netflix','8.4%','12.6%']) assert.equal(source.includes(demo), false, demo);
});

test('20.4 accounts and cards remain secondary surfaces backed by existing read models', () => {
  const accounts = read('src/components/dashboard/accounts-overview.tsx');
  const cards = read('src/components/dashboard/debts-tab.tsx');
  const movements = read('src/components/dashboard/movements-tab.tsx');
  assert.match(accounts, /data-accounts-prisma="true"/);
  assert.match(accounts, /selectAccountOverviewReadModel/);
  assert.match(cards, /data-cards-prisma="true"/);
  assert.match(cards, /selectCardReadModel/);
  assert.match(movements, /Gestión secundaria/);
  assert.doesNotMatch(movements, /setActiveTab\(['"]accounts|setActiveTab\(['"]cards/);
});

test('20.4 keeps templates, saved filters and Rules local rather than adding financial tables', () => {
  const automation = read('src/components/dashboard/transaction-modal-automation.tsx');
  const rules = read('src/components/settings/transaction-rule-manager.tsx');
  const db = read('src/lib/db.ts');
  assert.match(automation, /data-quick-add-templates="prisma"/);
  assert.match(automation, /data-rule-suggestions="prisma"/);
  assert.match(rules, /data-rules-prisma="true"/);
  assert.match(rules, /window\.localStorage/);
  assert.doesNotMatch(db, /quick_add_templates|saved_transaction_filters|transaction_rules/);
});

test('20.4 legacy transactions route shares Movements instead of maintaining a second history implementation', () => {
  const client = read('src/components/transactions/transaction-history-client.tsx');
  assert.match(client, /export \{ default \} from '@\/components\/dashboard\/MovementsView'/);
});

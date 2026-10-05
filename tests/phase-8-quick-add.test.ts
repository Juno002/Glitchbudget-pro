import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Phase 8 keeps the existing TransactionModal and orders the primary Quick Add flow', () => {
  const source = read('src/components/dashboard/TransactionModal.tsx');
  const steps = ['amount','type','account','category','save'].map(step => source.indexOf(`data-quick-add-step="${step}"`));
  assert.ok(steps.every(index => index >= 0), 'Falta un paso principal de Quick Add.');
  assert.deepEqual([...steps].sort((a,b) => a-b), steps, 'El flujo principal dejó de ser amount → type → account → category → save.');
  assert.match(source, /Más detalles/);
  assert.match(source, /Fecha/);
  assert.match(source, /Naturaleza/);
  assert.match(source, /Método de pago/);
  assert.match(source, /Tarjeta/);
});

test('Phase 8 keeps transfer in the same composer without a consumption category', () => {
  const source = read('src/components/dashboard/TransactionModal.tsx');
  assert.match(source, /type TransactionType = QuickAddTransactionType/);
  assert.match(source, /Transferencia/);
  assert.match(source, /txType !== 'transfer'/);
  assert.match(source, /Cuenta de origen/);
  assert.match(source, /Cuenta de destino/);
  assert.match(source, /No afecta ingresos ni gastos/);
});

test('Phase 8 preselects the real default cash account instead of a visual-only default', () => {
  const source = read('src/components/dashboard/TransactionModal.tsx');
  assert.match(source, /defaultCashAccount\(accounts \|\| \[\]\)/);
  assert.match(source, /if \(open && !isEditing && !accountId && defaultCashId\) setAccountId\(defaultCashId\)/);

  const context = read('src/contexts/finance-context.tsx');
  assert.match(context, /accounts: Account\[\] \| undefined/);
  assert.match(context, /accounts,/);
});

test('Phase 8 templates are local presets and do not add a Dexie table', () => {
  const source = [read('src/components/dashboard/TransactionModal.tsx'), read('src/components/dashboard/transaction-modal-automation.tsx')].join('\n');
  assert.match(source, /La fecha se completa al usar la plantilla/);
  assert.match(source, /loadQuickAddTemplates\(window\.localStorage\)/);
  assert.match(source, /upsertQuickAddTemplate\(window\.localStorage/);
  assert.match(source, /Guardar como plantilla/);

  const templates = read('src/lib/quick-add-templates.ts');
  assert.match(templates, /glitchbudget_quick_add_templates_v1/);
  assert.doesNotMatch(templates, /@\/lib\/db|Dexie|fetch\(/);

  const db = read('src/lib/db.ts');
  assert.doesNotMatch(db, /quick_add_templates|transaction_templates/);
});


test('full local-data reset also removes Phase 8 templates after Phase 16 centralizes automation cleanup', () => {
  const settings = read('src/components/layout/settings-dialog.tsx');
  const automation = read('src/lib/local-automation.ts');
  assert.match(settings, /clearLocalAutomation\(localStorage\)/);
  assert.match(automation, /QUICK_ADD_TEMPLATES_KEY/);
  assert.match(automation, /storage\.removeItem\(QUICK_ADD_TEMPLATES_KEY\)/);
});

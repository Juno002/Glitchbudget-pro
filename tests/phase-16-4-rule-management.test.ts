import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { TransactionRule } from '../src/domain/rules';
import {
  TRANSACTION_RULES_KEY,
  loadTransactionRules,
  moveTransactionRule,
  removeTransactionRule,
  setTransactionRuleEnabled,
  upsertTransactionRule,
} from '../src/lib/transaction-rules';

function memoryStorage(seed?: string) {
  const memory = new Map<string, string>();
  if (seed !== undefined) memory.set(TRANSACTION_RULES_KEY, seed);
  return {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value); },
  };
}

const spotifyRule: TransactionRule = {
  id: 'spotify',
  name: 'Spotify',
  enabled: true,
  condition: { field: 'description', operator: 'contains', value: 'Spotify' },
  suggestion: { categoryId: 'entertainment', necessity: 'want' },
};

test('16.4 persists only normalized deterministic rules in local storage', () => {
  const storage = memoryStorage();
  const rows = upsertTransactionRule(storage, {
    ...spotifyRule,
    name: '  Spotify   premium ',
    condition: { ...spotifyRule.condition, value: '  Spotify   Premium ' },
  });

  assert.deepEqual(rows, [{
    ...spotifyRule,
    name: 'Spotify premium',
    condition: { ...spotifyRule.condition, value: 'Spotify Premium' },
  }]);
  assert.deepEqual(loadTransactionRules(storage), rows);
});

test('16.4 repairs malformed storage and rejects invalid new rules', () => {
  const storage = memoryStorage('{broken');
  assert.deepEqual(loadTransactionRules(storage), []);

  const invalidStorage = memoryStorage(JSON.stringify([
    spotifyRule,
    { ...spotifyRule },
    { id: 'bad', name: 'Bad', enabled: true, condition: spotifyRule.condition, suggestion: {} },
  ]));
  assert.deepEqual(loadTransactionRules(invalidStorage).map(rule => rule.id), ['spotify']);

  assert.throws(() => upsertTransactionRule(memoryStorage(), {
    ...spotifyRule,
    suggestion: {},
  }), /regla necesita/i);
});

test('16.4 preserves explicit order and supports enable, reorder and delete', () => {
  const storage = memoryStorage();
  const netflix: TransactionRule = {
    id: 'netflix',
    name: 'Netflix',
    enabled: true,
    condition: { field: 'description', operator: 'contains', value: 'Netflix' },
    suggestion: { categoryId: 'entertainment' },
  };

  upsertTransactionRule(storage, spotifyRule);
  upsertTransactionRule(storage, netflix);
  assert.deepEqual(loadTransactionRules(storage).map(rule => rule.id), ['spotify', 'netflix']);

  assert.deepEqual(
    moveTransactionRule(storage, 'netflix', 'up').map(rule => rule.id),
    ['netflix', 'spotify'],
  );
  assert.equal(
    setTransactionRuleEnabled(storage, 'spotify', false).find(rule => rule.id === 'spotify')?.enabled,
    false,
  );
  assert.deepEqual(removeTransactionRule(storage, 'netflix').map(rule => rule.id), ['spotify']);
});

test('16.4 exposes explicit local rule management and Quick Add consumes persisted rules', () => {
  const manager = readFileSync(new URL('../src/components/settings/transaction-rule-manager.tsx', import.meta.url), 'utf8');
  const settings = readFileSync(new URL('../src/components/layout/settings-dialog.tsx', import.meta.url), 'utf8');
  const modal = [readFileSync(new URL('../src/components/dashboard/TransactionModal.tsx', import.meta.url), 'utf8'), readFileSync(new URL('../src/components/dashboard/transaction-modal-automation.tsx', import.meta.url), 'utf8')].join('\n');
  const automation = readFileSync(new URL('../src/lib/local-automation.ts', import.meta.url), 'utf8');
  const db = readFileSync(new URL('../src/lib/db.ts', import.meta.url), 'utf8');

  for (const text of ['Crear regla', 'Editar regla', 'Reglas locales', 'Descripción contiene', 'Eliminar']) {
    assert.ok(manager.includes(text), text);
  }
  assert.match(manager, /moveTransactionRule/);
  assert.match(manager, /setTransactionRuleEnabled/);
  assert.match(settings, /TransactionRuleManager/);
  assert.match(settings, /clearLocalAutomation/);
  assert.match(automation, /TRANSACTION_RULES_KEY/);
  assert.match(modal, /loadTransactionRules/);
  assert.match(modal, /effectiveRules = rules \?\? storedRules/);
  assert.doesNotMatch(db, /transaction_rules|rules!:/);
});

test('16.4 management remains local and deterministic while legacy rules stay manual by default', () => {
  const storage = readFileSync(new URL('../src/lib/transaction-rules.ts', import.meta.url), 'utf8');
  const manager = readFileSync(new URL('../src/components/settings/transaction-rule-manager.tsx', import.meta.url), 'utf8');
  const modal = [readFileSync(new URL('../src/components/dashboard/TransactionModal.tsx', import.meta.url), 'utf8'), readFileSync(new URL('../src/components/dashboard/transaction-modal-automation.tsx', import.meta.url), 'utf8')].join('\n');
  const combined = [storage, manager, modal].join('\n');

  const legacy = loadTransactionRules(memoryStorage(JSON.stringify([spotifyRule])))[0];
  assert.equal(legacy?.applyAutomatically, undefined);
  assert.doesNotMatch(combined, /fetch\s*\(|axios|XMLHttpRequest|https?:\/\//i);
  assert.doesNotMatch(combined, /openai|gemini|anthropic|language model|\bAI\b/i);
  assert.match(modal, /Aceptar sugerencia/);
  assert.match(modal, /Ignorar sugerencia/);
});

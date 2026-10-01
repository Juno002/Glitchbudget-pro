import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { evaluateTransactionRules } from '../src/domain/rule-engine';
import { normalizeTransactionRule, type TransactionRule } from '../src/domain/rules';
import {
  quickAddRuleSuggestions,
  resolveAutomaticRuleSuggestion,
} from '../src/domain/rule-suggestions';
import {
  loadTransactionRules,
  upsertTransactionRule,
} from '../src/lib/transaction-rules';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const automaticSpotify: TransactionRule = {
  id: 'spotify',
  name: 'Spotify',
  enabled: true,
  applyAutomatically: true,
  condition: { field: 'description', operator: 'contains', value: 'Spotify' },
  suggestion: { categoryId: 'entertainment', necessity: 'want' },
};

test('16.6 keeps legacy rules manual by default and persists explicit opt-in only', () => {
  const legacy = normalizeTransactionRule({
    id: 'legacy',
    name: 'Legacy',
    enabled: true,
    condition: { field: 'description', operator: 'contains', value: 'Legacy' },
    suggestion: { categoryId: 'other' },
  });
  assert.ok(legacy);
  assert.equal(legacy.applyAutomatically, undefined);

  const explicitFalse = normalizeTransactionRule({
    ...legacy,
    applyAutomatically: false,
  });
  assert.equal(explicitFalse?.applyAutomatically, undefined);

  const storage = new MemoryStorage();
  upsertTransactionRule(storage, automaticSpotify);
  assert.equal(loadTransactionRules(storage)[0]?.applyAutomatically, true);
});

test('16.6 carries auto-apply intent through deterministic evaluation and compatibility filtering', () => {
  const matches = evaluateTransactionRules('Pago SPOTIFY premium', [automaticSpotify]);
  assert.equal(matches[0]?.applyAutomatically, true);

  const expense = quickAddRuleSuggestions(matches, 'expense', ['entertainment']);
  assert.equal(expense[0]?.applyAutomatically, true);
  assert.deepEqual(expense[0]?.suggestion, { categoryId: 'entertainment', necessity: 'want' });

  assert.deepEqual(quickAddRuleSuggestions(matches, 'transfer', ['entertainment']), []);
  const income = quickAddRuleSuggestions(matches, 'income', ['entertainment']);
  assert.deepEqual(income[0]?.suggestion, { categoryId: 'entertainment', necessity: undefined });
});

test('16.6 automatically resolves exactly one compatible opted-in rule', () => {
  const manual: TransactionRule = {
    id: 'manual',
    name: 'Manual',
    enabled: true,
    condition: { field: 'description', operator: 'contains', value: 'premium' },
    suggestion: { categoryId: 'subscriptions' },
  };
  const matches = quickAddRuleSuggestions(
    evaluateTransactionRules('Spotify Premium', [automaticSpotify, manual]),
    'expense',
    ['entertainment', 'subscriptions'],
  );
  const result = resolveAutomaticRuleSuggestion(matches);

  assert.equal(result.automatic?.ruleId, 'spotify');
  assert.deepEqual(result.manual.map(row => row.ruleId), ['manual']);
  assert.equal(result.hasAutomaticConflict, false);
});

test('16.6 refuses to invent precedence when multiple automatic rules match', () => {
  const second: TransactionRule = {
    id: 'premium',
    name: 'Premium',
    enabled: true,
    applyAutomatically: true,
    condition: { field: 'description', operator: 'contains', value: 'premium' },
    suggestion: { categoryId: 'subscriptions' },
  };
  const matches = quickAddRuleSuggestions(
    evaluateTransactionRules('Spotify Premium', [automaticSpotify, second]),
    'expense',
    ['entertainment', 'subscriptions'],
  );
  const result = resolveAutomaticRuleSuggestion(matches);

  assert.equal(result.automatic, null);
  assert.equal(result.hasAutomaticConflict, true);
  assert.deepEqual(result.manual.map(row => row.ruleId), ['spotify', 'premium']);
});

test('16.6 UI makes opt-in explicit per rule and automatic application only fills Quick Add classification', () => {
  const manager = readFileSync(new URL('../src/components/settings/transaction-rule-manager.tsx', import.meta.url), 'utf8');
  const modal = [readFileSync(new URL('../src/components/dashboard/TransactionModal.tsx', import.meta.url), 'utf8'), readFileSync(new URL('../src/components/dashboard/transaction-modal-automation.tsx', import.meta.url), 'utf8')].join('\n');
  const context = readFileSync(new URL('../src/contexts/finance-context.tsx', import.meta.url), 'utf8');
  const db = readFileSync(new URL('../src/lib/db.ts', import.meta.url), 'utf8');

  assert.match(manager, /Aplicar automáticamente esta regla/);
  assert.match(manager, /applyAutomatically \? \{ applyAutomatically: true \}/);
  assert.match(manager, /solo para esta regla/i);
  assert.match(modal, /resolveAutomaticRuleSuggestion/);
  assert.match(modal, /shouldApplyAutomaticRuleField/);
  assert.match(modal, /setCategoryEditedManually\(true\)/);
  assert.match(modal, /setNecessityEditedManually\(true\)/);
  assert.match(modal, /setCategoryId\(automaticRuleSuggestion\.suggestion\.categoryId!/);
  assert.match(modal, /setNecessity\(automaticRuleSuggestion\.suggestion\.necessity!/);
  assert.match(modal, /Varias reglas automáticas coinciden/);
  assert.match(modal, /Puedes cambiar estos campos antes de guardar/);
  assert.doesNotMatch(context, /applyAutomatically|autoApply/);
  assert.doesNotMatch(db, /transaction_rules|rules!:/);
});

test('16.6 remains local, deterministic and does not transmit descriptions or invoke AI', () => {
  const files = [
    '../src/domain/rules.ts',
    '../src/domain/rule-engine.ts',
    '../src/domain/rule-suggestions.ts',
    '../src/lib/transaction-rules.ts',
    '../src/components/settings/transaction-rule-manager.tsx',
    '../src/components/dashboard/TransactionModal.tsx',
    '../src/components/dashboard/transaction-modal-automation.tsx',
  ].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

  assert.doesNotMatch(files, /fetch\s*\(|axios|XMLHttpRequest|WebSocket|EventSource|sendBeacon|https?:\/\//i);
  assert.doesNotMatch(files, /openai|gemini|anthropic|language model|remote ai/i);
});

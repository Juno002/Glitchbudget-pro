import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { upsertQuickAddTemplate } from '../src/lib/quick-add-templates';
import { upsertSavedTransactionFilter } from '../src/lib/saved-transaction-filters';
import { upsertTransactionRule } from '../src/lib/transaction-rules';
import {
  LOCAL_AUTOMATION_LAYERS,
  clearLocalAutomation,
  loadLocalAutomationSummary,
} from '../src/lib/local-automation';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

test('16.5 keeps the roadmap order Templates -> Saved filters -> Rules explicit', () => {
  assert.deepEqual(
    LOCAL_AUTOMATION_LAYERS.map(layer => layer.id),
    ['templates', 'saved_filters', 'rules'],
  );
  assert.deepEqual(
    LOCAL_AUTOMATION_LAYERS.map(layer => layer.location),
    ['Quick Add', 'Movimientos', 'Ajustes → Automatización'],
  );
});

test('16.5 summarizes each local automation layer without merging their storage', () => {
  const storage = new MemoryStorage();

  upsertQuickAddTemplate(storage, {
    id: 'bus',
    name: 'Bus',
    type: 'expense',
    amount: '35',
    categoryId: 'transport',
  });
  upsertSavedTransactionFilter(storage, {
    id: 'wants',
    name: 'Wants',
    filters: { type: 'expense', necessity: 'want' },
  });
  upsertTransactionRule(storage, {
    id: 'spotify',
    name: 'Spotify',
    enabled: true,
    condition: { field: 'description', operator: 'contains', value: 'Spotify' },
    suggestion: { categoryId: 'entertainment', necessity: 'want' },
  });

  assert.deepEqual(loadLocalAutomationSummary(storage), {
    templates: 1,
    savedFilters: 1,
    rules: 1,
  });
});

test('16.5 clears the three automation layers together but preserves unrelated local preferences', () => {
  const storage = new MemoryStorage();
  storage.setItem('unrelated', 'keep');

  upsertQuickAddTemplate(storage, {
    id: 'salary',
    name: 'Nómina',
    type: 'income',
    amount: '1000',
  });
  upsertSavedTransactionFilter(storage, {
    id: 'income',
    name: 'Ingresos',
    filters: { type: 'income' },
  });
  upsertTransactionRule(storage, {
    id: 'salary-rule',
    name: 'Nómina',
    enabled: true,
    condition: { field: 'description', operator: 'contains', value: 'Nómina' },
    suggestion: { categoryId: 'salary' },
  });

  clearLocalAutomation(storage);

  assert.deepEqual(loadLocalAutomationSummary(storage), {
    templates: 0,
    savedFilters: 0,
    rules: 0,
  });
  assert.equal(storage.getItem('unrelated'), 'keep');
});

test('16.5 exposes the ordered stack in Settings while each layer keeps its native surface', () => {
  const settings = readFileSync(new URL('../src/components/layout/settings-dialog.tsx', import.meta.url), 'utf8');
  const modal = [readFileSync(new URL('../src/components/dashboard/TransactionModal.tsx', import.meta.url), 'utf8'), readFileSync(new URL('../src/components/dashboard/transaction-modal-automation.tsx', import.meta.url), 'utf8')].join('\n');
  const movements = readFileSync(new URL('../src/components/dashboard/MovementsView.tsx', import.meta.url), 'utf8');
  const manager = readFileSync(new URL('../src/components/settings/transaction-rule-manager.tsx', import.meta.url), 'utf8');

  assert.match(settings, /Plantillas → Filtros guardados → Reglas/);
  assert.match(settings, /data-local-automation-order="templates-saved-filters-rules"/);
  assert.match(settings, /Las plantillas se gestionan dentro del registro rápido/);
  assert.match(settings, /los filtros guardados, en Movimientos/);
  assert.match(settings, /las reglas se gestionan aquí/);

  assert.match(modal, /quick-add-templates/);
  assert.match(modal, /transaction-rules/);
  assert.doesNotMatch(modal, /saved-transaction-filters/);

  assert.match(movements, /saved-transaction-filters/);
  assert.doesNotMatch(movements, /transaction-rules/);

  assert.match(manager, /transaction-rules/);
  assert.doesNotMatch(manager, /quick-add-templates|saved-transaction-filters/);
});

test('16.5 integration remains local and does not turn automation into a global setting', () => {
  const automation = readFileSync(new URL('../src/lib/local-automation.ts', import.meta.url), 'utf8');
  const settings = readFileSync(new URL('../src/components/layout/settings-dialog.tsx', import.meta.url), 'utf8');
  const modal = [readFileSync(new URL('../src/components/dashboard/TransactionModal.tsx', import.meta.url), 'utf8'), readFileSync(new URL('../src/components/dashboard/transaction-modal-automation.tsx', import.meta.url), 'utf8')].join('\n');
  const combined = [automation, settings, modal].join('\n');

  assert.doesNotMatch(automation, /applyAutomatically|autoApply/i);
  assert.doesNotMatch(combined, /fetch\s*\(|axios|XMLHttpRequest|https?:\/\//i);
  assert.doesNotMatch(combined, /openai|gemini|anthropic|language model|\bAI\b/i);
  assert.match(modal, /Aceptar sugerencia/);
  assert.match(modal, /Ignorar sugerencia/);
});

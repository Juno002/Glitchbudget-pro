import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  QUICK_ADD_TEMPLATES_KEY,
  loadQuickAddTemplates,
  removeQuickAddTemplate,
  upsertQuickAddTemplate,
} from '../src/lib/quick-add-templates';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test('Quick Add templates remain local and round-trip their transaction defaults', () => {
  const storage = new MemoryStorage();
  const saved = upsertQuickAddTemplate(storage, {
    id:'bus',
    name:'Bus',
    type:'expense',
    amount:'35',
    accountId:'cash',
    categoryId:'transport',
    expenseSubtype:'Variable',
    paymentMethod:'cash',
  });

  assert.equal(saved.length, 1);
  assert.equal(loadQuickAddTemplates(storage)[0]?.name, 'Bus');
  assert.equal(loadQuickAddTemplates(storage)[0]?.amount, '35');
  assert.match(storage.getItem(QUICK_ADD_TEMPLATES_KEY) || '', /transport/);
});

test('Quick Add templates tolerate corrupt local data and can be deleted', () => {
  const storage = new MemoryStorage();
  storage.setItem(QUICK_ADD_TEMPLATES_KEY, '{broken');
  assert.deepEqual(loadQuickAddTemplates(storage), []);

  upsertQuickAddTemplate(storage, { id:'salary', name:'Nómina', type:'income', amount:'1000' });
  assert.equal(removeQuickAddTemplate(storage, 'salary').length, 0);
});

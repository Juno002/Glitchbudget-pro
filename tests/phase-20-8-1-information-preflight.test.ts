import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeCategories, categorySeeds, reconstructCategories } from '../src/domain/categories';

test('20.8.1 clean install exposes every default category in its supported direction', () => {
  const rows = reconstructCategories({});
  const expenseIds = new Set(activeCategories(rows, 'expense').map(category => category.id));
  const incomeIds = new Set(activeCategories(rows, 'income').map(category => category.id));

  for (const seed of categorySeeds) {
    assert.equal(rows.find(category => category.id === seed.id)?.archived, false);
    if (seed.type === 'expense' || seed.type === 'both') assert.ok(expenseIds.has(seed.id), `${seed.id} missing from expense defaults`);
    if (seed.type === 'income' || seed.type === 'both') assert.ok(incomeIds.has(seed.id), `${seed.id} missing from income defaults`);
  }
});

test('20.8.1 preserves custom historical categories as archived instead of repairing them into live defaults', () => {
  const rows = reconstructCategories({
    settings: { expenseCategories: ['alimentacion'], incomeCategories: ['sueldo'] },
    expenses: [{ categoryId: 'custom-historical' }],
  });

  const custom = rows.find(category => category.id === 'custom-historical');
  assert.ok(custom);
  assert.equal(custom.archived, true);
  assert.equal(custom.type, 'expense');
  assert.equal(activeCategories(rows, 'expense').some(category => category.id === custom.id), false);

  const omittedBuiltIn = rows.find(category => category.id === 'transporte');
  assert.ok(omittedBuiltIn);
  assert.equal(omittedBuiltIn.archived, true);
});

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';

import { reconstructCategories } from '../src/domain/categories';
import { clearPersistedFinanceData } from '../src/lib/data-reset-service';
import { db } from '../src/lib/db';

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
});

after(() => db.close());

test('full data reset restores the same default categories as a brand-new database', async () => {
  await db.categories.add({
    id:'custom-expense',
    name:'Temporal',
    type:'expense',
    iconName:'landmark',
    archived:false,
    expenseOrder:999,
  });
  await db.incomes.add({
    id:'income',
    date:'2026-10-03',
    month:'2026-10',
    amount:100_000,
    categoryId:'custom-income',
    description:'Dato que debe borrarse',
    type:'extra',
  });
  await db.expenses.add({
    id:'expense',
    date:'2026-10-03',
    month:'2026-10',
    amount:10_000,
    categoryId:'custom-expense',
    concept:'Dato que debe borrarse',
    nature:'Variable',
    paymentMethod:'cash',
  });

  await clearPersistedFinanceData();

  const actual = (await db.categories.toArray()).sort((a,b) => a.id.localeCompare(b.id));
  const expected = reconstructCategories({}).sort((a,b) => a.id.localeCompare(b.id));

  assert.deepEqual(actual, expected);
  assert.equal(await db.incomes.count(), 0);
  assert.equal(await db.expenses.count(), 0);
  assert.equal(await db.accounts.count(), 0);
  assert.equal(await db.debts.count(), 0);
  assert.equal(await db.plans.count(), 0);
});

test('reset defaults include active income and expense choices with canonical ordering', async () => {
  await clearPersistedFinanceData();

  const rows = await db.categories.toArray();
  const expense = rows
    .filter(row => !row.archived && (row.type === 'expense' || row.type === 'both'))
    .sort((a,b) => (a.expenseOrder ?? Number.MAX_SAFE_INTEGER) - (b.expenseOrder ?? Number.MAX_SAFE_INTEGER));
  const income = rows
    .filter(row => !row.archived && (row.type === 'income' || row.type === 'both'))
    .sort((a,b) => (a.incomeOrder ?? Number.MAX_SAFE_INTEGER) - (b.incomeOrder ?? Number.MAX_SAFE_INTEGER));

  assert.ok(expense.length > 0);
  assert.ok(income.length > 0);
  assert.equal(expense[0]?.id, 'vivienda');
  assert.equal(income[0]?.id, 'sueldo');
});

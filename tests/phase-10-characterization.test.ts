import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { db } from '../src/lib/db';
import { saveGoalContribution } from '../src/lib/transaction-service';

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => { for (const table of db.tables) await table.clear(); });
  await db.goals.add({ id:'goal', name:'Reserva', target:1000, quota:100, startDate:'2026-09-01' });
});
after(() => db.close());

test('goal reservations do not create or change real financial movements', async () => {
  await db.accounts.add({ id:'cash', name:'Efectivo', type:'cash', currency:'DOP', openingBalance:10000, startDate:'2026-09-01' });
  const accounts = await db.accounts.toArray();
  await saveGoalContribution({ id:'a', goalId:'goal', amount:1000, date:'2026-09-27' });
  assert.deepEqual(await db.accounts.toArray(), accounts);
  for (const table of [db.incomes, db.expenses, db.account_transfers, db.debt_payments]) assert.equal(await table.count(), 0);
  assert.equal(await db.goal_contributions.count(), 1);
});

test('goal contribution validation is atomic and completion is returned only on crossing target', async () => {
  assert.equal(await saveGoalContribution({ id:'a', goalId:'goal', amount:900, date:'2026-09-27' }), false);
  assert.equal(await saveGoalContribution({ id:'b', goalId:'goal', amount:100, date:'2026-09-27' }), true);
  assert.equal(await saveGoalContribution({ id:'c', goalId:'goal', amount:1, date:'2026-09-27' }), false);
  await assert.rejects(saveGoalContribution({ id:'c', goalId:'goal', amount:500, date:'2026-09-27' }));
  await assert.rejects(saveGoalContribution({ id:'d', goalId:'missing', amount:100, date:'2026-09-27' }));
  assert.equal(await db.goal_contributions.count(), 3);
  assert.equal((await db.goal_contributions.toArray()).reduce((sum, row) => sum + row.amount, 0), 1001);
});

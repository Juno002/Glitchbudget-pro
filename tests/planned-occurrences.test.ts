import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, beforeEach, test } from 'node:test';
import Dexie from 'dexie';
import { db, GlitchBudgetDB } from '../src/lib/db';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { addPendingOccurrence, plannedOccurrenceSchema, validatePlannedOccurrenceSet } from '../src/lib/planned-occurrence-service';
import { selectMonthlyMetrics } from '../src/domain/metrics';
import { selectPosition } from '../src/domain/ledger';
import { readAccountSnapshot } from '../src/lib/accounts';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/backup-v4.json', import.meta.url), 'utf8'));
const clean = (value: unknown) => JSON.parse(JSON.stringify(value));

beforeEach(async () => {
  await importDataJSON(JSON.stringify(fixture));
});
after(() => db.close());

async function snapshot(database: GlitchBudgetDB = db) {
  return clean(await database.transaction('r', database.tables, async () =>
    Object.fromEntries(await Promise.all(database.tables.map(async table => [table.name, await table.toArray()])))));
}

async function financialSnapshot() {
  const rows = await readAccountSnapshot();
  return {
    metrics: selectMonthlyMetrics({
      settings: (await db.settings.get('general'))!,
      incomes: rows.incomes,
      expenses: rows.expenses,
      budgets: await db.plans.toArray(),
      goalContributions: await db.goal_contributions.toArray(),
      debtPayments: rows.payments,
    }, '2026-09'),
    position: selectPosition(await db.accounts.toArray(), await db.debts.toArray(), rows, '2026-09-30'),
  };
}

test('v10 upgrades through the current schema, adds planned occurrences, and only currency-normalizes money rows', async () => {
  const name = 'phase7a-v10-' + crypto.randomUUID();
  const schema = {
    expenses: 'id, date, month, categoryId, nature, accountId',
    incomes: 'id, date, month, categoryId, type, accountId',
    goals: 'id, status',
    goal_contributions: 'id, goalId, date',
    plans: '[month+categoryId], month, categoryId',
    settings: 'id',
    periods: 'id, year, month',
    recurrents: 'id, direction, categoryId, cadence, active, startDate, endDate',
    debts: 'id, status, type, createdAt',
    debt_payments: 'id, debtId, date, accountId',
    fxRates: 'id, base, quote, updatedAt',
    accounts: 'id, type',
    account_transfers: 'id, fromAccountId, toAccountId, date',
    categories: 'id, type',
  };
  const old = new Dexie(name);
  old.version(10).stores(schema);
  await old.table('settings').add({ id:'general', theme:'dark', rolloverStrategy:'reset', currency:'DOP', locale:'es-DO', baseIncome:{freq:'mensual',amount:0}, savePct:0 });
  await old.table('recurrents').add({ id:'rule', direction:'expense', title:'Plan', categoryId:'food', amount:1000, cadence:'monthly', startDate:'2026-09-01', active:true });
  await old.table('expenses').add({ id:'expense', month:'2026-09', date:'2026-09-15', categoryId:'food', amount:1000, concept:'Real', nature:'Fijo' });
  const before = {
    settings: await old.table('settings').toArray(),
    recurrents: await old.table('recurrents').toArray(),
    expenses: await old.table('expenses').toArray(),
  };
  old.close();

  const current = new GlitchBudgetDB(name);
  try {
    await current.open();
    assert.equal(current.verno, 14);
    assert.deepEqual(clean(await current.settings.toArray()), clean(before.settings));
    assert.deepEqual(clean(await current.recurrents.toArray()), clean(before.recurrents));
    assert.deepEqual(clean(await current.expenses.toArray()), clean(before.expenses.map(row => ({ ...row, currency:'DOP', fxRate:1, amountBase:row.amount }))));
    assert.equal(await current.planned_occurrences.count(), 0);
  } finally {
    await current.delete();
  }
});

test('pending occurrence storage enforces unique rule plus scheduled date', async () => {
  const first = await addPendingOccurrence({ id:'occ-1', ruleId:'rule', scheduledDate:'2026-09-15' });
  assert.equal(first.status, 'pending');
  await assert.rejects(
    addPendingOccurrence({ id:'occ-2', ruleId:'rule', scheduledDate:'2026-09-15' }),
    /ya existe/
  );
  await addPendingOccurrence({ id:'occ-3', ruleId:'rule', scheduledDate:'2026-10-15' });
  assert.equal(await db.planned_occurrences.count(), 2);
});

test('pending occurrence creation requires an active source rule', async () => {
  await db.recurrents.update('rule', { active: false });
  await assert.rejects(
    addPendingOccurrence({ id:'inactive', ruleId:'rule', scheduledDate:'2026-09-15' }),
    /inactiva/
  );
  await assert.rejects(
    addPendingOccurrence({ id:'missing', ruleId:'missing', scheduledDate:'2026-09-15' }),
    /no existe/
  );
  assert.equal(await db.planned_occurrences.count(), 0);
});

test('occurrence model constrains transaction links to confirmed state', () => {
  assert.throws(() => plannedOccurrenceSchema.parse({ id:'a', ruleId:'rule', scheduledDate:'2026-09-15', status:'confirmed' }), /movimiento real/);
  assert.throws(() => plannedOccurrenceSchema.parse({ id:'b', ruleId:'rule', scheduledDate:'2026-09-15', status:'pending', transactionId:'tx' }), /Solo una ocurrencia confirmada/);
  assert.throws(() => plannedOccurrenceSchema.parse({ id:'c', ruleId:'rule', scheduledDate:'2026-02-30', status:'pending' }), /Fecha planificada/);
  assert.deepEqual(
    plannedOccurrenceSchema.parse({ id:'d', ruleId:'rule', scheduledDate:'2026-09-15', status:'confirmed', transactionId:'tx' }),
    { id:'d', ruleId:'rule', scheduledDate:'2026-09-15', status:'confirmed', transactionId:'tx' }
  );
});

test('set validation rejects duplicate IDs, logical dates and transaction links', () => {
  const base = { id:'a', ruleId:'rule', scheduledDate:'2026-09-15', status:'pending' as const };
  assert.throws(() => validatePlannedOccurrenceSet([base, { ...base }]), /IDs/);
  assert.throws(() => validatePlannedOccurrenceSet([base, { ...base, id:'b' }]), /misma fecha/);
  assert.throws(() => validatePlannedOccurrenceSet([
    { ...base, status:'confirmed', transactionId:'tx' },
    { ...base, id:'b', scheduledDate:'2026-10-15', status:'confirmed', transactionId:'tx' },
  ]), /movimiento real/);
});

test('storing a pending occurrence does not change financial metrics or position', async () => {
  const before = await financialSnapshot();
  await addPendingOccurrence({ id:'occ-neutral', ruleId:'rule', scheduledDate:'2026-09-15' });
  assert.deepEqual(await financialSnapshot(), before);
});

test('backup v7 round-trips planned occurrences exactly', async () => {
  await addPendingOccurrence({ id:'occ-roundtrip', ruleId:'rule', scheduledDate:'2026-09-15' });
  const exported = JSON.parse(await exportDataJSON());
  assert.equal(exported.v, 11);
  assert.deepEqual(exported.plannedOccurrences, [{ id:'occ-roundtrip', ruleId:'rule', scheduledDate:'2026-09-15', status:'pending' }]);
  const before = await snapshot();
  await importDataJSON(JSON.stringify(exported));
  assert.deepEqual(await snapshot(), before);
});

test('backup v6 remains compatible and imports with no invented occurrences', async () => {
  const legacy = JSON.parse(await exportDataJSON());
  legacy.v = 6;
  delete legacy.plannedOccurrences;
  await addPendingOccurrence({ id:'will-disappear', ruleId:'rule', scheduledDate:'2026-09-15' });
  await importDataJSON(JSON.stringify(legacy));
  assert.equal(await db.planned_occurrences.count(), 0);
});

test('corrupt v7 occurrence sets are rejected before replacing existing data', async () => {
  await addPendingOccurrence({ id:'safe', ruleId:'rule', scheduledDate:'2026-09-15' });
  const before = await snapshot();
  const bad = JSON.parse(await exportDataJSON());
  bad.plannedOccurrences.push({ id:'duplicate-date', ruleId:'rule', scheduledDate:'2026-09-15', status:'pending' });
  bad.settings.savePct = 0.77;
  await assert.rejects(importDataJSON(JSON.stringify(bad)), /misma fecha/);
  assert.deepEqual(await snapshot(), before);

  const invalidState = JSON.parse(await exportDataJSON());
  invalidState.plannedOccurrences[0] = { id:'safe', ruleId:'rule', scheduledDate:'2026-09-15', status:'confirmed' };
  await assert.rejects(importDataJSON(JSON.stringify(invalidState)));
  assert.deepEqual(await snapshot(), before);
});

test('Dexie also prevents one transaction from linking two occurrences', async () => {
  const first = plannedOccurrenceSchema.parse({ id:'confirmed-1', ruleId:'rule', scheduledDate:'2026-09-15', status:'confirmed', transactionId:'tx-one' });
  const second = plannedOccurrenceSchema.parse({ id:'confirmed-2', ruleId:'rule', scheduledDate:'2026-10-15', status:'confirmed', transactionId:'tx-one' });
  await db.planned_occurrences.add(first);
  await assert.rejects(db.planned_occurrences.add(second), error => (error as { name?:string }).name === 'ConstraintError');
});

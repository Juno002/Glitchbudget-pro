import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import Dexie from 'dexie';
import { db, GlitchBudgetDB } from '../src/lib/db';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { accountPosition, readAccountSnapshot } from '../src/lib/accounts';
import { calculateRecordedTotals } from '../src/lib/finance-calculations';

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const clean = (value: unknown) => JSON.parse(JSON.stringify(value));
after(() => db.close());
for (const version of [6, 7]) {
  test(`frozen Dexie v${version} fixture migrates without losing any historical table`, async () => {
    const source = fixture(`dexie-v${version}`);
    const name = `phase0-migration-v${version}`;
    const old = new Dexie(name);
    old.version(version).stores(source.schema);
    for (const [table, rows] of Object.entries(source.tables)) await old.table(table).bulkAdd(rows as object[]);
    old.close();
    const current = new GlitchBudgetDB(name);
    try {
      await current.open();
      assert.equal(current.verno, 8);
      for (const [table, rows] of Object.entries(source.tables)) {
        const expected = structuredClone(rows) as any[];
        if (version === 6 && table === 'settings') expected[0].customCategoryIcons = {};
        const sort = (a: any, b: any) => JSON.stringify(a).localeCompare(JSON.stringify(b));
        assert.deepEqual(clean(await current.table(table).toArray()).sort(sort), expected.sort(sort), table);
      }
      assert.equal(await current.accounts.count(), 0);
      assert.equal(await current.account_transfers.count(), 0);
    } finally { await current.delete(); } // Only the isolated fake-indexeddb database.
  });
}
async function snapshot() {
  return clean(await db.transaction('r', db.tables, async () => Object.fromEntries(await Promise.all(db.tables.map(async t => [t.name, await t.toArray()])))));
}
async function metrics() {
  const rows = await readAccountSnapshot();
  return {
    position: accountPosition(await db.accounts.toArray(), await db.debts.toArray(), rows, '2026-09-30'),
    month: calculateRecordedTotals({ settings: (await db.settings.get('general'))!, incomes: rows.incomes, expenses: rows.expenses, debtPayments: rows.payments, budgets: await db.plans.toArray(), goalContributions: await db.goal_contributions.toArray() }, '2026-09'),
  };
}
test('frozen v4 backup: export, empty test DB, import preserves all tables and financial results', async () => {
  const source = fixture('backup-v4');
  await importDataJSON(JSON.stringify(source));
  const before = await snapshot();
  assert.equal(Object.keys(before).length, 13);
  for (const rows of Object.values(before)) assert.ok((rows as any[]).length > 0);
  const financial = await metrics();
  assert.equal(financial.position.cash, 80000);
  assert.equal(financial.position.bank, 220000);
  assert.equal(financial.position.owed, 40000);
  assert.equal(financial.position.net, 260000);
  assert.equal(financial.month.totalIncome, 100000);
  assert.equal(financial.month.totalExpenses, 30000);
  assert.equal(financial.month.cashFlow, 80000);
  const exported = await exportDataJSON();
  await db.transaction('rw', db.tables, async () => { for (const table of db.tables) await table.clear(); });
  for (const table of db.tables) assert.equal(await table.count(), 0);
  await importDataJSON(exported);
  assert.deepEqual(await snapshot(), before);
  assert.deepEqual(await metrics(), financial);
  const again = JSON.parse(await exportDataJSON());
  const original = JSON.parse(exported);
  delete again.exportedAt; delete original.exportedAt;
  assert.deepEqual(again, original);
});
test('invalid v4 restore leaves every existing table unchanged', async () => {
  await importDataJSON(JSON.stringify(fixture('backup-v4')));
  const before = await snapshot();
  const invalid = fixture('backup-v4'); invalid.accountTransfers[0].toAccountId = 'missing';
  await assert.rejects(importDataJSON(JSON.stringify(invalid)));
  assert.deepEqual(await snapshot(), before);
});

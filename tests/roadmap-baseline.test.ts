import { migrateGoalRecords } from '../src/domain/goals';
import { migrateActualExpense, migrateRecurringRule } from '../src/domain/actual-planned-migration';
import { withoutLegacyCategories } from '../src/domain/categories';
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import Dexie from 'dexie';
import { db, GlitchBudgetDB } from '../src/lib/db';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { accountPosition, readAccountSnapshot } from '../src/lib/accounts';
import { calculateRecordedTotals } from '../src/lib/finance-calculations';
import { upsertQuickAddTemplate } from '../src/lib/quick-add-templates';
import { upsertSavedTransactionFilter } from '../src/lib/saved-transaction-filters';
import { upsertTransactionRule } from '../src/lib/transaction-rules';
import { clearLocalAutomation, exportLocalAutomation } from '../src/lib/local-automation';

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const clean = (value: unknown) => JSON.parse(JSON.stringify(value));
class MemoryStorage {
  private values = new Map<string,string>();
  getItem(key:string) { return this.values.get(key) ?? null; }
  setItem(key:string,value:string) { this.values.set(key,value); }
  removeItem(key:string) { this.values.delete(key); }
}
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
      assert.equal(current.verno, 14);
      for (const [table, rows] of Object.entries(source.tables)) {
        let expected = structuredClone(rows) as any[];
        if (table === 'goals') expected=migrateGoalRecords(source.tables.goals,source.tables.goal_contributions).goals;
        if (table === 'goal_contributions') expected=migrateGoalRecords(source.tables.goals,source.tables.goal_contributions).contributions;
        if (table === 'expenses') expected=expected.map(migrateActualExpense);
        if (table === 'recurrents') expected=expected.map(migrateRecurringRule);
        if (table === 'settings') expected[0] = withoutLegacyCategories(expected[0]);
        const baseCurrency = source.tables.settings?.[0]?.currency || 'DOP';
        if (table === 'incomes' || table === 'expenses' || table === 'debt_payments') {
          expected = expected.map(row => ({ ...row, currency:baseCurrency, fxRate:1, amountBase:row.amount }));
        }
        const sort = (a: any, b: any) => JSON.stringify(a).localeCompare(JSON.stringify(b));
        assert.deepEqual(clean(await current.table(table).toArray()).sort(sort), expected.sort(sort), table);
      }
      assert.equal(await current.accounts.count(), 0);
      assert.equal(await current.account_transfers.count(), 0);
      assert.equal(await current.planned_occurrences.count(), 0);
      assert.equal(await current.investments.count(), 0);
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
test('frozen v4 backup: export, empty test DB, import preserves all tables, automation and financial results', async () => {
  const source = fixture('backup-v4');
  const storage = new MemoryStorage();
  upsertQuickAddTemplate(storage, { id:'bus', name:'Bus', type:'expense', amount:'35', categoryId:'food' });
  upsertSavedTransactionFilter(storage, { id:'expenses', name:'Gastos', filters:{ type:'expense' } });
  upsertTransactionRule(storage, {
    id:'spotify',
    name:'Spotify',
    enabled:true,
    applyAutomatically:true,
    condition:{field:'description',operator:'contains',value:'Spotify'},
    suggestion:{categoryId:'food',necessity:'want'},
  });
  const automationBeforeLegacyRestore = exportLocalAutomation(storage);
  await importDataJSON(JSON.stringify(source), storage);
  assert.deepEqual(exportLocalAutomation(storage), automationBeforeLegacyRestore, 'legacy backups preserve local automation');
  const before = await snapshot();
  assert.equal(Object.keys(before).length, 16);
  for (const [table, rows] of Object.entries(before)) {
    if (table === 'planned_occurrences' || table === 'investments') assert.equal((rows as any[]).length, 0);
    else assert.ok((rows as any[]).length > 0, table);
  }
  const financial = await metrics();
  assert.equal(financial.position.cash, 80000);
  assert.equal(financial.position.bank, 220000);
  assert.equal(financial.position.owed, 40000);
  assert.equal(financial.position.net, 260000);
  assert.equal(financial.month.totalIncome, 100000);
  assert.equal(financial.month.totalExpenses, 30000);
  assert.equal(financial.month.cashFlow, 80000);
  const automationBefore = exportLocalAutomation(storage);
  const exported = await exportDataJSON(storage);
  const parsedExport = JSON.parse(exported);
  assert.equal(parsedExport.v, 13);
  assert.deepEqual(clean(parsedExport.localAutomation), clean(automationBefore));
  await db.transaction('rw', db.tables, async () => { for (const table of db.tables) await table.clear(); });
  clearLocalAutomation(storage);
  for (const table of db.tables) assert.equal(await table.count(), 0);
  await importDataJSON(exported, storage);
  assert.deepEqual(await snapshot(), before);
  assert.deepEqual(exportLocalAutomation(storage), automationBefore);
  assert.deepEqual(await metrics(), financial);
  const again = JSON.parse(await exportDataJSON(storage));
  const original = JSON.parse(exported);
  delete again.exportedAt; delete original.exportedAt;
  assert.deepEqual(again, original);

  const beforeInvalidV12 = await snapshot();
  const automationBeforeInvalidV12 = exportLocalAutomation(storage);
  const invalidV12 = JSON.parse(exported);
  invalidV12.localAutomation.rules = [{
    id:'bad',
    name:'Bad',
    enabled:true,
    applyAutomatically:true,
    condition:{field:'description',operator:'regex',value:'oops'},
    suggestion:{categoryId:'food'},
  }];
  await assert.rejects(importDataJSON(JSON.stringify(invalidV12), storage), /Rules contiene datos inválidos/i);
  assert.deepEqual(await snapshot(), beforeInvalidV12);
  assert.deepEqual(exportLocalAutomation(storage), automationBeforeInvalidV12);
});
test('invalid v4 restore leaves every existing table unchanged', async () => {
  await importDataJSON(JSON.stringify(fixture('backup-v4')));
  const before = await snapshot();
  const invalid = fixture('backup-v4'); invalid.accountTransfers[0].toAccountId = 'missing';
  await assert.rejects(importDataJSON(JSON.stringify(invalid)));
  assert.deepEqual(await snapshot(), before);
});

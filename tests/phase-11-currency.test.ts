import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import Dexie from 'dexie';
import { db, GlitchBudgetDB, type Account } from '../src/lib/db';
import { addAccount, ensureCashAccount, saveTransfer } from '../src/lib/accounts';
import { setBaseCurrency } from '../src/lib/currency-service';
import { saveExpense, saveIncome } from '../src/lib/transaction-service';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { importIncomesCSV } from '../src/lib/csv-backup';
import { seedTestCategories } from './category-fixture';
import { localDate } from '../src/lib/finance-calculations';

const today = localDate();
const settings = {
  id:'general' as const,
  theme:'light' as const,
  preventNegativeAccountBalance:true,
  budgetOverspendingBehavior:'allow' as const,
  rolloverStrategy:'reset' as const,
  periodStartDay:1,
  baseIncome:{freq:'mensual' as const,amount:0},
  savePct:0,
  currency:'DOP',
  locale:'es-DO',
};

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
  await db.settings.put(settings);
  await seedTestCategories();
});
after(() => db.close());

test('base currency can change only while financial amounts are pristine', async () => {
  const cash = await ensureCashAccount(today);
  assert.equal(cash.currency, 'DOP');

  assert.equal(await setBaseCurrency('usd'), 'USD');
  assert.equal((await db.settings.get('general'))?.currency, 'USD');
  assert.equal((await db.accounts.get(cash.id))?.currency, 'USD');

  await db.accounts.update(cash.id, { openingBalance:100 });
  await assert.rejects(setBaseCurrency('EUR'), /no se puede cambiar la moneda base/i);
  assert.equal((await db.settings.get('general'))?.currency, 'USD');
});

test('new accounts are explicit base-currency accounts and foreign accounts are rejected for now', async () => {
  await setBaseCurrency('USD');
  const bank: Account = { id:'bank', name:'Banco', type:'bank', currency:'USD', openingBalance:0, startDate:today };
  await addAccount(bank);
  assert.equal((await db.accounts.get('bank'))?.currency, 'USD');

  await assert.rejects(addAccount({ ...bank, id:'foreign', currency:'EUR' }), /conversión manual/);
  assert.equal(await db.accounts.get('foreign'), undefined);
});

test('account movements inherit the account/base currency and store a 1:1 base amount', async () => {
  const cash = await ensureCashAccount(today);
  await saveIncome({ id:'income', type:'extra', description:'Cobro', amount:10, date:today, categoryId:'salary', accountId:cash.id });
  await saveExpense({ id:'expense', nature:'Variable', concept:'Compra', amount:3, date:today, categoryId:'food', accountId:cash.id });

  const income = await db.incomes.get('income');
  const expense = await db.expenses.get('expense');
  assert.deepEqual({currency:income?.currency,fxRate:income?.fxRate,amountBase:income?.amountBase}, {currency:'DOP',fxRate:1,amountBase:1000});
  assert.deepEqual({currency:expense?.currency,fxRate:expense?.fxRate,amountBase:expense?.amountBase}, {currency:'DOP',fxRate:1,amountBase:300});
});

test('cross-currency transfers are blocked before any balances are mutated', async () => {
  await db.accounts.bulkAdd([
    { id:'dop', name:'DOP', type:'bank', currency:'DOP', openingBalance:1000, startDate:today },
    { id:'usd', name:'USD', type:'bank', currency:'USD', openingBalance:0, startDate:today },
  ]);
  await assert.rejects(saveTransfer({id:'x',fromAccountId:'dop',toAccountId:'usd',amount:100,date:today,note:''}), /tasa manual/);
  assert.equal(await db.account_transfers.count(), 0);
});

test('Dexie v12 upgrades direct account balances and movements to the configured base currency', async () => {
  const name = 'phase11-migration-' + crypto.randomUUID();
  const schema = Object.fromEntries(db.tables.filter(table => table.name !== 'investments').map(table => [table.name, [table.schema.primKey.src, ...table.schema.indexes.map(index => index.src)].join(',')]));
  const old = new Dexie(name);
  old.version(12).stores(schema);
  await old.table('settings').put(settings);
  await old.table('accounts').put({id:'legacy-cash',name:'Efectivo',type:'cash',openingBalance:12345,startDate:today,isDefaultCash:true});
  await old.table('incomes').put({id:'legacy-income',type:'extra',description:'Anterior',amount:500,date:today,month:today.slice(0,7),categoryId:'salary',accountId:'legacy-cash'});
  old.close();

  const current = new GlitchBudgetDB(name);
  try {
    await current.open();
    assert.equal(current.verno, 14);
    assert.equal((await current.accounts.get('legacy-cash'))?.currency, 'DOP');
    assert.deepEqual(
      (({currency,fxRate,amountBase}) => ({currency,fxRate,amountBase}))((await current.incomes.get('legacy-income'))!),
      {currency:'DOP',fxRate:1,amountBase:500},
    );
  } finally {
    await current.delete();
  }
});

test('legacy v8 backups import as base currency and re-export with the current v13 contract', async () => {
  const cash = await ensureCashAccount(today);
  await saveIncome({ id:'income', type:'extra', description:'Cobro', amount:10, date:today, categoryId:'salary', accountId:cash.id });
  const legacy = JSON.parse(await exportDataJSON());
  legacy.v = 8;
  for (const account of legacy.accounts) delete account.currency;
  for (const row of [...legacy.incomes, ...legacy.expenses, ...legacy.debtPayments]) {
    delete row.currency; delete row.fxRate; delete row.amountBase;
  }

  await importDataJSON(JSON.stringify(legacy));
  assert.equal((await db.accounts.get(cash.id))?.currency, 'DOP');
  const exported = JSON.parse(await exportDataJSON());
  assert.equal(exported.v,13);
  assert.equal(exported.accounts[0].currency, 'DOP');
  assert.deepEqual(
    {currency:exported.incomes[0].currency,fxRate:exported.incomes[0].fxRate,amountBase:exported.incomes[0].amountBase},
    {currency:'DOP',fxRate:1,amountBase:1000},
  );
});


test('migration uses the configured base currency rather than hard-coding DOP', async () => {
  const name = 'phase11-usd-migration-' + crypto.randomUUID();
  const schema = Object.fromEntries(db.tables.filter(table => table.name !== 'investments').map(table => [table.name, [table.schema.primKey.src, ...table.schema.indexes.map(index => index.src)].join(',')]));
  const old = new Dexie(name);
  old.version(12).stores(schema);
  await old.table('settings').put({ ...settings, currency:'USD' });
  await old.table('accounts').put({id:'legacy-bank',name:'Banco',type:'bank',openingBalance:5000,startDate:today});
  await old.table('expenses').put({id:'legacy-expense',nature:'Variable',concept:'Compra',amount:250,date:today,month:today.slice(0,7),categoryId:'food',accountId:'legacy-bank'});
  old.close();

  const current = new GlitchBudgetDB(name);
  try {
    await current.open();
    assert.equal((await current.accounts.get('legacy-bank'))?.currency, 'USD');
    assert.deepEqual(
      (({currency,fxRate,amountBase}) => ({currency,fxRate,amountBase}))((await current.expenses.get('legacy-expense'))!),
      {currency:'USD',fxRate:1,amountBase:250},
    );
  } finally {
    await current.delete();
  }
});

test('CSV imports cannot smuggle a different currency into a base-currency account', async () => {
  const cash = await ensureCashAccount(today);
  const csv = [
    'id,month,date,categoryId,amount,description,type,currency,fxRate,amountBase,accountId,recurringRuleId',
    `csv-income,${today.slice(0,7)},${today},salary,1234,Cobro,extra,USD,60,74040,${cash.id},`,
  ].join('\n');
  await importIncomesCSV(new File([csv], 'income.csv'));
  const row = await db.incomes.get('csv-income');
  assert.deepEqual(
    {currency:row?.currency,fxRate:row?.fxRate,amountBase:row?.amountBase},
    {currency:'DOP',fxRate:1,amountBase:1234},
  );
});

test('v9 restore rejects foreign-currency accounts until manual conversion exists', async () => {
  const cash = await ensureCashAccount(today);
  const backup = JSON.parse(await exportDataJSON());
  backup.accounts = backup.accounts.map((account: any) => account.id === cash.id ? { ...account, currency:'USD' } : account);
  await assert.rejects(importDataJSON(JSON.stringify(backup)), /conversión manual/);
  assert.equal((await db.accounts.get(cash.id))?.currency, 'DOP');
});

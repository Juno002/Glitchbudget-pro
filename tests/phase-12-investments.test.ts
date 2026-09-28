import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import Dexie from 'dexie';
import { db, GlitchBudgetDB, type Investment } from '../src/lib/db';
import { createInvestment } from '../src/lib/investments';
import { investmentProjection } from '../src/domain/investments';
import { accountBalance, readAccountSnapshot, saveTransfer } from '../src/lib/accounts';
import { selectPosition } from '../src/domain/ledger';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { localDate } from '../src/lib/finance-calculations';

const today = localDate();
const settings = {
  id:'general' as const,
  theme:'dark' as const,
  strictMode:true,
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
});
after(() => db.close());

test('local projection calculates elapsed time, maturity value and interest without mutating principal', () => {
  const investment: Investment = {
    id:'i', accountId:'a', type:'certificate', name:'Certificado',
    openedAt:'2026-01-01', maturityDate:'2027-01-01',
    principal:100_000, annualRate:0.12, compoundingMethod:'simple', status:'active',
  };
  const result = investmentProjection(investment,'2026-07-02');
  assert.ok(result.elapsedPercentage !== null && result.elapsedPercentage > 49 && result.elapsedPercentage < 51);
  assert.equal(result.daysRemaining,183);
  assert.equal(result.estimatedMaturityValue,112_000);
  assert.equal(result.estimatedInterest,12_000);
  assert.equal(investment.principal,100_000);
});

test('new investment is funded by an internal transfer and leaves net worth unchanged', async () => {
  await db.accounts.add({id:'bank',name:'Banco',type:'bank',currency:'DOP',openingBalance:100_000,startDate:today});
  const before = selectPosition(await db.accounts.toArray(),[],await readAccountSnapshot(),today);
  const investment = await createInvestment({
    mode:'new', type:'certificate', name:'Certificado nuevo', openedAt:today,
    principal:50_000, sourceAccountId:'bank', annualRate:0.08, compoundingMethod:'monthly',
  });
  const accounts = await db.accounts.toArray();
  const snapshot = await readAccountSnapshot();
  const source = accounts.find(a=>a.id==='bank')!;
  const asset = accounts.find(a=>a.id===investment.accountId)!;
  const after = selectPosition(accounts,[],snapshot,today);

  assert.equal(source.type,'bank');
  assert.equal(asset.type,'investment');
  assert.equal(accountBalance(source,snapshot,today),50_000);
  assert.equal(accountBalance(asset,snapshot,today),50_000);
  assert.equal(after.liquidAssets,50_000);
  assert.equal(after.investmentAssets,50_000);
  assert.equal(after.netWorth,before.netWorth);
  assert.equal(await db.account_transfers.count(),1);
  assert.equal(await db.expenses.count(),0);
  assert.equal(await db.incomes.count(),0);
});

test('existing investment uses current tracked value as opening balance without inventing income or transfer', async () => {
  const investment = await createInvestment({
    mode:'existing', type:'term_deposit', name:'Depósito existente',
    openedAt:'2026-01-01', principal:50_000, currentTrackedValue:53_500,
    annualRate:0.07, compoundingMethod:'simple',
  });
  const account = (await db.accounts.get(investment.accountId))!;
  assert.equal(account.startDate,today);
  assert.equal(account.openingBalance,53_500);
  assert.equal(await db.account_transfers.count(),0);
  assert.equal(await db.incomes.count(),0);
  const position = selectPosition(await db.accounts.toArray(),[],await readAccountSnapshot(),today);
  assert.equal(position.liquidAssets,0);
  assert.equal(position.investmentAssets,53_500);
  assert.equal(position.netWorth,53_500);
});

test('estimated interest never enters real net worth', async () => {
  const investment = await createInvestment({
    mode:'existing', type:'known_yield', name:'Rendimiento conocido',
    openedAt:'2026-01-01', maturityDate:'2027-01-01',
    principal:100_000, currentTrackedValue:100_000,
    annualRate:0.20, compoundingMethod:'annually',
  });
  const projected = investmentProjection(investment,'2026-06-01');
  assert.ok((projected.estimatedMaturityValue ?? 0) > 100_000);
  const position = selectPosition(await db.accounts.toArray(),[],await readAccountSnapshot(),today);
  assert.equal(position.netWorth,100_000);
});

test('failed funding rolls back investment, account and transfer together', async () => {
  await db.accounts.add({id:'bank',name:'Banco',type:'bank',currency:'DOP',openingBalance:10_000,startDate:today});
  await assert.rejects(createInvestment({
    mode:'new', type:'certificate', name:'Demasiado grande', openedAt:today,
    principal:50_000, sourceAccountId:'bank',
  }), /saldo insuficiente/i);
  assert.equal(await db.investments.count(),0);
  assert.equal((await db.accounts.toArray()).filter(a=>a.type==='investment').length,0);
  assert.equal(await db.account_transfers.count(),0);
  assert.equal((await db.accounts.get('bank'))?.openingBalance,10_000);
});

test('generic transfers cannot bypass the Investments 1.0 lifecycle', async () => {
  await db.accounts.bulkAdd([
    {id:'bank',name:'Banco',type:'bank',currency:'DOP',openingBalance:100_000,startDate:today},
    {id:'investment',name:'Activo',type:'investment',currency:'DOP',openingBalance:50_000,startDate:today},
  ]);
  await assert.rejects(saveTransfer({id:'out',fromAccountId:'investment',toAccountId:'bank',amount:100,date:today,note:''}), /Investments 1\.1/);
  await assert.rejects(saveTransfer({id:'in',fromAccountId:'bank',toAccountId:'investment',amount:100,date:today,note:''}), /Investments 1\.0/);
  assert.equal(await db.account_transfers.count(),0);
});

test('Dexie v13 upgrades to v14 by adding an empty investment store without rewriting accounts', async () => {
  const name='phase12-migration-'+crypto.randomUUID();
  const schema = Object.fromEntries(db.tables.filter(t=>t.name!=='investments').map(table => [
    table.name,[table.schema.primKey.src,...table.schema.indexes.map(index=>index.src)].join(',')
  ]));
  const old = new Dexie(name);
  old.version(13).stores(schema);
  await old.table('settings').put(settings);
  const account={id:'bank',name:'Banco',type:'bank',currency:'DOP',openingBalance:12_345,startDate:today};
  await old.table('accounts').put(account);
  old.close();

  const current=new GlitchBudgetDB(name);
  try {
    await current.open();
    assert.equal(current.verno,14);
    assert.deepEqual(await current.accounts.get('bank'),account);
    assert.equal(await current.investments.count(),0);
  } finally {
    await current.delete();
  }
});

test('backup v10 round-trips investments and legacy v9 still imports with no invented investments', async () => {
  await createInvestment({
    mode:'existing', type:'certificate', name:'Backup',
    openedAt:'2026-01-01', maturityDate:'2026-12-31',
    principal:25_000, currentTrackedValue:26_000, annualRate:0.06,
  });
  const text=await exportDataJSON();
  const dump=JSON.parse(text);
  assert.equal(dump.v,10);
  assert.equal(dump.investments.length,1);
  await importDataJSON(text);
  assert.equal(await db.investments.count(),1);
  assert.equal((await db.accounts.toArray()).filter(a=>a.type==='investment').length,1);

  await db.transaction('rw',db.tables,async()=>{for(const table of db.tables) await table.clear();});
  await db.settings.put(settings);
  await db.accounts.add({id:'cash',name:'Efectivo',type:'cash',currency:'DOP',openingBalance:0,startDate:today,isDefaultCash:true});
  const legacy=JSON.parse(await exportDataJSON());
  legacy.v=9;
  delete legacy.investments;
  await importDataJSON(JSON.stringify(legacy));
  assert.equal(await db.investments.count(),0);
  assert.equal((await db.accounts.toArray()).some(a=>a.type==='investment'),false);
});

test('backup rejects an investment account without matching metadata atomically', async () => {
  await db.accounts.add({id:'cash',name:'Efectivo',type:'cash',currency:'DOP',openingBalance:1_000,startDate:today,isDefaultCash:true});
  const safe=await exportDataJSON();
  const bad=JSON.parse(safe);
  bad.accounts.push({id:'orphan-investment',name:'Huérfana',type:'investment',currency:'DOP',openingBalance:500,startDate:today});
  const before=await db.accounts.toArray();
  await assert.rejects(importDataJSON(JSON.stringify(bad)),/sin metadatos/);
  assert.deepEqual(await db.accounts.toArray(),before);
});

import 'fake-indexeddb/auto';
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import Dexie from 'dexie';
import { db, GlitchBudgetDB, type Account } from '../src/lib/db';
import { accountBalance, addAccount, readAccountSnapshot, saveTransfer, debtBalance, reconcileDebt, ensureCashAccount, accountPosition } from '../src/lib/accounts';
import { saveIncome, saveExpense, saveDebtPayment, removeIncome } from '../src/lib/transaction-service';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { localDate, calculateRecordedTotals, recordedCategories } from '../src/lib/finance-calculations';
const today = localDate();
const bank: Account = { id:'bank', name:'Banco', type:'bank', openingBalance:100_000, startDate:today };
const cash: Account = { id:'cash', name:'Efectivo', type:'cash', openingBalance:0, startDate:today };
beforeEach(async()=>{
  await db.transaction('rw',db.tables,async()=>{for(const t of db.tables)await t.clear();});
  await db.settings.put({id:'general',theme:'light',strictMode:true,rolloverStrategy:'reset',baseIncome:{freq:'mensual',amount:0},savePct:0,currency:'DOP',locale:'es-DO',incomeCategories:['salary'],expenseCategories:['food']});
  await addAccount(bank);await addAccount(cash);
});
after(()=>db.close());
test('deleting spent income is rejected atomically in strict mode',async()=>{
  await saveIncome({id:'i',date:today,amount:100,categoryId:'salary',description:'Cobro',type:'extra',accountId:'cash'});
  await saveExpense({id:'e',date:today,amount:100,categoryId:'food',concept:'Compra',type:'Variable',accountId:'cash'});
  await assert.rejects(removeIncome('i'),/Saldo insuficiente/);
  assert.ok(await db.incomes.get('i'));
  assert.equal(accountBalance(cash,await readAccountSnapshot()),0);
});
test('unspent income can be deleted and non-strict correction may leave a negative balance',async()=>{
  await saveIncome({id:'i',date:today,amount:100,categoryId:'salary',description:'Cobro',type:'extra',accountId:'cash'});
  await removeIncome('i');
  assert.equal(await db.incomes.count(),0);
  await saveIncome({id:'i',date:today,amount:100,categoryId:'salary',description:'Cobro',type:'extra',accountId:'cash'});
  await saveExpense({id:'e',date:today,amount:100,categoryId:'food',concept:'Compra',type:'Variable',accountId:'cash'});
  await db.settings.update('general',{strictMode:false});
  await removeIncome('i');
  assert.equal(accountBalance(cash,await readAccountSnapshot()),-10_000);
});
test('opening balance corrections respect funds already spent in strict mode',async()=>{
  await saveExpense({id:'e',date:today,amount:800,categoryId:'food',concept:'Compra',type:'Variable',accountId:'bank'});
  await assert.rejects(addAccount({...bank,openingBalance:50_000},true),/Saldo insuficiente/);
  assert.equal((await db.accounts.get('bank'))?.openingBalance,100_000);
  await addAccount({...bank,name:'Banco corregido',openingBalance:90_000},true);
  assert.equal(accountBalance((await db.accounts.get('bank'))!,await readAccountSnapshot()),10_000);
});
test('backdated spending cannot consume funds needed by a later recorded expense',async()=>{
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
  const later=localDate(tomorrow);
  await saveExpense({id:'later',date:later,amount:800,categoryId:'food',concept:'Compra posterior',type:'Variable',accountId:'bank'});
  await assert.rejects(saveExpense({id:'earlier',date:today,amount:300,categoryId:'food',concept:'Compra anterior',type:'Variable',accountId:'bank'}),/Saldo insuficiente/);
  assert.equal(await db.expenses.count(),1);
});
test('editing an income cannot remove funds already spent in strict mode',async()=>{
  const income={id:'i',date:today,amount:100,categoryId:'salary',description:'Cobro',type:'extra' as const,accountId:'cash'};
  await saveIncome(income);
  await saveExpense({id:'spent',date:today,amount:100,categoryId:'food',concept:'Compra',type:'Variable',accountId:'cash'});
  await assert.rejects(saveIncome({...income,accountId:'bank'},true),/Saldo insuficiente/);
  assert.equal((await db.incomes.get('i'))?.accountId,'cash');
});
const transfer = {id:'t',fromAccountId:'bank',toAccountId:'cash',amount:30_000,date:today,note:'Retiro'};
test('withdrawal moves money to cash without creating income or expense',async()=>{
  await saveTransfer(transfer);
  const data=await readAccountSnapshot();
  assert.equal(accountBalance(bank,data),70_000);assert.equal(accountBalance(cash,data),30_000);
  assert.equal(await db.incomes.count(),0);assert.equal(await db.expenses.count(),0);
});
test('legacy same-day records and budget projections do not change starting balances',async()=>{
  await db.incomes.add({id:'old',date:today,month:today.slice(0,7),amount:900_000,type:'extra',description:'Anterior',categoryId:'salary'});
  await db.settings.update('general',{baseIncome:{freq:'mensual',amount:900_000}});
  assert.equal(accountBalance(bank,await readAccountSnapshot()),100_000);
});
test('account spending uses opening cash even when monthly projected income is zero',async()=>{
  await saveExpense({id:'e',date:today,amount:100,categoryId:'food',concept:'Compra',type:'Fijo',accountId:'bank'});
  assert.equal(accountBalance(bank,await readAccountSnapshot()),90_000);
});
test('income defaults to cash and an explicit correction moves it only once',async()=>{
  const income={id:'i',date:today,amount:100,categoryId:'salary',description:'Cobro',type:'extra' as const,accountId:'bank'};
  await saveIncome(income);assert.equal((await db.incomes.get('i'))?.accountId,'cash');
  await saveIncome(income,true);
  const data=await readAccountSnapshot();assert.equal(accountBalance(bank,data),110_000);assert.equal(accountBalance(cash,data),0);
});
test('income is immediately spendable from default cash',async()=>{
  await saveIncome({id:'i',date:today,amount:100,categoryId:'salary',description:'Cobro',type:'extra'});
  await saveExpense({id:'e',date:today,amount:40,categoryId:'food',concept:'Compra',type:'Variable'});
  assert.equal((await db.expenses.get('e'))?.accountId,'cash');assert.equal(accountBalance(cash,await readAccountSnapshot()),6000);
});
test('concurrent transfer and spending cannot overdraw a strict account',async()=>{
  const results=await Promise.allSettled([saveTransfer({...transfer,amount:80_000}),saveExpense({id:'e',date:today,amount:800,categoryId:'food',concept:'Compra',type:'Variable',accountId:'bank'})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.ok(accountBalance(bank,await readAccountSnapshot())>=0);
});
test('self transfers and transfers above available funds are rejected atomically',async()=>{
  await assert.rejects(saveTransfer({...transfer,toAccountId:'bank'}));
  await assert.rejects(saveTransfer({...transfer,amount:100_001}));
  assert.equal(await db.account_transfers.count(),0);
});
test('card purchase does not debit bank; payment reduces both bank and debt',async()=>{
  await db.debts.add({id:'card',name:'Tarjeta',type:'credit_card',principal:500_000,apr:0,minPayment:0,createdAt:new Date().toISOString(),status:'active'});
  await saveExpense({id:'e',date:today,amount:100,categoryId:'food',concept:'Compra',type:'Variable',paymentMethod:'credit',debtId:'card',accountId:'bank'});
  assert.equal((await db.expenses.get('e'))?.accountId,undefined);
  await reconcileDebt('card',50_000);
  await saveDebtPayment({id:'p',date:today,amount:20_000,debtId:'card',accountId:'bank'});
  const data=await readAccountSnapshot();
  assert.equal(accountBalance(bank,data),80_000);
  assert.equal(debtBalance((await db.debts.get('card'))!,data.expenses,data.payments),30_000);
  assert.equal(data.expenses.length,1);
});
test('v4 backup preserves accounts, movements and transfers',async()=>{
  await saveTransfer(transfer);
  await saveIncome({id:'i',date:today,amount:100,categoryId:'salary',description:'Cobro',type:'extra',accountId:'bank'});
  const backup=await exportDataJSON();assert.equal(JSON.parse(backup).v,4);
  await importDataJSON(backup);
  assert.equal(await db.accounts.count(),2);assert.equal(await db.account_transfers.count(),1);
  const data=await readAccountSnapshot();assert.equal(accountBalance(bank,data),70_000);assert.equal(accountBalance(cash,data),40_000);
  assert.equal((await db.accounts.get("cash"))?.isDefaultCash,true);
});
test('orphan account references in backup fail without replacing data',async()=>{
  await saveTransfer(transfer);const backup=JSON.parse(await exportDataJSON());backup.accounts=[];
  await assert.rejects(importDataJSON(JSON.stringify(backup)),/transferencia/);
  assert.equal(await db.accounts.count(),2);assert.equal(await db.account_transfers.count(),1);
});

test('editing a transfer cannot remove money already spent at its destination',async()=>{
  await saveTransfer(transfer);
  await saveExpense({id:'spent',date:today,amount:300,categoryId:'food',concept:'Compra',type:'Variable',accountId:'cash'});
  await assert.rejects(saveTransfer({...transfer,amount:10_000},true),/saldo/);
  assert.equal((await db.account_transfers.get('t'))?.amount,30_000);
});
test('editing a transfer recalculates both balances without creating duplicate entries',async()=>{
  await saveTransfer(transfer);await saveTransfer({...transfer,amount:20_000},true);
  const data=await readAccountSnapshot();assert.equal(accountBalance(bank,data),80_000);assert.equal(accountBalance(cash,data),20_000);
  assert.equal(data.transfers.length,1);
});
test('account backup preserves expenses, payments and reconciled card debt',async()=>{
  await db.debts.add({id:'card',name:'Tarjeta',type:'credit_card',principal:500_000,apr:0,minPayment:0,createdAt:new Date().toISOString(),status:'active'});
  await reconcileDebt('card',50_000);
  await saveExpense({id:'e',date:today,amount:100,categoryId:'food',concept:'Compra',type:'Variable',accountId:'bank'});
  await saveDebtPayment({id:'p',date:today,amount:20_000,debtId:'card',accountId:'bank'});
  await importDataJSON(await exportDataJSON());
  const data=await readAccountSnapshot();assert.equal(accountBalance(bank,data),70_000);
  assert.equal(debtBalance((await db.debts.get('card'))!,data.expenses,data.payments),30_000);
});

test('version 7 migration preserves old records without assigning them to new accounts',async()=>{
  const name='accounts-migration-test';
  const old=new Dexie(name);
  old.version(7).stores({expenses:'id, date, month, categoryId, type',incomes:'id, date, month, categoryId, type',goals:'id, status',goal_contributions:'id, goalId, date',plans:'[month+categoryId], month, categoryId',settings:'id',periods:'id, year, month',recurrents:'id, type, categoryId, freq, active, startDate, endDate',debts:'id, status, type, createdAt',debt_payments:'id, debtId, date',fxRates:'id, base, quote, updatedAt'});
  await old.table('incomes').add({id:'legacy',date:today,month:today.slice(0,7),amount:12345,type:'extra',description:'Historial',categoryId:'salary'});
  old.close();
  const migrated=new GlitchBudgetDB(name);
  try {
    assert.equal((await migrated.incomes.get('legacy'))?.amount,12345);
    assert.equal((await migrated.incomes.get('legacy'))?.accountId,undefined);
    assert.equal(await migrated.accounts.count(),0);
    assert.equal(await migrated.account_transfers.count(),0);
  } finally {await migrated.delete();}
});

test('concurrent initialization creates only one cash account',async()=>{
  await db.accounts.clear();const results=await Promise.all([ensureCashAccount(),ensureCashAccount(),ensureCashAccount()]);
  assert.equal(new Set(results.map(a=>a.id)).size,1);assert.equal(await db.accounts.count(),1);
});
test('existing cash balance is preserved and cannot become a bank',async()=>{
  await db.accounts.update('cash',{openingBalance:12345});const account=await ensureCashAccount();
  assert.equal(account.id,'cash');assert.equal(account.openingBalance,12345);await assert.rejects(addAccount({...account,type:'bank'},true));
});
test('salary, deposit, withdrawal, credit purchase and payment conserve money',async()=>{
  await saveIncome({id:'salary',date:today,amount:1000,categoryId:'salary',description:'Quincena',type:'extra'});
  await saveTransfer({id:'deposit',fromAccountId:'cash',toAccountId:'bank',amount:60000,date:today,note:''});
  await saveTransfer({id:'withdraw',fromAccountId:'bank',toAccountId:'cash',amount:10000,date:today,note:''});
  await db.debts.add({id:'card',name:'Visa',type:'credit_card',principal:100000,apr:0,minPayment:0,createdAt:new Date().toISOString(),status:'active'});
  await saveExpense({id:'purchase',date:today,amount:200,categoryId:'food',concept:'Compra',type:'Variable',paymentMethod:'credit',debtId:'card'});
  assert.equal(accountBalance(cash,await readAccountSnapshot()),50000);
  await saveDebtPayment({id:'pay',date:today,amount:20000,debtId:'card'});
  const data=await readAccountSnapshot();assert.equal(accountBalance(cash,data),30000);assert.equal(accountBalance(bank,data),150000);
  assert.equal(debtBalance((await db.debts.get('card'))!,data.expenses,data.payments),0);
  await assert.rejects(saveIncome({id:'salary',date:today,amount:1000,categoryId:'salary',description:'Duplicado',type:'extra'}));
  assert.equal(accountBalance(cash,await readAccountSnapshot()),30000);
});

test('account balances, monthly indicators and charts reconcile through the complete money cycle',async()=>{
  const month=today.slice(0,7);
  const report=async()=>{
    const snapshot=await readAccountSnapshot();
    const totals=calculateRecordedTotals({ settings:(await db.settings.get('general'))!, incomes:snapshot.incomes, expenses:snapshot.expenses, debtPayments:snapshot.payments, budgets:[], goalContributions:[] },month);
    assert.equal(recordedCategories(snapshot.incomes,month).reduce((s,r)=>s+r.value,0),totals.totalIncome);
    assert.equal(recordedCategories(snapshot.expenses,month).reduce((s,r)=>s+r.value,0),totals.totalExpenses);
    return { totals, position:accountPosition(await db.accounts.toArray(),await db.debts.toArray(),snapshot) };
  };
  await db.settings.update('general',{baseIncome:{freq:'quincenal',amount:50000}});
  assert.equal((await report()).totals.totalIncome,0);
  assert.equal((await report()).position.liquid,100000);
  await saveIncome({id:'salary',date:today,amount:500,categoryId:'salary',description:'Quincena',type:'extra'});
  await saveTransfer({id:'deposit',fromAccountId:'cash',toAccountId:'bank',amount:20000,date:today,note:''});
  assert.equal((await report()).totals.totalIncome,50000);
  assert.equal((await report()).position.liquid,150000);
  await db.debts.add({id:'card',name:'Visa',type:'credit_card',principal:100000,apr:0,minPayment:0,createdAt:new Date().toISOString(),status:'active'});
  await saveExpense({id:'credit',date:today,amount:100,categoryId:'food',concept:'Compra',type:'Variable',paymentMethod:'credit',debtId:'card'});
  let r=await report();assert.equal(r.totals.totalExpenses,10000);assert.equal(r.position.owed,10000);assert.equal(r.position.net,140000);
  await saveDebtPayment({id:'payment',date:today,amount:10000,debtId:'card'});
  r=await report();assert.equal(r.totals.totalExpenses,10000);assert.equal(r.totals.totalDebtPayments,10000);assert.equal(r.totals.cashFlow,40000);assert.equal(r.position.net,140000);assert.equal(r.position.owed,0);assert.equal(r.position.liquid,140000);
  const before=await report();await importDataJSON(await exportDataJSON());assert.deepEqual(await report(),before);
});

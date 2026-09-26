import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, beforeEach, test } from 'node:test';
import Dexie from 'dexie';
import { db, GlitchBudgetDB } from '../src/lib/db';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { saveExpense, saveIncome } from '../src/lib/transaction-service';
import { saveRecurringRule, removeRecurringRule } from '../src/lib/recurring-rule-service';
import { reconstructCategories } from '../src/domain/categories';
import { migrateActualExpense, migrateRecurringRule } from '../src/domain/actual-planned-migration';
import { selectMonthlyMetrics } from '../src/domain/metrics';
import { selectPosition } from '../src/domain/ledger';
import { importExpensesCSV } from '../src/lib/csv-backup';
import type { RecurringRule } from '../src/domain/models';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/backup-v4.json', import.meta.url), 'utf8'));
const schema = JSON.parse(readFileSync(new URL('./fixtures/dexie-v7.json', import.meta.url), 'utf8')).schema;
const clean = (value: unknown) => JSON.parse(JSON.stringify(value));
const snapshot = async (database: GlitchBudgetDB = db): Promise<Record<string, any[]>> =>
  database.transaction('r', database.tables, async () =>
    Object.fromEntries(await Promise.all(database.tables.map(async table => [table.name, await table.toArray()]))) as Record<string, any[]>);
function metrics(data: Record<string, any[]>) {
  const financial = { settings:data.settings[0], incomes:data.incomes, expenses:data.expenses, budgets:data.plans, goalContributions:data.goal_contributions, debtPayments:data.debt_payments };
  return {
    position:selectPosition(data.accounts,data.debts,{ incomes:data.incomes, expenses:data.expenses, payments:data.debt_payments, transfers:data.account_transfers },'2026-10-31'),
    september:selectMonthlyMetrics(financial,'2026-09'), october:selectMonthlyMetrics(financial,'2026-10'),
  };
}
const rule = (id='phase5-rule', cadence:RecurringRule['cadence']='monthly'):RecurringRule => ({ id,direction:'expense',title:'Alquiler',categoryId:'food',amount:5000,cadence,startDate:'2026-09-01',active:true });
const expense = { id:'payment',date:'2026-09-10',categoryId:'food',amount:50,concept:'Pago real',nature:'Fijo' as const,accountId:'cash' };
beforeEach(async()=>{ await importDataJSON(JSON.stringify(fixture)); });
after(()=>db.close());

test('v9 -> v10 preserves every financial field and metric, removes frequency and creates no rules',async()=>{
  const data=await snapshot();
  data.expenses=data.expenses.map((row: any,index: number)=>{const {nature,recurringRuleId,...rest}=row;return {...rest,type:index?'Variable':'Fijo',frequency:'mensual',...(index?{recurringId:'removed-rule'}:{})};});
  data.expenses.push({...data.expenses[0],id:'occasional',type:'Ocasional',frequency:'semanal',amount:1});
  data.recurrents=data.recurrents.map(({direction,cadence,...rest}: any)=>({...rest,type:direction,freq:cadence}));
  const before=metrics(data);const name='phase5-migration-'+crypto.randomUUID();const old=new Dexie(name);
  old.version(9).stores({...schema,accounts:'id, type',account_transfers:'id, fromAccountId, toAccountId, date',categories:'id, type'});
  for(const [table,rows] of Object.entries(data)) await old.table(table).bulkAdd(rows);
  old.close();const current=new GlitchBudgetDB(name);
  try{
    await current.open();assert.equal(current.verno,10);const migrated=await snapshot(current);
    assert.deepEqual(metrics(migrated),before);
    assert.deepEqual(clean(migrated.expenses),clean(data.expenses.map(migrateActualExpense)));
    assert.deepEqual(clean(migrated.recurrents),clean(data.recurrents.map(migrateRecurringRule)));
    for(const table of Object.keys(data).filter(t=>!['expenses','recurrents'].includes(t))) assert.deepEqual(migrated[table],data[table],table);
    assert.equal(migrated.expenses.find((e: any)=>e.recurringRuleId)?.recurringRuleId,'removed-rule');
  }finally{await current.delete();}
});

test('invalid v9 nature aborts migration without partially rewriting expenses or rules',async()=>{
  const name='phase5-rollback-'+crypto.randomUUID();const old=new Dexie(name);
  old.version(9).stores({...schema,accounts:'id, type',account_transfers:'id, fromAccountId, toAccountId, date',categories:'id, type'});
  await old.table('expenses').bulkAdd([{...fixture.expenses[0],id:'a'}, {...fixture.expenses[0],id:'b',type:'invalid'}]);
  const before=await old.table('expenses').toArray();old.close();const current=new GlitchBudgetDB(name);
  await assert.rejects(current.open(),/Naturaleza/);current.close();const check=new Dexie(name);
  try{await check.open();assert.equal(check.verno,9);assert.deepEqual(await check.table('expenses').toArray(),before);}finally{await check.delete();}
});

test('fixed actual counts once and creates neither a rule nor a future transaction',async()=>{
  const before=await snapshot();await saveExpense(expense);const after=await snapshot();
  assert.equal(metrics(after).september.spending-metrics(before).september.spending,5000);
  assert.equal(metrics(after).october.spending,metrics(before).october.spending);
  assert.deepEqual(after.recurrents,before.recurrents);
  const actual=await db.expenses.get(expense.id);assert.equal(actual?.nature,'Fijo');assert.ok(!('frequency' in actual!)&&!('type' in actual!));
});

test('rule create/edit/activate/deactivate/delete leaves actual money and history unchanged',async()=>{
  const before=await snapshot();const expected=metrics(before);let r=rule();
  await saveRecurringRule(r);assert.deepEqual(metrics(await snapshot()),expected);
  for(const patch of [{amount:9900,title:'Editada'},{active:false},{active:true}]){r={...r,...patch};await saveRecurringRule(r,true);assert.deepEqual(metrics(await snapshot()),expected);}
  await removeRecurringRule(r.id);const after=await snapshot();assert.deepEqual(metrics(after),expected);assert.deepEqual(after.expenses,before.expenses);assert.deepEqual(after.incomes,before.incomes);
});

test('explicit payment changes metrics once; later edits/removal of its rule preserve actual provenance',async()=>{
  const r=rule();await saveRecurringRule(r);const before=metrics(await snapshot());
  const results=await Promise.allSettled([saveExpense({...expense,recurringRuleId:r.id}),saveExpense({...expense,id:'double',recurringRuleId:r.id})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const actual=(await db.expenses.filter(e=>e.recurringRuleId===r.id).toArray())[0];const after=metrics(await snapshot());
  assert.equal(after.september.spending-before.september.spending,5000);assert.equal(after.position.liquidAssets-before.position.liquidAssets,-5000);assert.equal(after.september.cashFlow-before.september.cashFlow,-5000);
  await saveRecurringRule({...r,title:'Otro importe',amount:25000,active:false},true);assert.deepEqual(await db.expenses.get(actual.id),actual);
  await removeRecurringRule(r.id);assert.deepEqual(await db.expenses.get(actual.id),actual);assert.deepEqual(metrics(await snapshot()),after);
  await saveExpense({...actual,amount:actual.amount/100,concept:'Corrección histórica'},true);assert.equal((await db.expenses.get(actual.id))?.recurringRuleId,r.id);
});

test('monthly compatibility guard does not limit weekly/biweekly rules to one payment per month',async()=>{
  for(const cadence of ['weekly','biweekly'] as const){const r=rule(cadence,cadence);await saveRecurringRule(r);
    await saveExpense({...expense,id:cadence+'1',amount:1,recurringRuleId:r.id});await saveExpense({...expense,id:cadence+'2',date:'2026-09-24',amount:1,recurringRuleId:r.id});}
  assert.equal(await db.expenses.filter(e=>!!e.recurringRuleId).count(),4);
});

test('forecast and income planning rule never become cash; only explicit receipt affects recorded income',async()=>{
  const before=metrics(await snapshot());await db.settings.update('general',{baseIncome:{amount:99999999,freq:'semanal'}});
  const r={...rule('income'),direction:'income' as const,categoryId:'salary'};await saveRecurringRule(r);assert.deepEqual(metrics(await snapshot()),before);
  await saveIncome({id:'receipt',type:'extra',description:'Cobro confirmado',amount:10,date:'2026-09-10',categoryId:'salary',recurringRuleId:r.id});
  const after=metrics(await snapshot());assert.equal(after.september.recordedIncome-before.september.recordedIncome,1000);assert.equal(after.position.liquidAssets-before.position.liquidAssets,1000);
  await removeRecurringRule(r.id);const dump=await exportDataJSON();await importDataJSON(dump);assert.equal((await db.incomes.get('receipt'))?.recurringRuleId,r.id);assert.deepEqual(metrics(await snapshot()),after);
});

for(const version of [3,4,5])test('backup v'+version+' preserves actual nature and provenance without inventing rules',async()=>{
  const old=structuredClone(fixture);old.v=version;old.expenses[0].type='Fijo';old.expenses[0].frequency='mensual';old.expenses[0].recurringId='historical-rule';
  if(version===5)old.categories=reconstructCategories(old);
  if(version===3){delete old.accounts;delete old.accountTransfers;for(const row of [...old.incomes,...old.expenses,...old.debtPayments])delete row.accountId;}
  await importDataJSON(JSON.stringify(old));const actual=(await db.expenses.get(old.expenses[0].id))!;
  assert.deepEqual(clean(actual),clean(migrateActualExpense(old.expenses[0])));
  assert.deepEqual(clean(await db.recurrents.toArray()),clean(old.recurrents.map(migrateRecurringRule)));
  assert.equal(metrics(await snapshot()).october.spending,0);
});

test('v6 exact round trip includes rules/provenance; rejects legacy active expense fields atomically',async()=>{
  const currentRule=rule();await saveRecurringRule(currentRule);await saveExpense({...expense,recurringRuleId:currentRule.id});const dump=JSON.parse(await exportDataJSON());const before=await snapshot();
  assert.equal(dump.v,6);assert.ok(dump.expenses.every((e:any)=>e.nature&&!('type'in e)&&!('frequency'in e)&&!('recurringId'in e)));
  await importDataJSON(JSON.stringify(dump));assert.deepEqual(await snapshot(),before);
  for(const patch of [{frequency:'mensual'},{type:'Fijo'},{nature:'Invalid'}]){const bad=structuredClone(dump);Object.assign(bad.expenses[0],patch);await assert.rejects(importDataJSON(JSON.stringify(bad)));assert.deepEqual(await snapshot(),before);}
});

test('CSV imports legacy and canonical actual expenses without creating rules',async()=>{
  const before=await db.recurrents.toArray();
  await importExpensesCSV(new File(['id,month,date,categoryId,amount,concept,type,frequency,recurringId\ncsv,2026-09,2026-09-10,food,123,Histórico,Fijo,mensual,old'], 'old.csv'));
  assert.equal((await db.expenses.get('csv'))?.nature,'Fijo');assert.equal((await db.expenses.get('csv'))?.recurringRuleId,'old');
  await importExpensesCSV(new File(['id,month,date,categoryId,amount,concept,nature,recurringRuleId\ncsv,2026-09,2026-09-10,food,123,Actual,Ocasional,old'], 'new.csv'));
  assert.equal((await db.expenses.get('csv'))?.nature,'Ocasional');assert.deepEqual(await db.recurrents.toArray(),before);
  await assert.rejects(importExpensesCSV(new File(['id,month,date,categoryId,amount,concept,nature\nbad,2026-09,2026-09-10,food,123,Bad,Invalid'], 'bad.csv')));
  assert.equal(await db.expenses.count(),1);
});

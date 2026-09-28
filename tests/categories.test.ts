import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { beforeEach, after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import Dexie from 'dexie';
import { db, GlitchBudgetDB } from '../src/lib/db';
import { activeCategories, reconstructCategories } from '../src/domain/categories';
import { resolveCategory } from '../src/lib/categories';
import { createCategory, updateCategory, archiveCategory, reactivateCategory, savePlans } from '../src/lib/category-service';
import { saveRecurringRule } from '../src/lib/recurring-rule-service';
import { saveIncome, saveExpense } from '../src/lib/transaction-service';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { rollBudgetsIntoMonth } from '../src/lib/budget-rollover';
import { selectCategorySpending } from '../src/domain/metrics';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/backup-v4.json',import.meta.url),'utf8'));
const base=JSON.parse(readFileSync(new URL('./fixtures/dexie-v7.json',import.meta.url),'utf8'));
const snapshot=()=>db.transaction('r',db.tables,async()=>Object.fromEntries(await Promise.all(db.tables.map(async t=>[t.name,await t.toArray()]))));
beforeEach(async()=>{await importDataJSON(JSON.stringify(fixture));});
after(()=>db.close());
const expense=(categoryId:string,id='new')=>({id,date:'2026-09-20',categoryId,amount:1,concept:'Prueba',nature:'Variable' as const,accountId:'cash'});
const income=(categoryId:string,id='new')=>({id,date:'2026-09-20',categoryId,amount:1,description:'Prueba',type:'extra' as const});
async function legacy(name:string){const old=new Dexie(name);old.version(8).stores({...base.schema,accounts:'id, type',account_transfers:'id, fromAccountId, toAccountId, date'});
 await old.table('settings').put({...fixture.settings,expenseCategories:['otros','alimentacion','comida-trabajo'],incomeCategories:['salary','otros'],customCategoryIcons:{'comida-trabajo':'coffee'}});
 await old.table('incomes').add({...fixture.incomes[0],id:'legacy-income',categoryId:'comida-trabajo'});
 await old.table('expenses').add({...fixture.expenses[0],id:'legacy-expense',categoryId:'olvidada'});
 await old.table('plans').add({month:'2026-09',categoryId:'solo-plan',limit:100});
 await old.table('recurrents').add({id:'rec',type:'income',title:'Renta',categoryId:'solo-recurrente',amount:100,freq:'monthly',startDate:'2026-09-01',active:true});return old;}
test('v8 to v9 preserves IDs, references, independent order, icons and inferred scopes',async()=>{
 const name='phase4-migration-'+crypto.randomUUID();const old=await legacy(name);const original=await old.table('incomes').toArray();old.close();const current=new GlitchBudgetDB(name);
 try{await current.open();assert.equal(current.verno, 14);const rows=await current.categories.toArray();
 assert.deepEqual(activeCategories(rows,'expense').map(c=>c.id),['otros','alimentacion','comida-trabajo']);
 assert.deepEqual(activeCategories(rows,'income').slice(0,2).map(c=>c.id),['salary','otros']);
 assert.equal(rows.find(c=>c.id==='comida-trabajo')?.type,'both');assert.equal(rows.find(c=>c.id==='comida-trabajo')?.iconName,'coffee');
 assert.equal(rows.find(c=>c.id==='otros')?.type,'both');
 for(const id of ['olvidada','solo-plan','solo-recurrente'])assert.equal(rows.find(c=>c.id===id)?.archived,true);
 assert.equal(rows.find(c=>c.id==='solo-recurrente')?.type,'income');assert.deepEqual(await current.incomes.toArray(),original.map(row=>({...row,currency:'DOP',fxRate:1,amountBase:row.amount})));
 const settings=await current.settings.get('general');assert.equal(settings?.expenseCategories,undefined);assert.equal(settings?.incomeCategories,undefined);assert.equal(settings?.customCategoryIcons,undefined);
 }finally{await current.delete();}
});
test('failed migration leaves the v8 database and all previous tables intact',async()=>{
 const name='phase4-rollback-'+crypto.randomUUID();const old=await legacy(name);const previous=await old.table('settings').toArray();old.close();const current=new GlitchBudgetDB(name);
 current.categories.hook('creating',()=>{throw new Error('Injected category migration failure');});
 await assert.rejects(current.open(),/Injected/);current.close();
 const check=new Dexie(name);try{await check.open();assert.equal(check.verno,8);assert.ok(!check.tables.some(t=>t.name==='categories'));assert.deepEqual(await check.table('settings').toArray(),previous);assert.equal(await check.table('incomes').count(),1);}finally{await check.delete();}
});
test('new names use UUIDs; rename and icon changes leave transactions and financial reports unchanged',async()=>{
 const c=await createCategory('Comida trabajo','expense','coffee');assert.match(c.id,/^[0-9a-f-]{36}$/);assert.notEqual(c.id,'comida-trabajo');await saveExpense(expense(c.id));
 const before=await db.expenses.toArray();const spent=selectCategorySpending(before,c.id,'2026-09');
 await updateCategory(c.id,{name:'Almuerzo',iconName:'pizza'});const rows=await db.categories.toArray();
 assert.equal(resolveCategory(rows,c.id)?.name,'Almuerzo');assert.equal(rows.find(r=>r.id===c.id)?.iconName,'pizza');
 assert.deepEqual(await db.expenses.toArray(),before);assert.equal(selectCategorySpending(await db.expenses.toArray(),c.id,'2026-09'),spent);
});
test('archive hides new choices, preserves historical edits, rejects reassignment, and reactivates',async()=>{
 const c=await createCategory('Café','expense');await saveExpense(expense(c.id));await archiveCategory(c.id);
 assert.ok(!activeCategories(await db.categories.toArray(),'expense').some(r=>r.id===c.id));assert.equal(resolveCategory(await db.categories.toArray(),c.id)?.name,'Café');
 await saveExpense({...expense(c.id),concept:'Corrección'},true);
 await assert.rejects(saveExpense(expense(c.id,'another')),/archivada/);
 const other=await createCategory('Otro gasto','expense');await saveExpense(expense(other.id,'other'));
 await assert.rejects(saveExpense({...expense(c.id,'other')},true),/archivada/);
 await reactivateCategory(c.id);assert.ok(activeCategories(await db.categories.toArray(),'expense').some(r=>r.id===c.id));await saveExpense(expense(c.id,'active-again'));
});
test('scope validation rejects incorrect directions, permits both and forbids narrowing',async()=>{
 const c=await createCategory('Compartida','expense');await assert.rejects(saveIncome(income(c.id)),/tipo/);
 await updateCategory(c.id,{type:'both'});await saveIncome(income(c.id));await saveExpense(expense(c.id));
 await assert.rejects(updateCategory(c.id,{type:'income'}),/ámbito/);
 await assert.rejects(saveIncome(income('missing','missing')),/no existe/);
});
test('active duplicate names are rejected by scope, including reactivation and concurrent creation',async()=>{
 const c=await createCategory('Taxi','expense');await assert.rejects(createCategory('  TAXI  ','expense'),/nombre/);
 await createCategory('Taxi','income');await assert.rejects(updateCategory(c.id,{type:'both'}),/nombre/);
 await archiveCategory(c.id);await createCategory('Taxi','expense');await assert.rejects(reactivateCategory(c.id),/nombre/);
 const result=await Promise.allSettled([createCategory('Tren','expense'),createCategory('tren','expense')]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
});
test('new plans and recurrents reject archived categories; historical definitions remain editable',async()=>{
 const c=await createCategory('Periódico','expense');await savePlans([{month:'2026-09',categoryId:c.id,limit:500}]);
 const r={id:'periodic',direction:'expense' as const,title:'Periódico',categoryId:c.id,amount:100,cadence:'monthly' as const,startDate:'2026-09-01',active:true};await saveRecurringRule(r);await archiveCategory(c.id);
 await savePlans([{month:'2026-09',categoryId:c.id,limit:600}]);await saveRecurringRule({...r,title:'Renombrado'},true);
 await assert.rejects(savePlans([{month:'2026-10',categoryId:c.id,limit:500}]),/archivada/);await assert.rejects(saveRecurringRule({...r,id:'another'}),/archivada/);
 await db.settings.update('general',{rolloverStrategy:'accumulate_surplus'});await rollBudgetsIntoMonth('2026-10');assert.equal(await db.plans.get(['2026-10',c.id]),undefined);
});
for(const version of [3,4])test('legacy backup v'+version+' reconstructs unknown categories without reassigning IDs',async()=>{
 const dump=structuredClone(fixture);dump.v=version;dump.expenses[0].categoryId='historia-desconocida';dump.incomes[0].categoryId='historia-desconocida';if(version===3){delete dump.accounts;delete dump.accountTransfers;for(const r of [...dump.incomes,...dump.expenses,...dump.debtPayments])delete r.accountId;}
 await importDataJSON(JSON.stringify(dump));const c=await db.categories.get('historia-desconocida');assert.equal(c?.type,'both');assert.equal(c?.archived,true);assert.equal(c?.name,'Historia desconocida');assert.equal((await db.expenses.get(dump.expenses[0].id))?.categoryId,c?.id);
});
test('v7 round trip preserves every category property and rejects corrupt references atomically',async()=>{
 const c=await createCategory('Viajes','both','plane');await updateCategory(c.id,{archived:true,expenseOrder:15,incomeOrder:3});const dump=JSON.parse(await exportDataJSON());assert.equal(dump.v, 10);assert.ok(dump.categories.length);assert.equal(dump.settings.expenseCategories,undefined);
 const before=await snapshot();await importDataJSON(JSON.stringify(dump));assert.deepEqual(await snapshot(),before);
 for(const table of ['incomes','expenses','plans','recurrents']){const bad=structuredClone(dump);bad[table][0].categoryId='missing';await assert.rejects(importDataJSON(JSON.stringify(bad)),/categoría/);assert.deepEqual(await snapshot(),before);}
 const missing=structuredClone(dump);delete missing.categories;await assert.rejects(importDataJSON(JSON.stringify(missing)),/categorías/);assert.deepEqual(await snapshot(),before);
});
test('migration distinguishes legacy duplicate display names without dropping either ID',()=>{
 const rows=reconstructCategories({settings:{expenseCategories:['taxi','Taxi'],incomeCategories:[]}});assert.equal(rows.find(c=>c.id==='taxi')?.name,'Taxi');assert.equal(rows.find(c=>c.id==='Taxi')?.name,'Taxi (Taxi)');assert.equal(rows.filter(c=>!c.archived).length,2);
});

test('v7 rejects incompatible scopes and duplicate IDs before replacing any table',async()=>{
 const dump=JSON.parse(await exportDataJSON());const before=await snapshot();
 const wrong=structuredClone(dump);wrong.categories.find((c:{id:string})=>c.id===wrong.expenses[0].categoryId).type='income';
 await assert.rejects(importDataJSON(JSON.stringify(wrong)),/categoría/);assert.deepEqual(await snapshot(),before);
 const duplicate=structuredClone(dump);duplicate.categories.push(duplicate.categories[0]);
 await assert.rejects(importDataJSON(JSON.stringify(duplicate)),/duplicado/);assert.deepEqual(await snapshot(),before);
});

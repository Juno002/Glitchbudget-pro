import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, beforeEach, test } from 'node:test';
import { db } from '../src/lib/db';
import { ensureCashAccount } from '../src/lib/accounts';
import { saveExpense, saveIncome } from '../src/lib/transaction-service';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { importExpensesCSV, serializeTableCSV } from '../src/lib/csv-backup';
import { seedTestCategories } from './category-fixture';
import { localDate } from '../src/lib/finance-calculations';
import { normalizeTransactionLabels, parseTransactionLabelsInput } from '../src/domain/transaction-metadata';
import { applyTransactionFilters, type FilterableMovement } from '../src/domain/transaction-filters';
import {
  loadSavedTransactionFilters,
  normalizeTransactionFilters,
  removeSavedTransactionFilter,
  upsertSavedTransactionFilter,
} from '../src/lib/saved-transaction-filters';
import { loadQuickAddTemplates, upsertQuickAddTemplate } from '../src/lib/quick-add-templates';

const today=localDate();
const settings={
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

beforeEach(async()=>{
  await db.transaction('rw',db.tables,async()=>{for(const table of db.tables) await table.clear();});
  await db.settings.put(settings);
  await seedTestCategories();
});
after(()=>db.close());

test('labels are trimmed, deduplicated case-insensitively and capped without inventing metadata',()=>{
  assert.deepEqual(normalizeTransactionLabels([' casa ','Casa','trabajo','','  viaje   largo  ']),['casa','trabajo','viaje largo']);
  assert.deepEqual(parseTransactionLabelsInput('casa, trabajo, CASA'),['casa','trabajo']);
  assert.equal(normalizeTransactionLabels(Array.from({length:20},(_,i)=>'l'+i)).length,12);
});

test('expense necessity and labels plus income labels persist through transaction services',async()=>{
  const cash=await ensureCashAccount(today);
  await db.accounts.update(cash.id,{openingBalance:100_000});
  await saveExpense({
    id:'e',accountId:cash.id,nature:'Variable',concept:'Compra',amount:12.34,date:today,
    categoryId:'food',paymentMethod:'cash',necessity:'need',labels:[' casa ','Casa','semana'],
  });
  await saveIncome({
    id:'i',accountId:cash.id,type:'extra',description:'Cobro',amount:20,date:today,
    categoryId:'salary',labels:['trabajo',' trabajo '],
  });
  const expense=await db.expenses.get('e');
  const income=await db.incomes.get('i');
  assert.equal(expense?.necessity,'need');
  assert.deepEqual(expense?.labels,['casa','semana']);
  assert.deepEqual(income?.labels,['trabajo']);
});

test('filter engine covers account, category, date, amount, necessity, label and type deterministically',()=>{
  const rows:FilterableMovement[]=[
    {id:'a',kind:'expense',amount:5000,date:'2026-09-01',categoryId:'food',accountIds:['cash'],necessity:'want',labels:['salida']},
    {id:'b',kind:'expense',amount:8000,date:'2026-09-15',categoryId:'housing',accountIds:['bank'],necessity:'must',labels:['casa']},
    {id:'c',kind:'income',amount:12000,date:'2026-09-20',categoryId:'salary',accountIds:['bank'],labels:['trabajo']},
    {id:'d',kind:'transfer',amount:3000,date:'2026-09-21',accountIds:['cash','bank']},
  ];
  assert.deepEqual(applyTransactionFilters(rows,{accountId:'bank'}).map(r=>r.id),['b','c','d']);
  assert.deepEqual(applyTransactionFilters(rows,{categoryId:'food'}).map(r=>r.id),['a']);
  assert.deepEqual(applyTransactionFilters(rows,{dateStart:'2026-09-10',dateEnd:'2026-09-20'}).map(r=>r.id),['b','c']);
  assert.deepEqual(applyTransactionFilters(rows,{amountMin:6000,amountMax:10000}).map(r=>r.id),['b']);
  assert.deepEqual(applyTransactionFilters(rows,{necessity:'must'}).map(r=>r.id),['b']);
  assert.deepEqual(applyTransactionFilters(rows,{label:'TRABAJO'}).map(r=>r.id),['c']);
  assert.deepEqual(applyTransactionFilters(rows,{type:'transfer'}).map(r=>r.id),['d']);
});

test('saved filters are local, normalized and removable without financial persistence',()=>{
  const memory=new Map<string,string>();
  const storage={
    getItem:(key:string)=>memory.get(key)??null,
    setItem:(key:string,value:string)=>{memory.set(key,value);},
  };
  const rows=upsertSavedTransactionFilter(storage,{
    id:'one',name:' Wants ',filters:{type:'expense',necessity:'want',label:' salida ',amountMin:1000},
  });
  assert.equal(rows[0].name,'Wants');
  assert.deepEqual(rows[0].filters,{accountId:undefined,categoryId:undefined,dateStart:undefined,dateEnd:undefined,amountMin:1000,amountMax:undefined,necessity:'want',label:'salida',type:'expense'});
  assert.deepEqual(loadSavedTransactionFilters(storage),rows);
  assert.deepEqual(removeSavedTransactionFilter(storage,'one'),[]);
  assert.deepEqual(normalizeTransactionFilters({type:'bogus',amountMin:-1,dateStart:'bad'}),{
    accountId:undefined,categoryId:undefined,dateStart:undefined,dateEnd:undefined,amountMin:undefined,amountMax:undefined,necessity:undefined,label:undefined,type:undefined,
  });
  const repaired=normalizeTransactionFilters({dateStart:'2026-09-30',dateEnd:'2026-09-01',amountMin:9000,amountMax:1000});
  assert.deepEqual({dateStart:repaired.dateStart,dateEnd:repaired.dateEnd,amountMin:repaired.amountMin,amountMax:repaired.amountMax},{
    dateStart:'2026-09-01',dateEnd:'2026-09-30',amountMin:1000,amountMax:9000,
  });
});

test('quick-add templates preserve selective metadata without adding automation',()=>{
  const memory=new Map<string,string>();
  const storage={getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>{memory.set(key,value);}};
  upsertQuickAddTemplate(storage,{
    id:'t',name:'Bus',type:'expense',amount:'35',categoryId:'transport',
    expenseSubtype:'Variable',necessity:'must',labels:['trabajo','Trabajo'],
  });
  const template=loadQuickAddTemplates(storage)[0];
  assert.equal(template.necessity,'must');
  assert.deepEqual(template.labels,['trabajo']);
});

test('JSON v11 round-trips metadata and legacy v10 imports without inventing it',async()=>{
  const cash=await ensureCashAccount(today);
  await db.accounts.update(cash.id,{openingBalance:100_000});
  await saveExpense({
    id:'e',accountId:cash.id,nature:'Ocasional',concept:'Cena',amount:15,date:today,
    categoryId:'food',paymentMethod:'cash',necessity:'want',labels:['salida','amigos'],
  });
  await saveIncome({
    id:'i',accountId:cash.id,type:'extra',description:'Freelance',amount:30,date:today,
    categoryId:'salary',labels:['trabajo'],
  });

  const text=await exportDataJSON();
  const dump=JSON.parse(text);
  assert.equal(dump.v,11);
  assert.equal(dump.expenses[0].necessity,'want');
  assert.deepEqual(dump.expenses[0].labels,['salida','amigos']);
  assert.deepEqual(dump.incomes[0].labels,['trabajo']);

  await importDataJSON(text);
  assert.equal((await db.expenses.get('e'))?.necessity,'want');
  assert.deepEqual((await db.incomes.get('i'))?.labels,['trabajo']);

  const legacy=JSON.parse(text);
  legacy.v=10;
  for(const row of legacy.expenses){delete row.necessity;delete row.labels;}
  for(const row of legacy.incomes) delete row.labels;
  await importDataJSON(JSON.stringify(legacy));
  assert.equal((await db.expenses.get('e'))?.necessity,undefined);
  assert.equal((await db.expenses.get('e'))?.labels,undefined);
  assert.equal((await db.incomes.get('i'))?.labels,undefined);
});

test('CSV exports and restores necessity and labels while legacy columns remain optional',async()=>{
  const cash=await ensureCashAccount(today);
  await db.accounts.update(cash.id,{openingBalance:100_000});
  await saveExpense({
    id:'e',accountId:cash.id,nature:'Fijo',concept:'Internet',amount:20,date:today,
    categoryId:'other',paymentMethod:'cash',necessity:'must',labels:['casa','internet'],
  });
  const csv=await serializeTableCSV('expenses');
  assert.match(csv,/necessity/);
  assert.match(csv,/labels/);
  assert.match(csv,/must/);
  assert.match(csv,/internet/);

  await db.expenses.clear();
  await importExpensesCSV(new File([csv],'expenses.csv'));
  const restored=await db.expenses.get('e');
  assert.equal(restored?.necessity,'must');
  assert.deepEqual(restored?.labels,['casa','internet']);
});

test('Phase 15 UI exposes metadata, every roadmap filter and local saved filters without forbidden fields',()=>{
  const modal=readFileSync(new URL('../src/components/dashboard/TransactionModal.tsx',import.meta.url),'utf8');
  const movements=readFileSync(new URL('../src/components/dashboard/MovementsView.tsx',import.meta.url),'utf8');
  const reset=readFileSync(new URL('../src/components/layout/settings-dialog.tsx',import.meta.url),'utf8');

  for(const text of ['Necesidad','Etiquetas','must','need','want']) assert.ok(modal.includes(text),text);
  for(const text of ['Filtrar por tipo','Filtrar por cuenta','Filtrar por categoría','Filtrar por necesidad','Desde','Hasta','Monto mínimo','Monto máximo','Filtrar por etiqueta','Guardar filtro']) assert.ok(movements.includes(text),text);
  assert.match(reset,/SAVED_TRANSACTION_FILTERS_KEY/);
  assert.doesNotMatch(modal,/ubicación|garantía|loyalty|receipt/i);
  assert.doesNotMatch(movements,/ubicación|garantía|loyalty|receipt/i);
});

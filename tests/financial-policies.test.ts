import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { beforeEach, after, test } from 'node:test';
import { db, type Expense } from '../src/lib/db';
import { saveExpense, saveGoalContribution, saveDebtPayment, saveIncome, removeIncome } from '../src/lib/transaction-service';
import { saveTransfer, readAccountSnapshot } from '../src/lib/accounts';
import { selectPosition } from '../src/domain/ledger';
import { selectMonthlyMetrics } from '../src/domain/metrics';
import { normalizeFinancialPolicies } from '../src/policies/settings';
import { BudgetWarning, evaluateBudgetOverspending } from '../src/policies/budget-overspending';
import { readFinancialPolicies } from '../src/lib/policy-settings';
import { withBudgetConfirmation } from '../src/lib/expense-confirmation';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
const date='2026-09-20', month='2026-09';
const cash={id:'cash',name:'Efectivo',type:'cash' as const,openingBalance:1_000_000,startDate:'2026-09-01',isDefaultCash:true};
const expense={id:'new',date,categoryId:'food',amount:1000,concept:'Prueba',type:'Variable' as const,accountId:'cash'};
const old: Expense={...expense,id:'old',month,amount:450_000};
beforeEach(async()=>{
 await db.transaction('rw',db.tables,async()=>{for(const t of db.tables)await t.clear();});
 await db.settings.put({id:'general',theme:'dark',strictMode:true,preventNegativeAccountBalance:true,budgetOverspendingBehavior:'block',rolloverStrategy:'reset',baseIncome:{amount:0,freq:'mensual'},savePct:0,currency:'DOP',locale:'es-DO',expenseCategories:['food'],incomeCategories:['salary']});
 await db.accounts.bulkAdd([cash,{...cash,id:'bank',name:'Banco',type:'bank',openingBalance:0,isDefaultCash:false}]);
 await db.goals.add({id:'goal',name:'Meta',target:2_000_000,saved:0,quota:0,startDate:date,status:'active'});
 await db.debts.add({id:'card',name:'Tarjeta',type:'credit_card',principal:1_000_000,apr:0,minPayment:0,status:'active',createdAt:date+'T00:00:00.000Z'});
});
after(()=>db.close());
async function monthly(){return selectMonthlyMetrics({settings:{savePct:0},incomes:await db.incomes.toArray(),expenses:await db.expenses.toArray(),budgets:await db.plans.toArray(),goalContributions:await db.goal_contributions.toArray(),debtPayments:await db.debt_payments.toArray()},month);}
async function position(){return selectPosition(await db.accounts.toArray(),await db.debts.toArray(),await readAccountSnapshot(),date);}
async function budget(){await db.plans.add({month,categoryId:'food',limit:500_000});await db.expenses.add(old);}
test('initial RD$10,000 with no monthly income funds expenses and allows goal reserves',async()=>{
 await saveExpense(expense);await saveGoalContribution({id:'g',goalId:'goal',amount:1_500_000,date});
 assert.equal((await monthly()).recordedIncome,0);assert.equal((await monthly()).monthlyPlanningMargin,-1_600_000);assert.equal((await position()).liquidAssets,900_000);
});
test('RD$30,000 forecast never funds a protected account with zero actual cash',async()=>{
 await db.accounts.update('cash',{openingBalance:0});await db.settings.update('general',{baseIncome:{freq:'mensual',amount:3_000_000},budgetOverspendingBehavior:'allow'});
 await assert.rejects(saveExpense(expense),/Saldo insuficiente/);assert.equal(await db.expenses.count(),0);
});
for(const behavior of ['allow','warn','block'] as const)test(`budget 5000 / spent 4500 / new 1000: ${behavior}`,async()=>{
 await budget();await db.settings.update('general',{budgetOverspendingBehavior:behavior});
 if(behavior==='allow')await saveExpense(expense);
 if(behavior==='block')await assert.rejects(saveExpense(expense),/presupuesto/);
 if(behavior==='warn'){
   let warning:BudgetWarning|undefined;try{await saveExpense(expense);}catch(e){assert.ok(e instanceof BudgetWarning);warning=e;}
   assert.ok(warning);assert.equal(await db.expenses.count(),1);
   await saveExpense(expense,false,warning.evaluation.confirmation);
 }
 assert.equal(await db.expenses.count(),behavior==='block'?1:2);
});
test('already overspent 6000/5000 can improve to 5500, but not worsen to 6500',async()=>{
 await budget();await db.expenses.update('old',{amount:600_000});
 await saveExpense({...expense,id:'old',amount:5500},true);
 await assert.rejects(saveExpense({...expense,id:'old',amount:6500},true),/presupuesto/);
 assert.equal((await db.expenses.get('old'))?.amount,550_000);
});
test('missing category budget never warns; card purchase uses budget but no cash',async()=>{
 await db.accounts.update('cash',{openingBalance:0});await db.settings.update('general',{budgetOverspendingBehavior:'warn'});
 await saveExpense({...expense,paymentMethod:'credit',debtId:'card'});
 assert.equal((await position()).liquidAssets,0);assert.equal((await monthly()).spending,100_000);
 await db.plans.add({month,categoryId:'food',limit:100_000});
 await assert.rejects(saveExpense({...expense,id:'second',paymentMethod:'credit',debtId:'card'}),BudgetWarning);
});
test('card payments and transfers check funds, never category budgets or spending',async()=>{
 await budget();await saveDebtPayment({id:'p',debtId:'card',accountId:'cash',date,amount:100_000});
 await saveTransfer({id:'t',fromAccountId:'cash',toAccountId:'bank',date,amount:100_000,note:''});
 assert.equal((await monthly()).spending,450_000);
 await assert.rejects(saveDebtPayment({id:'p2',debtId:'card',accountId:'cash',date,amount:500_000}),/Saldo insuficiente/);
 await assert.rejects(saveTransfer({id:'t2',fromAccountId:'cash',toAccountId:'bank',date,amount:500_000,note:''}),/Saldo insuficiente/);
});
test('funds disabled permits overdraft transfers and payments independently of budget block',async()=>{
 await db.accounts.update('cash',{openingBalance:0});await db.settings.update('general',{preventNegativeAccountBalance:false});await budget();
 await saveTransfer({id:'t',fromAccountId:'cash',toAccountId:'bank',amount:10_000,date,note:''});
 await saveDebtPayment({id:'p',debtId:'card',accountId:'cash',date,amount:10_000});assert.equal((await monthly()).spending,450_000);
});
test('historical deficit may improve or stay, but cannot worsen; editing income still protects funds',async()=>{
 await db.accounts.update('cash',{openingBalance:0});await db.expenses.add({...old,amount:10_000});
 await saveExpense({...expense,id:'old',amount:90},true);await saveExpense({...expense,id:'old',amount:90,concept:'Editado'},true);
 await assert.rejects(saveExpense({...expense,id:'old',amount:110},true),/Saldo insuficiente/);
 await saveIncome({id:'i',amount:100,date,categoryId:'salary',type:'extra',description:''});
 await assert.rejects(removeIncome('i'),/Saldo insuficiente/);
});
test('legacy unassigned edits affect activity only; assigning an account activates funds guard',async()=>{
 await db.accounts.update('cash',{openingBalance:0});await db.expenses.add({...old,accountId:undefined,amount:10_000});
 await saveExpense({...expense,id:'old',accountId:undefined,amount:200},true);
 assert.equal((await db.expenses.get('old'))?.accountId,undefined);assert.equal((await position()).liquidAssets,0);
 await assert.rejects(saveExpense({...expense,id:'old',amount:200},true),/Saldo insuficiente/);
 await db.plans.add({month,categoryId:'food',limit:20_000});await assert.rejects(saveExpense({...expense,id:'old',accountId:undefined,amount:300},true),/presupuesto/);
});
test('warn cancellation does not persist; confirmation retries and revalidates changed budget state',async()=>{
 await budget();await db.settings.update('general',{budgetOverspendingBehavior:'warn'});
 assert.equal(await withBudgetConfirmation(token=>saveExpense(expense,false,token),async()=>false),false);assert.equal(await db.expenses.count(),1);
 let confirmations=0;
 assert.equal(await withBudgetConfirmation(token=>saveExpense(expense,false,token),async()=>{confirmations++;assert.equal(await db.expenses.count(),1);if(confirmations===1)await db.plans.update([month,'food'],{limit:400_000});return true;}),true);
 assert.equal(confirmations,2);assert.equal(await db.expenses.count(),2);
});
test('warn approval cannot bypass a concurrent change to funds or block policy',async()=>{
 await budget();await db.settings.update('general',{budgetOverspendingBehavior:'warn'});
 await assert.rejects(withBudgetConfirmation(token=>saveExpense(expense,false,token),async()=>{await db.accounts.update('cash',{openingBalance:450_000});return true;}),/Saldo insuficiente/);
 assert.equal(await db.expenses.count(),1);
 await db.accounts.update('cash',{openingBalance:1_000_000});
 await assert.rejects(withBudgetConfirmation(token=>saveExpense(expense,false,token),async()=>{await db.settings.update('general',{budgetOverspendingBehavior:'block'});return true;}),/presupuesto/);
});
test('simultaneous budget writes serialize and cannot both cross the limit',async()=>{
 await budget();const result=await Promise.allSettled([saveExpense({...expense,id:'a',amount:400}),saveExpense({...expense,id:'b',amount:400})]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(await db.expenses.count(),2);
});
test('pure budget policy preserves inputs and month/category boundaries',()=>{
 const plan={month,categoryId:'food',limit:500_000};const input={...expense,amount:100_000,month};const rows=[old,{...old,id:'other',date:'2026-10-20'}];const frozen=JSON.stringify(rows);
 assert.equal(evaluateBudgetOverspending(rows,input,plan,'block').decision,'block');assert.equal(JSON.stringify(rows),frozen);
 assert.equal(evaluateBudgetOverspending(rows,{...input,categoryId:'other'},undefined,'block').decision,'allow');
});
test('legacy strict converts once; changing old flag cannot override explicit policies',async()=>{
 for(const strictMode of [true,false]){
 assert.deepEqual(normalizeFinancialPolicies({strictMode}),{preventNegativeAccountBalance:strictMode,budgetOverspendingBehavior:strictMode?'block':'allow'});
 }
 const s=(await db.settings.get('general'))!;delete s.preventNegativeAccountBalance;delete s.budgetOverspendingBehavior;await db.settings.put(s);
 await db.transaction('rw',db.settings,readFinancialPolicies);await db.settings.update('general',{strictMode:false});
 assert.deepEqual(await db.transaction('rw',db.settings,readFinancialPolicies),{preventNegativeAccountBalance:true,budgetOverspendingBehavior:'block'});
});
test('new policies round-trip in backup v4, old v3/v4 derive strict settings',async()=>{
 await db.settings.update('general',{preventNegativeAccountBalance:false,budgetOverspendingBehavior:'warn'});
 const backup=JSON.parse(await exportDataJSON());await importDataJSON(JSON.stringify(backup));assert.equal((await db.settings.get('general'))?.budgetOverspendingBehavior,'warn');assert.equal((await db.settings.get('general'))?.preventNegativeAccountBalance,false);
 for(const v of [3,4])for(const strictMode of [true,false]){
 const oldBackup={...backup,v,settings:{...backup.settings,strictMode}};delete oldBackup.settings.preventNegativeAccountBalance;delete oldBackup.settings.budgetOverspendingBehavior;
 if(v===3){delete oldBackup.accounts;delete oldBackup.accountTransfers;}
 await importDataJSON(JSON.stringify(oldBackup));const restored=(await db.settings.get('general'))!;assert.equal(restored.preventNegativeAccountBalance,strictMode);assert.equal(restored.budgetOverspendingBehavior,strictMode?'block':'allow');
 }
});
test('invalid backup policy cannot destroy existing data',async()=>{
 const data=JSON.parse(await exportDataJSON());data.settings.budgetOverspendingBehavior='sometimes';await assert.rejects(importDataJSON(JSON.stringify(data)));assert.equal(await db.accounts.count(),2);
});

test('goal reserves with zero assets ignore both policies and keep atomic validation',async()=>{
 await db.accounts.update('cash',{openingBalance:0});await db.plans.add({month,categoryId:'food',limit:0});
 await saveGoalContribution({id:'g',goalId:'goal',amount:100_000,date});assert.equal((await position()).liquidAssets,0);assert.equal((await monthly()).monthlyPlanningMargin,-100_000);
 await assert.rejects(saveGoalContribution({id:'g',goalId:'goal',amount:100_000,date}));assert.equal((await db.goals.get('goal'))?.saved,100_000);
 await assert.rejects(saveGoalContribution({id:'bad',goalId:'missing',amount:1,date}));
});
test('moving an expense to another month/category evaluates its destination budget',async()=>{
 await budget();await db.plans.add({month:'2026-10',categoryId:'other',limit:10_000});
 await assert.rejects(saveExpense({...expense,id:'old',categoryId:'other',date:'2026-10-01',amount:200},true),/presupuesto/);
 assert.equal((await db.expenses.get('old'))?.month,month);
});
test('new unassigned expenses always receive default cash, including confirmed warnings',async()=>{
 await db.accounts.clear();await db.settings.update('general',{preventNegativeAccountBalance:false,budgetOverspendingBehavior:'warn'});await db.plans.add({month,categoryId:'food',limit:0});
 let prompts=0;await withBudgetConfirmation(token=>saveExpense({...expense,accountId:undefined},false,token),async()=>{prompts++;return true;});
 assert.equal(prompts,1);assert.equal(await db.accounts.count(),1);assert.ok((await db.expenses.get('new'))?.accountId);
});

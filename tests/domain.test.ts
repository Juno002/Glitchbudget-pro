import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { selectPosition, selectAccountBalance, selectCardAvailableLimit, type AccountSnapshot } from '../src/domain/ledger';
import { selectMonthlyMetrics, selectBudgetRemaining, selectRolloverLimit, selectMonthlyResultSplit } from '../src/domain/metrics';
import type { FinanceSnapshot } from '../src/domain/snapshot';
import type { Account, Debt, Income, Expense } from '../src/domain/models';
import { legacyExpensePolicyRejects, legacyGoalContributionPolicyRejects, type FinanceSnapshot as PolicySnapshot } from './reference/phase2-finance';
const date = '2026-09-26', month = '2026-09';
const accounts: Account[] = [ {id:'cash',name:'Cash',type:'cash', currency:'DOP', openingBalance:100000,startDate:'2026-09-01'}, {id:'bank',name:'Bank',type:'bank', currency:'DOP', openingBalance:0,startDate:'2026-09-01'} ];
const card: Debt = {id:'card',name:'Card',type:'credit_card',principal:500000,apr:0,minPayment:0,createdAt:date,status:'active'};
const income: Income = {id:'income',accountId:'cash',amount:20000,date,month,categoryId:'salary',type:'extra',description:''};
const expense: Expense = {id:'expense',accountId:'cash',amount:5000,date,month,categoryId:'food',nature:'Variable',concept:'',paymentMethod:'cash'};
function empty(): AccountSnapshot { return {incomes:[],expenses:[],payments:[],transfers:[]}; }
function financial(data: AccountSnapshot): FinanceSnapshot { return {incomes:data.incomes,expenses:data.expenses,debtPayments:data.payments,settings:{savePct:0},budgets:[],goalContributions:[]}; }
const position = (data: AccountSnapshot, cards = [card]) => selectPosition(accounts,cards,data,date);
const monthly = (data: AccountSnapshot) => selectMonthlyMetrics(financial(data),month);
test('income increases liquid assets, net worth and recorded income once', () => {
  const d={...empty(),incomes:[income]};assert.equal(position(d).liquidAssets,120000);assert.equal(position(d).netWorth,120000);assert.equal(monthly(d).recordedIncome,20000);
});
test('cash and bank spending reduce assets and increase spending', () => {
  for(const accountId of ['cash','bank']) {const d={...empty(),expenses:[{...expense,accountId}]};assert.equal(position(d).liquidAssets,95000);assert.equal(monthly(d).spending,5000);assert.equal(monthly(d).cashFlow,-5000);}
});
test('card purchase increases spending and liability without using liquid assets', () => {
  const d={...empty(),expenses:[{...expense,paymentMethod:'credit' as const,debtId:'card'}]};assert.equal(position(d).liquidAssets,100000);assert.equal(position(d).liabilities,5000);assert.equal(position(d).netWorth,95000);assert.equal(monthly(d).spending,5000);assert.equal(monthly(d).cashFlow,0);
});
test('card payment reduces assets and liability, without spending twice', () => {
  const d={...empty(),payments:[{id:'pay',accountId:'cash',debtId:'card',amount:5000,date}]};const p=position(d,[{...card,openingAdjustment:10000}]);assert.equal(p.liquidAssets,95000);assert.equal(p.liabilities,5000);assert.equal(p.netWorth,90000);assert.equal(monthly(d).spending,0);assert.equal(monthly(d).cashFlow,-5000);
});
test('internal transfer changes account balances, not income, spending, cash flow or net worth', () => {
  const d={...empty(),transfers:[{id:'t',fromAccountId:'cash',toAccountId:'bank',amount:10000,date,note:''}]};assert.equal(selectAccountBalance(accounts[0],d,date),90000);assert.equal(selectAccountBalance(accounts[1],d,date),10000);assert.equal(position(d).netWorth,100000);assert.deepEqual(monthly(d),monthly(empty()));
});
test('budgets change reservation metrics only and preserve signed remaining', () => {
  const d={...empty(),incomes:[income],expenses:[expense]};const f=financial(d);const before=selectMonthlyMetrics(f,month);const after=selectMonthlyMetrics({...f,budgets:[{month,categoryId:'food',limit:10000}]},month);assert.equal(after.plannedBudgetTotal,10000);assert.equal(after.monthlyPlanningMargin,before.monthlyPlanningMargin-5000);assert.equal(after.cashFlow,before.cashFlow);assert.equal(after.monthlyResult,before.monthlyResult);assert.deepEqual(selectBudgetRemaining(1000,2000),{budgetRemaining:-1000,unspentBudgetReservation:0});
});
test('planned operations, base salary and goal balances are not realized assets or income', () => {
  const d={...empty(),plannedPayments:[{amount:5000}],goals:[{saved:5000}],recurrents:[{amount:10000}]};assert.deepEqual(position(d),position(empty()));const f={...financial(d),settings:{savePct:0,baseIncome:{amount:999999,freq:'mensual'}}};assert.equal(selectMonthlyMetrics(f,month).recordedIncome,0);assert.equal(selectMonthlyMetrics(f,month).cashFlow,0);
});
test('goal contribution reserves monthly margin, without reducing cash flow or net worth', () => {
  const d=empty(),f=financial(d);const after=selectMonthlyMetrics({...f,goalContributions:[{id:'g',goalId:'goal',date,amount:5000}]},month);assert.equal(after.monthlyPlanningMargin,-5000);assert.equal(after.spending,0);assert.equal(after.cashFlow,0);assert.equal(position({...d, ...{goalContributions:[{amount:5000}]}}).netWorth,100000);
});
test('available card credit is never an asset; surplus is an asset but not liquid money', () => {
  const p=position(empty(),[{...card,openingAdjustment:-5000},{...card,id:'other',openingAdjustment:10000}]);assert.equal(p.cardPositiveBalance,5000);assert.equal(p.liabilities,10000);assert.equal(p.liquidAssets,100000);assert.equal(p.netWorth,95000);assert.equal(position(empty(),[{...card,principal:999999}]).netWorth,100000);
});
test('historical boundaries are preserved without mutating a snapshot', () => {
  const d={...empty(),incomes:[{...income,date:'2026-08-31'},{...income,id:'future',date:'2026-10-01'}]};const serialized=JSON.stringify(d);assert.equal(position(d).liquidAssets,100000);assert.equal(monthly(d).recordedIncome,0);assert.equal(JSON.stringify(d),serialized);
});
test('rollover and monthly result split preserve deficit versus surplus', () => {
  assert.equal(selectRolloverLimit(10000,2000,'accumulate_surplus'),18000);assert.equal(selectRolloverLimit(10000,12000,'accumulate_debt'),8000);assert.deepEqual(selectMonthlyResultSplit(2000,5000),{surplus:0,deficit:3000});
});
function policy(): PolicySnapshot {return {...financial(empty()),settings:{savePct:0,baseIncome:{amount:10000,freq:'mensual'}}};}
test('legacy expense policy preserves forecast, fixed frequency and edit deficit acceptance exactly', () => {
  const before=policy();const after={...before,expenses:[{...expense,amount:12000}]};assert.equal(legacyExpensePolicyRejects(before,after,month,false),true);assert.equal(legacyExpensePolicyRejects(before,{...before,expenses:[expense]},month,false),false);
  assert.equal(legacyExpensePolicyRejects(after,after,month,true),false);
  assert.equal(legacyExpensePolicyRejects(after,{...after,expenses:[{...expense,amount:13000}]},month,true),true);
  assert.equal(legacyExpensePolicyRejects(before,{...before,expenses:[{...expense,amount:6000,nature:'Fijo',frequency:'quincenal'}]},'2026-10',false),true);
});
test('legacy goal gate uses monthly margin, not opening cash, and includes reservations', () => {
  const p=policy();assert.equal(position(empty()).liquidAssets,100000);assert.equal(legacyGoalContributionPolicyRejects(p,month,1),true);
  const withIncome={...p,incomes:[income],budgets:[{month,categoryId:'food',limit:5000}]};assert.equal(legacyGoalContributionPolicyRejects(withIncome,month,15000),false);assert.equal(legacyGoalContributionPolicyRejects(withIncome,month,15001),true);
});
test('domain has no persistence, UI, browser, policy or clock dependencies', () => {
  for(const file of readdirSync('src/domain').filter(f=>f.endsWith('.ts'))) {const text=readFileSync(`src/domain/${file}`,'utf8');assert.doesNotMatch(text,/from ['"](?:react|dexie|.*(?:lib\/|policies\/))/);assert.doesNotMatch(text,/\b(?:window|document|navigator|localStorage|indexedDB|fetch)\s*[.(]|new Date\(|Date.now\(|Math.random\(/);}
});

test('card headroom stays separate from assets, including surplus and over-limit states', () => {
  assert.equal(selectCardAvailableLimit(10000, -2000), 12000);
  assert.equal(selectCardAvailableLimit(10000, 12000), -2000);
});

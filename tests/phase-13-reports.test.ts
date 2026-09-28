import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  previousComparableRange,
  resolveReportRange,
  selectCashFlowReport,
  selectNetWorthReport,
  selectReportsSnapshot,
  selectSpendingReport,
  type ReportsSnapshotInput,
} from '../src/domain/reports';

const input: ReportsSnapshotInput = {
  accounts:[
    {id:'cash',name:'Cash',type:'cash',currency:'DOP',openingBalance:100_000,startDate:'2026-01-01'},
    {id:'bank',name:'Bank',type:'bank',currency:'DOP',openingBalance:200_000,startDate:'2026-01-01'},
    {id:'inv',name:'Investment',type:'investment',currency:'DOP',openingBalance:50_000,startDate:'2026-01-01'},
  ],
  debts:[
    {id:'card',name:'Card',type:'credit_card',principal:100_000,apr:0,minPayment:0,createdAt:'2026-01-01',status:'active',openingAdjustment:10_000},
  ],
  incomes:[
    {id:'i-current',accountId:'bank',type:'extra',description:'Salary',amount:80_000,date:'2026-09-20',month:'2026-09',categoryId:'salary'},
    {id:'i-prev',accountId:'bank',type:'extra',description:'Old salary',amount:60_000,date:'2026-08-20',month:'2026-08',categoryId:'salary'},
  ],
  expenses:[
    {id:'cash-expense',accountId:'cash',nature:'Fijo',concept:'Rent',amount:30_000,date:'2026-09-10',month:'2026-09',categoryId:'housing',paymentMethod:'cash'},
    {id:'card-expense',nature:'Variable',concept:'Groceries',amount:20_000,date:'2026-09-21',month:'2026-09',categoryId:'food',paymentMethod:'credit',debtId:'card'},
    {id:'small',accountId:'cash',nature:'Ocasional',concept:'Coffee',amount:5_000,date:'2026-09-22',month:'2026-09',categoryId:'food',paymentMethod:'cash'},
    {id:'old-expense',accountId:'cash',nature:'Variable',concept:'Old',amount:40_000,date:'2026-08-22',month:'2026-08',categoryId:'food',paymentMethod:'cash'},
  ],
  debtPayments:[
    {id:'pay',accountId:'bank',debtId:'card',date:'2026-09-25',amount:15_000},
  ],
  transfers:[
    {id:'t',fromAccountId:'bank',toAccountId:'inv',amount:10_000,date:'2026-09-26',note:'Invest'},
  ],
};

test('range presets resolve deterministically without reading the clock', () => {
  assert.deepEqual(resolveReportRange('7d','2026-09-28'),{start:'2026-09-22',end:'2026-09-28'});
  assert.deepEqual(resolveReportRange('30d','2026-09-28'),{start:'2026-08-30',end:'2026-09-28'});
  assert.deepEqual(resolveReportRange('3m','2026-09-28'),{start:'2026-06-29',end:'2026-09-28'});
  assert.deepEqual(resolveReportRange('6m','2026-09-28'),{start:'2026-03-29',end:'2026-09-28'});
  assert.deepEqual(resolveReportRange('1y','2026-09-28'),{start:'2025-09-29',end:'2026-09-28'});
  assert.deepEqual(resolveReportRange('custom','2026-09-28',{start:'2026-02-01',end:'2026-02-28'}),{start:'2026-02-01',end:'2026-02-28'});
  assert.throws(()=>resolveReportRange('custom','2026-09-28',{start:'2026-09-01',end:'2026-10-01'}),/futuro/);
});

test('previous comparison uses the immediately preceding range with identical day count', () => {
  const current={start:'2026-09-01',end:'2026-09-30'};
  assert.deepEqual(previousComparableRange(current),{start:'2026-08-02',end:'2026-08-31'});
});

test('Spending counts real purchases once, including card purchases, and separates category from nature', () => {
  const report=selectSpendingReport(input.expenses,{start:'2026-09-01',end:'2026-09-30'});
  assert.equal(report.total,55_000);
  assert.equal(report.transactionCount,3);
  assert.deepEqual(report.categories,[
    {categoryId:'housing',value:30_000},
    {categoryId:'food',value:25_000},
  ]);
  assert.deepEqual(report.byNature.map(row=>[row.nature,row.total,row.count]),[
    ['Fijo',30_000,1],
    ['Variable',20_000,1],
    ['Ocasional',5_000,1],
  ]);
  assert.equal(report.largestTransactions[0].id,'cash-expense');
});

test('Cash Flow excludes credit purchases until the card payment leaves cash', () => {
  const report=selectCashFlowReport(input,{start:'2026-09-01',end:'2026-09-30'});
  assert.equal(report.income,80_000);
  assert.equal(report.cashExpenses,35_000);
  assert.equal(report.debtPayments,15_000);
  assert.equal(report.netCashFlow,30_000);
});

test('Net Worth uses the same ledger selector and includes investments without treating them as liquidity', () => {
  const report=selectNetWorthReport(input,'2026-09-30');
  // Net worth is cumulative through the range end, so August activity still affects balances.
  assert.equal(report.cash,25_000);
  assert.equal(report.banks,315_000);
  assert.equal(report.investments,60_000);
  assert.equal(report.liquidAssets,340_000);
  // Card opening debt 10k + purchase 20k - payment 15k = 15k liability.
  assert.equal(report.creditCardLiabilities,15_000);
  assert.equal(report.netWorth,385_000);
});

test('shared report snapshot compares current versus immediately previous comparable range', () => {
  const report=selectReportsSnapshot(input,{start:'2026-09-01',end:'2026-09-30'});
  assert.equal(report.comparison.spending.current,55_000);
  // Previous comparable window is 2026-08-02..2026-08-31.
  assert.equal(report.comparison.spending.previous,40_000);
  assert.equal(report.comparison.spending.difference,15_000);
  assert.equal(report.comparison.income.current,80_000);
  assert.equal(report.comparison.income.previous,60_000);
});

test('Home and Reports consume the same shared selector exposed by FinanceContext', () => {
  const context=readFileSync(new URL('../src/contexts/finance-context.tsx',import.meta.url),'utf8');
  const home=readFileSync(new URL('../src/components/dashboard/summary-tab.tsx',import.meta.url),'utf8');
  const reports=readFileSync(new URL('../src/components/dashboard/reports-tab.tsx',import.meta.url),'utf8');
  assert.match(context,/getReportSnapshot/);
  assert.match(context,/selectReportsSnapshot/);
  assert.match(home,/getReportSnapshot\(currentPeriod, today\)/);
  assert.match(reports,/getReportSnapshot\(range,range\.end\)/);
});

test('Reports 2.0 UI exposes every required roadmap range and section', () => {
  const ui=readFileSync(new URL('../src/components/dashboard/reports-tab.tsx',import.meta.url),'utf8');
  for (const text of ['7D','30D','3M','6M','1Y','Custom','Spending','Cash Flow','Net Worth','Comparison','Largest transactions','Fixed / Variable / Occasional']) {
    assert.ok(ui.includes(text),text);
  }
});

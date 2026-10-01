import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { selectHomeReadModel } from '../src/domain/home';
import { selectReportsSnapshot } from '../src/domain/reports';
import {
  DEFAULT_HOME_PREFERENCES,
  HOME_MODULES,
  moveHomeModule,
  normalizeHomePreferences,
} from '../src/lib/home-preferences';

const report=selectReportsSnapshot({
  accounts:[
    {id:'cash',name:'Cash',type:'cash',currency:'DOP',openingBalance:100_000,startDate:'2026-01-01'},
    {id:'inv',name:'Investment',type:'investment',currency:'DOP',openingBalance:50_000,startDate:'2026-01-01'},
  ],
  debts:[{id:'card',name:'Card',type:'credit_card',principal:100_000,apr:0,minPayment:0,createdAt:'2026-01-01',status:'active',openingAdjustment:20_000}],
  incomes:[],
  expenses:[],
  debtPayments:[],
  transfers:[],
},{start:'2026-09-01',end:'2026-09-28'});

test('Home read model answers position, budget, upcoming, goals, investments and attention without new ledger math', () => {
  const home=selectHomeReadModel({
    report,
    budgetDetails:[
      {configured:true,limit:40_000,spent:35_000,remaining:5_000,percentage:87.5,status:'alert'},
      {configured:true,limit:20_000,spent:25_000,remaining:-5_000,percentage:125,status:'over'},
    ],
    plannedOccurrences:[
      {id:'overdue',ruleId:'rent',scheduledDate:'2026-09-27',status:'pending'},
      {id:'tomorrow',ruleId:'salary',scheduledDate:'2026-09-29',status:'pending'},
    ],
    recurringRules:[
      {id:'rent',direction:'expense',title:'Rent',amount:30_000,categoryId:'housing',cadence:'monthly',startDate:'2026-01-01',active:true},
      {id:'salary',direction:'income',title:'Salary',amount:80_000,categoryId:'salary',cadence:'monthly',startDate:'2026-01-01',active:true},
    ],
    goals:[
      {id:'goal',name:'Emergency',target:100_000,quota:0,startDate:'2026-01-01',date:'2026-12-31',saved:40_000,status:'active'},
    ],
    investments:[
      {id:'investment',accountId:'inv',type:'certificate',name:'Certificate',openedAt:'2026-01-01',maturityDate:'2026-12-31',principal:50_000,status:'active'},
    ],
    today:'2026-09-28',
    periodStartDay:1,
  });

  assert.equal(home.position.liquidAssets,100_000);
  assert.equal(home.position.investments,50_000);
  assert.equal(home.position.liabilities,20_000);
  assert.equal(home.position.netWorth,130_000);
  assert.deepEqual(
    {limit:home.budget.limit,spent:home.budget.spent,remaining:home.budget.remaining,status:home.budget.status},
    {limit:60_000,spent:60_000,remaining:0,status:'over'},
  );
  assert.equal(home.upcoming.rows[0].occurrence.id,'overdue');
  assert.equal(home.goals[0].remaining,60_000);
  assert.equal(home.investments.totalRegistered,50_000);
  assert.equal(home.investments.rows[0].investment.id,'investment');
  assert.equal(home.attentionCount,2); // overdue occurrence + over-budget category
});

test('Home preferences repair malformed local data and never allow every module to be hidden', () => {
  const normalized=normalizeHomePreferences({
    order:['goals','goals','bogus','position'],
    hidden:['position','budget','upcoming','goals','investments','bogus'],
    defaultSection:'investments',
  });
  assert.deepEqual(normalized.order,['goals','position','budget','upcoming','investments']);
  assert.equal(normalized.hidden.includes('position'),false);
  assert.equal(normalized.defaultSection,'position');
  assert.equal(normalized.order.length,HOME_MODULES.length);
});

test('Home module order is locally reorderable without changing visibility or default section', () => {
  const moved=moveHomeModule(DEFAULT_HOME_PREFERENCES,'budget',-1);
  assert.deepEqual(moved.order,['budget','position','upcoming','goals','investments']);
  assert.deepEqual(moved.hidden,[]);
  assert.equal(moved.defaultSection,'position');

  const withHidden=normalizeHomePreferences({...DEFAULT_HOME_PREFERENCES,hidden:['budget']});
  const visibleMove=moveHomeModule(withHidden,'upcoming',-1);
  assert.deepEqual(visibleMove.order,['upcoming','budget','position','goals','investments']);
});

test('Home UI contains at most the five roadmap modules and removes old dashboard-only extras', () => {
  const ui=readFileSync(new URL('../src/components/dashboard/summary-tab.tsx',import.meta.url),'utf8');
  for(const id of ['position','budget','upcoming','goals','investments']) assert.ok(ui.includes(`HomeSection id="${id}"`),id);
  assert.equal((ui.match(/HomeSection id="/g)||[]).length,5);
  assert.doesNotMatch(ui,/Movimientos recientes/);
  assert.doesNotMatch(ui,/Preferencia de ahorro sugerido/);
  assert.match(ui,/Personalizar Resumen/);
  assert.match(ui,/Sección inicial al abrir Resumen/);
});

test('Home consumes the shared Reports selector and does not import ledger formulas directly', () => {
  const ui=readFileSync(new URL('../src/components/dashboard/summary-tab.tsx',import.meta.url),'utf8');
  assert.match(ui,/getReportSnapshot/);
  assert.match(ui,/selectHomeReadModel/);
  assert.doesNotMatch(ui,/selectPosition/);
  assert.doesNotMatch(ui,/selectNetWorthReport/);
});

test('Savings planning preference moved from Home to finance settings', () => {
  const home=readFileSync(new URL('../src/components/dashboard/summary-tab.tsx',import.meta.url),'utf8');
  const settings=readFileSync(new URL('../src/components/layout/settings-dialog.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(home,/Ahorro sugerido/);
  assert.match(settings,/Ahorro sugerido/);
  assert.match(settings,/savePct/);
  assert.match(settings,/localStorage\.removeItem\(HOME_PREFERENCES_KEY\)/);
});

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import Dexie from 'dexie';
import { db, GlitchBudgetDB } from '../src/lib/db';
import { goalFundingSchedule, goalMetrics, goalSaved, goalView, migrateGoalRecords } from '../src/domain/goals';
import type { Goal, GoalContribution } from '../src/domain/models';
import { recordGoalContribution, removeGoal, saveGoal } from '../src/lib/goal-service';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { selectPeriodMetrics } from '../src/domain/metrics';
import { periodForId } from '../src/domain/periods';

const goal: Goal = { id:'goal', name:'Fondo de emergencia', target:1000, quota:100, startDate:'2026-09-01', date:'2026-12-25' };
const contribution: GoalContribution = { id:'a', goalId:'goal', amount:200, date:'2026-09-25' };
const snapshot = () => db.transaction('r', db.tables, async () => Object.fromEntries(await Promise.all(db.tables.map(async table => [table.name, await table.toArray()]))));
beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => { for (const table of db.tables) await table.clear(); });
});
after(() => db.close());

test('legacy goal progress becomes one opening contribution, is idempotent, and never discards existing contributions', () => {
  const legacy = { ...goal, saved:500, status:'completed' as const };
  const migrated = migrateGoalRecords([legacy], [contribution]);
  assert.deepEqual(migrated.goals, [goal]);
  assert.equal(migrated.contributions.length, 2);
  assert.equal(migrated.contributions[1].kind, 'legacy_balance');
  assert.equal(migrated.contributions[1].amount, 300);
  assert.equal(goalView(migrated.goals[0], migrated.contributions).saved, 500);
  assert.equal(goalView(migrated.goals[0], migrated.contributions).status, 'active');
  assert.deepEqual(migrateGoalRecords(migrated.goals, migrated.contributions), migrated);
  const understated = migrateGoalRecords([{...legacy,saved:100}], [contribution]);
  assert.deepEqual(understated.contributions, [contribution]);
  assert.equal(goalSaved(goal.id, understated.contributions), 200);
  assert.equal(legacy.saved, 500);
});

test('goal migration rejects orphan, duplicate, unsafe, and negative data before persistence', () => {
  assert.throws(() => migrateGoalRecords([], [contribution]), /inexistentes/);
  assert.throws(() => migrateGoalRecords([goal], [contribution, contribution]), /duplicados/);
  assert.throws(() => migrateGoalRecords([goal, goal], []), /duplicados/);
  assert.throws(() => migrateGoalRecords([{...goal,saved:-1}], []), /inválido/);
  assert.throws(() => migrateGoalRecords([{...goal,target:Number.MAX_SAFE_INTEGER+1}], []), /inválido/);
  assert.throws(() => migrateGoalRecords([goal], [{...contribution,amount:Number.MAX_SAFE_INTEGER},{...contribution,id:'b',amount:1}]), /monto admitido/);
});

test('required monthly amount follows financial boundaries, includes current period, and rounds up cents', () => {
  assert.deepEqual(goalFundingSchedule(1000, '2026-10-24', '2026-09-24', {periodStartDay:25}), {periods:2,requiredMonthly:500,overdue:false});
  assert.deepEqual(goalFundingSchedule(1000, '2026-10-24', '2026-09-25', {periodStartDay:25}), {periods:1,requiredMonthly:1000,overdue:false});
  assert.equal(goalFundingSchedule(1000, '2026-11-24', '2026-09-24', {periodStartDay:25}).requiredMonthly, 334);
  assert.equal(goalFundingSchedule(1000, '2024-03-30', '2024-02-29', {periodStartDay:31}).periods, 1);
  assert.equal(goalFundingSchedule(1000, '2024-03-31', '2024-02-29', {periodStartDay:31}).periods, 2);
  assert.equal(goalFundingSchedule(1000, '2027-01-31', '2026-12-31').periods, 2);
});

test('goals handle absent dates, expired deadlines, completion, and overfunding without negative remainder', () => {
  assert.deepEqual(goalFundingSchedule(700, undefined, '2026-09-25'), {periods:null,requiredMonthly:null,overdue:false});
  assert.deepEqual(goalFundingSchedule(700, '2026-09-24', '2026-09-25'), {periods:1,requiredMonthly:700,overdue:true});
  const metrics = goalMetrics({...goal,date:'2026-09-24'}, [{...contribution,amount:1200}], '2026-09-25');
  assert.equal(metrics.saved,1200); assert.equal(metrics.remaining,0); assert.equal(metrics.percentage,120);
  assert.equal(metrics.requiredMonthly,0); assert.equal(metrics.overdue,false); assert.equal(metrics.status,'completed');
});

test('concurrent goal contributions derive totals without lost updates and signal completion once', async () => {
  await saveGoal({...goal,target:500});
  const completions = await Promise.all(Array.from({length:8}, (_,index) => recordGoalContribution({...contribution,id:'concurrent-'+index,amount:100})));
  assert.equal(completions.filter(Boolean).length,1);
  assert.equal(goalSaved(goal.id, await db.goal_contributions.toArray()),800);
  assert.equal('saved' in (await db.goals.get(goal.id))!,false);
  assert.equal('status' in (await db.goals.get(goal.id))!,false);
  const before = await snapshot();
  await assert.rejects(recordGoalContribution({...contribution,id:'concurrent-0'}));
  assert.deepEqual(await snapshot(),before);
});

test('goal services reject invalid dates and overflow atomically and strip derived fields on update', async () => {
  await saveGoal(goal);
  const before = await snapshot();
  await assert.rejects(recordGoalContribution({...contribution,date:'2026-08-31'}), /anterior/);
  await assert.rejects(recordGoalContribution({...contribution,date:'2026-02-30'}));
  await assert.rejects(saveGoal({...goal,date:'2026-08-31'},'update'));
  assert.deepEqual(await snapshot(),before);
  await recordGoalContribution({...contribution,amount:Number.MAX_SAFE_INTEGER});
  await assert.rejects(recordGoalContribution({...contribution,id:'overflow',amount:1}), /monto admitido/);
  assert.equal(await db.goal_contributions.count(),1);
  const view = {...goal, saved:0, status:'active' as const};
  await saveGoal(view,'update');
  assert.equal('saved' in (await db.goals.get(goal.id))!,false);
  assert.equal(goalView((await db.goals.get(goal.id))!,await db.goal_contributions.toArray()).saved,Number.MAX_SAFE_INTEGER);
});

test('goal deletion releases reservations without touching real accounts or movements', async () => {
  await saveGoal(goal);
  await db.accounts.add({id:'cash',name:'Efectivo',type:'cash', currency:'DOP', openingBalance:10000,startDate:'2026-09-01'});
  await db.incomes.add({id:'salary',type:'extra',description:'Cobro',amount:1000,date:'2026-09-25',categoryId:'salary',month:'2026-09',accountId:'cash'});
  const realBefore = {accounts:await db.accounts.toArray(),incomes:await db.incomes.toArray()};
  await recordGoalContribution(contribution);
  await removeGoal(goal.id);
  assert.equal(await db.goals.count(),0); assert.equal(await db.goal_contributions.count(),0);
  assert.deepEqual({accounts:await db.accounts.toArray(),incomes:await db.incomes.toArray()},realBefore);
  for (const table of [db.expenses,db.account_transfers,db.debt_payments]) assert.equal(await table.count(),0);
});

test('v7 backup migrates goal progress once into the current contract without creating a monthly reservation for the opening balance', async () => {
  await saveGoal(goal); await recordGoalContribution(contribution);
  const legacy = JSON.parse(await exportDataJSON());
  legacy.v = 7; legacy.goals[0].saved = 500; legacy.goals[0].status = 'completed';
  await importDataJSON(JSON.stringify(legacy));
  const contributions = await db.goal_contributions.toArray();
  assert.equal(goalSaved(goal.id,contributions),500);
  const metrics = selectPeriodMetrics({settings:(await db.settings.get('general'))!,incomes:[],expenses:[],debtPayments:[],budgets:[],goalContributions:contributions},periodForId('2026-09'));
  assert.equal(metrics.goalContributions,200); assert.equal(metrics.monthlyPlanningMargin,-200);
  const exported = JSON.parse(await exportDataJSON());
  assert.equal(exported.v,13); assert.equal('saved' in exported.goals[0],false); assert.equal('status' in exported.goals[0],false);
  const before = await snapshot();
  await importDataJSON(JSON.stringify(exported));
  assert.deepEqual(await snapshot(),before);
  for (const table of [db.incomes,db.expenses,db.account_transfers,db.debt_payments]) assert.equal(await table.count(),0);
});

async function legacyDatabase(name:string, saved:number) {
  const schema = Object.fromEntries(db.tables.filter(table => table.name !== 'investments').map(table => [table.name,[table.schema.primKey.src,...table.schema.indexes.map(index=>index.src)].join(',')]));
  schema.goals = 'id, status';
  const old = new Dexie(name);
  old.version(11).stores(schema);
  await old.table('goals').put({...goal,saved,status:'active'});
  await old.table('goal_contributions').put(contribution);
  await old.table('accounts').put({id:'cash',name:'Efectivo',type:'cash', currency:'DOP', openingBalance:12345,startDate:'2026-09-01'});
  old.close();
}

test('Dexie v11 upgrades through v14 with canonical goal contributions and currency-normalized real accounts', async () => {
  const name = 'phase10-migration-'+crypto.randomUUID();
  await legacyDatabase(name,500);
  const current = new GlitchBudgetDB(name);
  try {
    await current.open(); assert.equal(current.verno,14);
    assert.deepEqual(await current.goals.get(goal.id),goal);
    assert.equal(goalSaved(goal.id,await current.goal_contributions.toArray()),500);
    assert.equal((await current.accounts.get('cash'))?.openingBalance,12345);
    assert.equal((await current.accounts.get('cash'))?.currency,'DOP');
    current.close(); await current.open();
    assert.equal(await current.goal_contributions.count(),2);
  } finally { await current.delete(); }
});

test('invalid legacy progress aborts v12 upgrade and leaves v11 records intact', async () => {
  const name = 'phase10-rollback-'+crypto.randomUUID();
  await legacyDatabase(name,-1);
  const current = new GlitchBudgetDB(name);
  await assert.rejects(current.open(),/inválido/);
  current.close();
  const check = new Dexie(name);
  try {
    await check.open(); assert.equal(check.verno,11);
    assert.equal((await check.table('goals').get(goal.id)).saved,-1);
    assert.deepEqual(await check.table('goal_contributions').toArray(),[contribution]);
    assert.equal((await check.table('accounts').get('cash')).openingBalance,12345);
  } finally { await check.delete(); }
});

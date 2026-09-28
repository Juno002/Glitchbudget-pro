import { goalSaved } from '../src/domain/goals';
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { parseCSV, encodeCSV, decodeCSVField } from '../src/lib/csv';
import { importIncomesCSV, importExpensesCSV, importGoalContribCSV, importGoalsCSV, importPlansCSV, serializeTableCSV } from '../src/lib/csv-backup';
import { db } from '../src/lib/db';

beforeEach(async () => { await db.transaction('rw', db.tables, async () => { for (const table of db.tables) await table.clear(); }); });
after(() => db.close());
test('CSV round trip supports commas, quotes, accents and multiline descriptions', () => {
  const rows = [['id', 'description'], ['1', 'Café, "pan"\ny leche'], ['2', '']];
  assert.deepEqual(parseCSV('\uFEFF' + encodeCSV(rows)), rows);
});
test('CSV detects malformed quotes', () => {
  assert.throws(() => parseCSV('a,b\n1,"no termina'), /comilla/);
  assert.throws(() => parseCSV('a,b\n1,"cerrado"texto'), /comillas/);
});
test('CSV neutralizes formulas for spreadsheets and restores the original text', () => {
  const cell = parseCSV(encodeCSV([['=SUM(1,2)']]))[0][0];
  assert.equal(cell, "'=SUM(1,2)");
  assert.equal(decodeCSVField(cell), '=SUM(1,2)');
});
test('legacy CSV restores a quoted description without losing characters', async () => {
  await importIncomesCSV(new File(['id,month,date,categoryId,amount,description,type\r\ni,2026-09,2026-09-01,salary,12345,"Trabajo, extra",extra\r\n'], 'income.csv'));
  assert.equal((await db.incomes.get('i'))!.description, 'Trabajo, extra');
  assert.equal((await db.incomes.get('i'))!.amount, 12345);
});
test('CSV rejects malformed amounts without deleting previous data', async () => {
  await db.incomes.add({ id: 'keep', month: '2026-09', date: '2026-09-01', categoryId: 'salary', amount: 100, description: 'Original', type: 'extra' });
  await assert.rejects(importIncomesCSV(new File(['id,month,date,categoryId,amount,description,type\ni,2026-09,2026-09-01,salary,12oops,Error,extra'], 'bad.csv')));
  assert.equal(await db.incomes.count(), 1);
  assert.ok(await db.incomes.get('keep'));
});
test('CSV rejects credit references to unknown cards', async () => {
  await assert.rejects(importExpensesCSV(new File(['id,month,date,categoryId,amount,concept,type,frequency,paymentMethod,debtId\ne,2026-09,2026-09-01,food,123,Café,Variable,,credit,missing'], 'bad.csv')), /tarjeta desconocida/);
});
test('restoring contributions reconciles saved amounts without doubling them', async () => {
  await db.table('goals').add({ id: 'g', name: 'Viaje', saved: 150, target: 1000, quota: 0, status: 'active', startDate: '2026-09-01' });
  await db.goal_contributions.add({ id: 'old', goalId: 'g', amount: 50, date: '2026-09-01' });
  const file = new File(['id,goalId,amount,date\nnew,g,200,2026-09-02'], 'contributions.csv');
  await importGoalContribCSV(file);
  assert.equal(goalSaved('g', await db.goal_contributions.toArray()), 300);
  await importGoalContribCSV(file);
  assert.equal(goalSaved('g', await db.goal_contributions.toArray()), 300);
});


test('current goal CSV pair preserves contributions and migrated progress exactly', async () => {
  await db.goals.add({id:'g',name:'Viaje',target:1000,quota:50,startDate:'2026-09-01'});
  await db.goal_contributions.bulkAdd([
    {id:'actual',goalId:'g',amount:50,date:'2026-09-20'},
    {id:'legacy',goalId:'g',amount:100,date:'2026-09-01',kind:'legacy_balance'},
  ]);
  const goals = await serializeTableCSV('goals');
  const contributions = await serializeTableCSV('goal_contributions');
  const original = await db.goal_contributions.toArray();
  await db.goals.clear(); await db.goal_contributions.clear();
  await importGoalsCSV(new File([goals],'goals.csv'));
  await importGoalContribCSV(new File([contributions],'contributions.csv'));
  await importGoalContribCSV(new File([contributions],'contributions.csv'));
  assert.deepEqual(JSON.parse(JSON.stringify(await db.goal_contributions.toArray())),original);
  assert.equal(goalSaved('g',await db.goal_contributions.toArray()),150);
  assert.ok(!('saved' in (await db.goals.get('g'))!));
});

test('ambiguous legacy goal CSV cannot invent an opening balance before a separate contribution restore', async () => {
  await db.goals.add({id:'keep',name:'Original',target:100,quota:0,startDate:'2026-09-01'});
  const previous = await db.goals.toArray();
  await assert.rejects(importGoalsCSV(new File(['id,name,target,saved,date,quota,startDate,status\ng,Viaje,1000,150,,0,2026-09-01,active'],'legacy.csv')), /respaldo JSON completo/);
  assert.deepEqual(await db.goals.toArray(),previous);
  assert.equal(await db.goal_contributions.count(),0);
});

test('budget CSV round-trip preserves all four period kinds and rejects malformed ranges atomically', async () => {
  const {budgetPeriodContaining}=await import('../src/domain/periods');
  const {budgetPlanForRange}=await import('../src/domain/budgets');
  const rows = (['monthly','weekly','yearly','one_time'] as const).map(kind =>
    budgetPlanForRange(budgetPeriodContaining('2026-09-23',kind,{}, {start:'2026-09-20',end:'2026-10-05'}),'food',1000));
  await db.plans.bulkAdd(rows);
  const csv = await serializeTableCSV('plans');
  await db.plans.clear();
  await importPlansCSV(new File([csv],'plans.csv'));
  assert.deepEqual((await db.plans.toArray()).sort((a,b)=>a.month.localeCompare(b.month)),rows.sort((a,b)=>a.month.localeCompare(b.month)));
  const previous=await db.plans.toArray();
  await assert.rejects(importPlansCSV(new File([csv.replace('2026-09-21','2026-09-22')],'bad.csv')));
  assert.deepEqual(await db.plans.toArray(),previous);
});

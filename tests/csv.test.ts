import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { parseCSV, encodeCSV, decodeCSVField } from '../src/lib/csv';
import { importIncomesCSV, importExpensesCSV, importGoalContribCSV } from '../src/lib/csv-backup';
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
  await db.goals.add({ id: 'g', name: 'Viaje', saved: 150, target: 1000, quota: 0, status: 'active', startDate: '2026-09-01' });
  await db.goal_contributions.add({ id: 'old', goalId: 'g', amount: 50, date: '2026-09-01' });
  const file = new File(['id,goalId,amount,date\nnew,g,200,2026-09-02'], 'contributions.csv');
  await importGoalContribCSV(file);
  assert.equal((await db.goals.get('g'))!.saved, 300);
  await importGoalContribCSV(file);
  assert.equal((await db.goals.get('g'))!.saved, 300);
});

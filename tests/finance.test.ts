import { withoutLegacyCategories } from '../src/domain/categories';
import { seedTestCategories } from './category-fixture';
import { legacyProjectedTotals as calculateTotals, legacyProjectedExpenseForMonth as expenseForMonth } from './reference/phase2-finance';
import 'fake-indexeddb/auto';
import { rollBudgetsIntoMonth } from '../src/lib/budget-rollover';

import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { db, type Expense, type Settings } from '../src/lib/db';
import { calculateRecordedTotals, recordedCategories, isValidDate, localDate, type FinanceSnapshot } from '../src/lib/finance-calculations';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { saveIncome, saveExpense, saveDebtPayment, saveGoalContribution } from '../src/lib/transaction-service';

const settings: Settings = {
  id: 'general', theme: 'serious', strictMode: true, rolloverStrategy: 'reset',
  baseIncome: { freq: 'mensual', amount: 1_000_000 }, savePct: 0.1,
  currency: 'DOP', locale: 'es-DO', incomeCategories: ['salary'], expenseCategories: ['food'],
  customCategoryIcons: { food: 'Pizza' },
};
const expense: Expense = {
  id: 'expense', month: '2026-09', date: '2026-09-16', categoryId: 'food',
  amount: 100_000, concept: 'Comida', nature: 'Variable', paymentMethod: 'cash',
};
const snapshot = (): FinanceSnapshot => ({
  settings: { ...settings, savePct: 0 }, incomes: [], expenses: [expense],
  budgets: [{ month: '2026-09', categoryId: 'food', limit: 400_000 }],
  goalContributions: [], debtPayments: [],
});
beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => { for (const table of db.tables) await table.clear(); });
  await db.settings.put(settings);
});
beforeEach(seedTestCategories);
after(() => db.close());

test('spending within a budget does not reserve the same money twice', () => {
  const totals = calculateTotals(snapshot(), '2026-09');
  assert.equal(totals.available, 600_000);
  assert.equal(totals.balance, 900_000);
  assert.equal(totals.commitments, 300_000);
});
test('overspending one category does not release another category reservation', () => {
  const data = snapshot();
  data.expenses[0] = { ...expense, amount: 500_000 };
  data.budgets.push({ month: '2026-09', categoryId: 'rent', limit: 200_000 });
  assert.equal(calculateTotals(data, '2026-09').available, 300_000);
});
test('debt payments, contributions and savings are each deducted once', () => {
  const data = snapshot();
  data.settings = settings;
  data.debtPayments = [{ id: 'p', debtId: 'card', date: '2026-09-01', amount: 10_000 }];
  data.goalContributions = [{ id: 'c', goalId: 'goal', date: '2026-09-01', amount: 20_000 }];
  assert.equal(calculateTotals(data, '2026-09').available, 470_000);
});
test('frozen legacy oracle characterizes the retired fixed-frequency projection', () => {
  const fixed = { ...expense, nature: 'Fijo' as const, frequency: 'quincenal' as const };
  assert.equal(expenseForMonth(fixed, '2026-08'), 0);
  assert.equal(expenseForMonth(fixed, '2026-09'), 200_000);
  assert.equal(expenseForMonth(fixed, '2026-10'), 200_000);
});
test('calendar validation rejects invalid days and preserves local dates', () => {
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('2024-02-29'), true);
  assert.equal(localDate(new Date(2026, 8, 16, 23, 59)), '2026-09-16');
});
test('income month follows the selected date on create and edit', async () => {
  await saveIncome({ id: 'i', date: '2026-08-31', amount: 123.45, type: 'gift', description: 'Regalo', categoryId: 'salary' });
  const income = (await db.incomes.get('i'))!;
  assert.equal(income.month, '2026-08');
  assert.equal(income.amount, 12345);
  await saveIncome({ ...income, amount: 123.45, date: '2026-10-01' }, true);
  assert.equal((await db.incomes.get('i'))!.month, '2026-10');
});

test('new income respects an explicit destination account and defaults to cash only when omitted', async () => {
  await db.accounts.add({ id: 'bank', name: 'Qik', type: 'bank', openingBalance: 0, startDate: '2026-09-01' });
  await saveIncome({ id: 'bank-income', accountId: 'bank', date: '2026-09-02', amount: 100, type: 'extra', description: 'Depósito', categoryId: 'salary' });
  assert.equal((await db.incomes.get('bank-income'))?.accountId, 'bank');

  await saveIncome({ id: 'cash-income', date: '2026-09-03', amount: 50, type: 'extra', description: 'Efectivo', categoryId: 'salary' });
  const cash = (await db.accounts.toArray()).find(account => account.isDefaultCash);
  assert.ok(cash);
  assert.equal((await db.incomes.get('cash-income'))?.accountId, cash.id);
});
test('expense month follows the date when edited', async () => {
  await db.expenses.add(expense);
  await saveExpense({ ...expense, amount: 1000, date: '2026-08-31' }, true);
  assert.equal((await db.expenses.get(expense.id))!.month, '2026-08');
});
test('invalid amounts and dates never enter storage', async () => {
  for (const amount of [NaN, Infinity, -1, 0, 0.001]) {
    await assert.rejects(saveExpense({ ...expense, amount }));
  }
  await assert.rejects(saveExpense({ ...expense, date: '2026-02-30' }));
  assert.equal(await db.expenses.count(), 0);
});
test('strict mode lets a user spend reserved category funds', async () => {
  await saveIncome({ id:'funds',date:'2026-09-01',amount:1000,type:'extra',description:'',categoryId:'salary' });
  await db.plans.add({ month: '2026-09', categoryId: 'food', limit: 900_000 });
  await saveExpense({ ...expense, amount: 1000 });
  assert.equal(await db.expenses.count(), 1);
});
test('projected salary cannot fund an actual cash expense', async () => {
  await db.plans.add({ month: '2026-09', categoryId: 'rent', limit: 900_000 });
  await assert.rejects(saveExpense({ ...expense, amount: 1000 }), /Saldo insuficiente/);
  assert.equal(await db.expenses.count(), 0);
});
test('actual cash carries across months without another salary deposit', async () => {
  await db.settings.update('general', { baseIncome: { freq: 'mensual', amount: 0 }, savePct: 0 });
  await saveIncome({ id: 'i', date: '2026-08-01', amount: 1000, type: 'extra', description: '', categoryId: 'salary' });
  await saveExpense({ ...expense, amount: 900, date: '2026-08-31' });
  await saveExpense({ ...expense, id: 'next', amount: 100, date: '2026-09-01' });
  await assert.rejects(saveExpense({ ...expense, id: 'over', amount: 0.01, date: '2026-09-01' }), /Saldo insuficiente/);
});
test('concurrent writes cannot overspend a strict cash balance', async () => {
  await saveIncome({ id:'funds',date:'2026-09-01',amount:100,type:'extra',description:'',categoryId:'salary' });
  await db.settings.update('general', { baseIncome: { freq: 'mensual', amount: 10_000 }, savePct: 0 });
  const results = await Promise.allSettled([
    saveExpense({ ...expense, id: 'a', amount: 80 }), saveExpense({ ...expense, id: 'b', amount: 80 }),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await db.expenses.count(), 1);
});
test('credit spending requires an active card and does not spend cash', async () => {
  await assert.rejects(saveExpense({ ...expense, paymentMethod: 'credit', amount: 1000 }), /tarjeta/);
  await db.debts.add({ id: 'card', name: 'Visa', type: 'credit_card', principal: 100_000, apr: 0, minPayment: 0, createdAt: new Date().toISOString(), status: 'active' });
  await saveExpense({ ...expense, paymentMethod: 'credit', debtId: 'card', amount: 1000 });
  assert.equal((await db.expenses.get(expense.id))!.debtId, 'card');
  const data = snapshot(); data.expenses = await db.expenses.toArray();
  assert.equal(calculateTotals(data, '2026-09').totalExpenses, 0);
});
test('editing a deleted movement does not recreate it', async () => {
  await assert.rejects(saveExpense({ ...expense, amount: 1 }, true), /ya no existe/);
});
test('legacy month-wide recurrence duplicate guard is retired', async () => {
  await db.recurrents.add({id:'subscription',direction:'expense',title:'Plan',categoryId:'food',amount:1000,cadence:'monthly',startDate:'2026-09-01',active:true});
  await saveIncome({ id:'funds',date:'2026-09-01',amount:100,type:'extra',description:'',categoryId:'salary' });
  await saveExpense({ ...expense, recurringRuleId: 'subscription', amount: 10 });
  await saveExpense({ ...expense, id: 'second', recurringRuleId: 'subscription', amount: 10 });
  await saveExpense({ ...expense, id: 'next-month', date: '2026-10-01', recurringRuleId: 'subscription', amount: 10 });
  assert.equal(await db.expenses.count(), 3);
});
test('JSON round trip preserves expense nature, goal quotas and settings', async () => {
  await db.expenses.add({ ...expense, nature: 'Fijo' });
  await db.incomes.add({ id: 'i', date: '2026-09-01', month: '2026-09', amount: 125, categoryId: 'salary', type: 'gift', description: 'Regalo' });
  await db.goals.add({ id: 'g', name: 'Viaje', target: 100_000, saved: 1000, quota: 5000, startDate: '2026-09-01', status: 'active' });
  const original = await exportDataJSON();
  await importDataJSON(original);
  assert.deepEqual(await db.settings.get('general'), { ...withoutLegacyCategories(settings), preventNegativeAccountBalance: true, budgetOverspendingBehavior: 'block' });
  assert.equal('frequency' in (await db.expenses.get(expense.id))!, false);
  assert.equal((await db.expenses.get(expense.id))!.nature, 'Fijo');
  assert.equal((await db.incomes.get('i'))!.type, 'gift');
  assert.equal((await db.goals.get('g'))!.quota, 5000);
});
test('period start day round-trips in v6 and invalid values reject atomically', async () => {
  await db.settings.update('general', { periodStartDay: 25 });
  const backup = JSON.parse(await exportDataJSON());
  assert.equal(backup.settings.periodStartDay, 25);
  await importDataJSON(JSON.stringify(backup));
  assert.equal((await db.settings.get('general'))?.periodStartDay, 25);

  const invalid = structuredClone(backup);
  invalid.settings.periodStartDay = 32;
  await assert.rejects(importDataJSON(JSON.stringify(invalid)));
  assert.equal((await db.settings.get('general'))?.periodStartDay, 25);

  const legacy = structuredClone(backup);
  delete legacy.settings.periodStartDay;
  await importDataJSON(JSON.stringify(legacy));
  assert.equal((await db.settings.get('general'))?.periodStartDay, undefined);
});

test('budget rollover uses the previous financial period date range', async () => {
  await db.settings.update('general', { periodStartDay: 25, rolloverStrategy: 'accumulate_surplus' });
  await db.plans.add({ month: '2026-09', categoryId: 'food', limit: 50_000 });
  await db.expenses.bulkAdd([
    { id:'inside', month:'2026-08', date:'2026-08-26', categoryId:'food', amount:30_000, concept:'Dentro', nature:'Variable' },
    { id:'outside', month:'2026-09', date:'2026-09-25', categoryId:'food', amount:40_000, concept:'Siguiente', nature:'Variable' },
  ]);
  assert.equal(await rollBudgetsIntoMonth('2026-10'), true);
  assert.equal((await db.plans.get(['2026-10','food']))?.limit, 70_000);
});

test('old v3 backups still restore with explicit defaults', async () => {
  await db.expenses.add(expense);
  const backup = JSON.parse(await exportDataJSON());
  backup.v = 3; delete backup.accounts; delete backup.accountTransfers;
  delete backup.settings.savePct; delete backup.settings.customCategoryIcons;
  delete backup.expenses[0].type;
  await importDataJSON(JSON.stringify(backup));
  assert.equal((await db.expenses.get(expense.id))!.nature, 'Variable');
  assert.equal((await db.settings.get('general'))!.savePct, 0);
});
test('invalid backup records are rejected before any data is replaced', async () => {
  await db.expenses.add(expense);
  const backup = JSON.parse(await exportDataJSON());
  backup.debts = [{ id: 'broken' }];
  await assert.rejects(importDataJSON(JSON.stringify(backup)));
  assert.deepEqual(await db.expenses.get(expense.id), expense);
});
test('a failed restore rolls back every table', async () => {
  await db.expenses.add(expense);
  const backup = JSON.parse(await exportDataJSON());
  backup.expenses.push(backup.expenses[0]);
  backup.settings.baseIncome.amount = 1;
  await assert.rejects(importDataJSON(JSON.stringify(backup)));
  assert.deepEqual(await db.settings.get('general'), settings);
  assert.deepEqual(await db.expenses.get(expense.id), expense);
});

async function seedOutgoing() {
  await db.settings.update('general', { baseIncome: { freq: 'mensual', amount: 10_000 }, savePct: 0 });
  await db.debts.add({ id: 'card', name: 'Prueba', type: 'credit_card', principal: 100_000, apr: 0, minPayment: 0, createdAt: new Date().toISOString(), status: 'active' });
  await db.goals.add({ id: 'goal', name: 'Meta', target: 20_000, saved: 0, quota: 0, startDate: '2026-09-01', status: 'active' });
}
test('concurrent card payments cannot spend the same actual cash', async () => {
  await seedOutgoing();
  await saveIncome({ id:'funds',date:'2026-09-01',amount:100,type:'extra',description:'',categoryId:'salary' });
  const results = await Promise.allSettled([
    saveDebtPayment({ id: 'payment', debtId: 'card', amount: 8_000, date: '2026-09-17' }),
    saveDebtPayment({ id: 'payment2', debtId: 'card', amount: 8_000, date: '2026-09-17' }),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await db.debt_payments.count() + await db.goal_contributions.count(), 1);
});
test('invalid outgoing dates and closed cards never create payments', async () => {
  await seedOutgoing();
  await assert.rejects(saveDebtPayment({ id: 'p', debtId: 'card', amount: 100, date: '2026-02-30' }));
  await db.debts.update('card', { status: 'closed' });
  await assert.rejects(saveDebtPayment({ id: 'p', debtId: 'card', amount: 100, date: '2026-09-17' }));
  assert.equal(await db.debt_payments.count(), 0);
});
test('failed goal contribution leaves saved amount and history unchanged', async () => {
  await seedOutgoing();
  await assert.rejects(saveGoalContribution({ id: 'c', goalId: 'goal', amount: -1, date: '2026-09-17' }));
  assert.equal((await db.goals.get('goal'))?.saved, 0);
  assert.equal(await db.goal_contributions.count(), 0);
});
test('non-strict mode allows a payment beyond available cash', async () => {
  await seedOutgoing();
  await db.settings.update('general', { strictMode: false });
  await saveDebtPayment({ id: 'p', debtId: 'card', amount: 20_000, date: '2026-09-17' });
  assert.equal(await db.debt_payments.count(), 1);
});
test('rollover across December is atomic and idempotent', async () => {
  await db.settings.update('general', { rolloverStrategy: 'accumulate_surplus' });
  await db.plans.add({ month: '2026-12', categoryId: 'food', limit: 10_000 });
  await db.expenses.add({ ...expense, date: '2026-12-15', month: '2026-12', amount: 4_000 });
  const result = await Promise.all([rollBudgetsIntoMonth('2027-01'), rollBudgetsIntoMonth('2027-01')]);
  assert.equal(result.filter(Boolean).length, 1);
  assert.equal((await db.plans.get(['2027-01', 'food']))?.limit, 16_000);
});
test('debt rollover reduces the next budget without generating negative limits', async () => {
  await db.settings.update('general', { rolloverStrategy: 'accumulate_debt' });
  await db.plans.add({ month: '2026-09', categoryId: 'food', limit: 10_000 });
  await db.expenses.add({ ...expense, amount: 25_000 });
  await rollBudgetsIntoMonth('2026-10');
  assert.equal((await db.plans.get(['2026-10', 'food']))?.limit, 0);
});
test('rollover preserves a manually prepared destination month', async () => {
  await db.settings.update('general', { rolloverStrategy: 'accumulate_surplus' });
  await db.plans.bulkAdd([{ month: '2026-09', categoryId: 'food', limit: 10_000 }, { month: '2026-10', categoryId: 'food', limit: 5_000 }]);
  assert.equal(await rollBudgetsIntoMonth('2026-10'), false);
  assert.equal((await db.plans.get(['2026-10', 'food']))?.limit, 5_000);
});

test('large local history survives a full JSON backup and restore', async () => {
  await db.expenses.bulkAdd(Array.from({ length: 10_000 }, (_, index) => ({ ...expense, id: 'history-' + index, amount: 101 })));
  const backup = await exportDataJSON();
  await importDataJSON(backup);
  assert.equal(await db.expenses.count(), 10_000);
  const rows = await db.expenses.toArray();
  assert.equal(calculateTotals({ ...snapshot(), expenses: rows }, '2026-09').totalExpenses, 1_010_000);
});

test('recorded totals never turn salary forecasts or fixed frequencies into actual movements',()=>{
  const data=snapshot();data.expenses=[{...expense,nature:'Fijo'}];
  const september=calculateRecordedTotals(data,'2026-09');
  assert.equal(september.totalIncome,0);assert.equal(september.totalExpenses,100000);assert.equal(september.balance,-100000);
  assert.equal(recordedCategories(data.expenses,'2026-09')[0].value,100000);
  assert.equal(calculateRecordedTotals(data,'2026-10').totalExpenses,0);assert.deepEqual(recordedCategories(data.expenses,'2026-10'),[]);
});
test('card purchases consume category budget once and repayments do not repeat the expense',()=>{
  const data=snapshot();data.settings={...data.settings,baseIncome:{freq:'mensual',amount:0},savePct:0};
  data.incomes=[{id:'i',date:'2026-09-01',month:'2026-09',amount:1000000,categoryId:'salary',description:'Cobro',type:'extra'}];
  data.expenses=[{...expense,paymentMethod:'credit',debtId:'card'}];data.debtPayments=[{id:'p',date:'2026-09-17',debtId:'card',amount:100000}];
  const t=calculateRecordedTotals(data,'2026-09');assert.equal(t.totalExpenses,100000);assert.equal(t.commitments,300000);assert.equal(t.balance,900000);assert.equal(t.cashFlow,900000);assert.equal(t.available,600000);
});

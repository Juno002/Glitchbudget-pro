import { legacyProjectedTotals as calculateTotals, legacyProjectedExpenseForMonth as expenseForMonth } from './reference/phase2-finance';
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { calculateRecordedTotals, type FinanceSnapshot } from '../src/lib/finance-calculations';
import { accountPosition } from '../src/lib/accounts';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/backup-v4.json', import.meta.url), 'utf8'));
function empty(): FinanceSnapshot {
  return { settings: { baseIncome: { amount: 0, freq: 'mensual' }, savePct: 0 }, incomes: [], expenses: [], budgets: [], goalContributions: [], debtPayments: [] };
}
test('characterization: monthly result and cash flow have deliberately different meanings', () => {
  const data = { ...empty(), incomes: fixture.incomes, expenses: fixture.expenses, debtPayments: fixture.debtPayments };
  const totals = calculateRecordedTotals(data, '2026-09');
  assert.equal(totals.totalIncome, 100000);
  assert.equal(totals.totalExpenses, 30000);
  assert.equal(totals.balance, 70000);
  assert.equal(totals.cashFlow, 80000);
  const withoutPayments = calculateRecordedTotals({ ...data, debtPayments: [] }, '2026-09');
  assert.equal(withoutPayments.balance, totals.balance);
  assert.equal(withoutPayments.cashFlow, totals.cashFlow + 10000);
});
test('characterization: legacy planned income and recorded income diverge (review required)', () => {
  const data = empty();
  data.settings.baseIncome.amount = 100000;
  assert.equal(calculateTotals(data, '2026-09').available, 100000);
  assert.equal(calculateRecordedTotals(data, '2026-09').available, 0);
});
test('characterization: planning reserves change monthly margin but not recorded result or cash flow', () => {
  const data = { ...empty(), incomes: fixture.incomes, expenses: fixture.expenses, debtPayments: fixture.debtPayments };
  const before = calculateRecordedTotals(data, '2026-09');
  const after = calculateRecordedTotals({ ...data, budgets: fixture.plans, goalContributions: fixture.goalContributions, settings: fixture.settings }, '2026-09');
  assert.equal(after.balance, before.balance);
  assert.equal(after.cashFlow, before.cashFlow);
  assert.equal(after.commitments, 35000);
  assert.equal(after.available, 35000);
});
test('characterization: card surplus increases net worth, never liquid cash or available credit assets', () => {
  const data = { incomes: [], expenses: [], payments: [], transfers: [] };
  const card = { ...fixture.debts[0], openingAdjustment: -5000 };
  const p = accountPosition(fixture.accounts, [card], data, '2026-09-30');
  assert.equal(p.liquid, 220000);
  assert.equal(p.owed, 0);
  assert.equal(p.credit, 5000);
  assert.equal(p.net, 225000);
  assert.deepEqual(accountPosition(fixture.accounts, [{ ...card, principal: card.principal * 2 }], data, '2026-09-30').net, p.net);
});

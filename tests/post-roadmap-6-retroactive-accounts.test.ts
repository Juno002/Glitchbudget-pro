import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, beforeEach, test } from 'node:test';

import { accountStartDateBounds, assertAccountStartDateAllowed } from '../src/domain/account-start';
import { selectAccountBalance, selectAccountHasActivity, selectPosition } from '../src/domain/ledger';
import type { Account, AccountSnapshot, Expense, Income } from '../src/domain/models';
import { selectReportsSnapshot } from '../src/domain/reports';
import { shiftPeriodId } from '../src/domain/periods';
import { db } from '../src/lib/db';
import { addAccount, ensureCashAccount, hasAccountActivity, requireAccount } from '../src/lib/accounts';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { localDate } from '../src/lib/finance-calculations';

const today = localDate();
const bounds = accountStartDateBounds(today);

const baseAccount = (id = 'bank'): Account => ({
  id,
  name: id === 'cash' ? 'Efectivo' : 'Banco',
  type: id === 'cash' ? 'cash' : 'bank',
  currency: 'DOP',
  openingBalance: 100_000,
  startDate: today,
  ...(id === 'cash' ? { isDefaultCash: true } : {}),
});

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
  await db.settings.put({
    id: 'general',
    theme: 'light',
    strictMode: true,
    preventNegativeAccountBalance: true,
    rolloverStrategy: 'reset',
    baseIncome: { freq: 'mensual', amount: 0 },
    savePct: 0,
    currency: 'DOP',
    locale: 'es-DO',
    incomeCategories: [],
    expenseCategories: [],
  });
});

after(() => db.close());

test('post-roadmap 6 uses a canonical previous-calendar-month boundary', () => {
  assert.deepEqual(accountStartDateBounds('2026-10-02'), { min: '2026-09-01', max: '2026-10-02' });
  assert.equal(assertAccountStartDateAllowed('2026-09-01', '2026-10-02'), '2026-09-01');
  assert.throws(() => assertAccountStartDateAllowed('2026-08-31', '2026-10-02'), /anterior/i);
  assert.throws(() => assertAccountStartDateAllowed('2026-10-03', '2026-10-02'), /futuro/i);
});

test('new accounts accept the retroactive window and reject future or older starts', async () => {
  await addAccount({ ...baseAccount('retro'), startDate: bounds.min });
  assert.equal((await db.accounts.get('retro'))?.startDate, bounds.min);

  await assert.rejects(
    addAccount({ ...baseAccount('future'), startDate: '9999-12-31' }),
    /futuro/i,
  );
  const tooOld = `${shiftPeriodId(today.slice(0, 7), -2)}-28`;
  await assert.rejects(
    addAccount({ ...baseAccount('old'), startDate: tooOld }),
    /anterior/i,
  );
});

test('startDate can move inside the window while the account has no activity', async () => {
  const account = baseAccount();
  await addAccount(account);
  await addAccount({ ...account, startDate: bounds.min, openingBalance: 25_000 }, true);
  const stored = await db.accounts.get(account.id);
  assert.equal(stored?.startDate, bounds.min);
  assert.equal(stored?.openingBalance, 25_000);
});

const activityCases: Array<[string, () => Promise<void>]> = [
  ['assigned income', async () => {
    await db.incomes.add({ id:'income', date:today, month:today.slice(0,7), amount:10_000, amountBase:10_000, currency:'DOP', fxRate:1, categoryId:'salary', description:'Ingreso', type:'extra', accountId:'bank' });
  }],
  ['account expense', async () => {
    await db.expenses.add({ id:'expense', date:today, month:today.slice(0,7), amount:10_000, amountBase:10_000, currency:'DOP', fxRate:1, categoryId:'food', concept:'Gasto', nature:'Variable', paymentMethod:'cash', accountId:'bank' });
  }],
  ['debt payment from account', async () => {
    await db.debt_payments.add({ id:'payment', debtId:'card', date:today, amount:10_000, accountId:'bank' });
  }],
  ['outgoing transfer', async () => {
    await db.account_transfers.add({ id:'out', fromAccountId:'bank', toAccountId:'other', amount:10_000, date:today, note:'' });
  }],
  ['incoming transfer', async () => {
    await db.account_transfers.add({ id:'in', fromAccountId:'other', toAccountId:'bank', amount:10_000, date:today, note:'' });
  }],
];

for (const [label, addActivity] of activityCases) {
  test(`startDate is immutable after ${label}`, async () => {
    const account = baseAccount();
    await addAccount(account);
    await addActivity();
    assert.equal(await hasAccountActivity(account.id), true);
    await assert.rejects(
      addAccount({ ...account, startDate: bounds.min }, true),
      /fecha inicial.*movimientos registrados/i,
    );
    assert.equal((await db.accounts.get(account.id))?.startDate, today);
  });
}

test('openingBalance remains correctable after activity while startDate stays fixed', async () => {
  const account = baseAccount();
  await addAccount(account);
  await db.incomes.add({ id:'income', date:today, month:today.slice(0,7), amount:10_000, categoryId:'salary', description:'Ingreso', type:'extra', accountId:'bank' });
  await addAccount({ ...account, openingBalance: 120_000 }, true);
  const stored = (await db.accounts.get(account.id))!;
  assert.equal(stored.startDate, today);
  assert.equal(stored.openingBalance, 120_000);
});

test('movement dates before account start remain invalid', async () => {
  await addAccount({ ...baseAccount(), startDate: today });
  const previousMonthEnd = `${shiftPeriodId(today.slice(0, 7), -1)}-28`;
  await assert.rejects(requireAccount('bank', previousMonthEnd), /anterior al inicio/i);
});

test('cash uses the same retroactive start rule while it has no activity', async () => {
  const cash = await ensureCashAccount();
  await addAccount({ ...cash, startDate: bounds.min, openingBalance: 35_000 }, true);
  const stored = (await db.accounts.get(cash.id))!;
  assert.equal(stored.startDate, bounds.min);
  assert.equal(stored.openingBalance, 35_000);

  await db.expenses.add({ id:'cash-expense', date:today, month:today.slice(0,7), amount:5_000, categoryId:'food', concept:'Compra', nature:'Variable', paymentMethod:'cash', accountId:cash.id });
  await assert.rejects(
    addAccount({ ...stored, startDate: today }, true),
    /movimientos registrados/i,
  );
});

test('opening balance affects balance and net worth but never report income spending or cash flow', () => {
  const account: Account = { id:'retro', name:'Retro', type:'bank', currency:'DOP', openingBalance:300_000, startDate:'2026-09-30' };
  const data: AccountSnapshot = { incomes:[], expenses:[], payments:[], transfers:[] };
  assert.equal(selectAccountBalance(account, data, '2026-10-02'), 300_000);
  assert.equal(selectPosition([account], [], data, '2026-10-02').netWorth, 300_000);

  const report = selectReportsSnapshot(
    { accounts:[account], debts:[], incomes:[], expenses:[], debtPayments:[], transfers:[] },
    { start:'2026-09-30', end:'2026-10-02' },
  );
  assert.equal(report.cashFlow.income, 0);
  assert.equal(report.spending.total, 0);
  assert.equal(report.cashFlow.netCashFlow, 0);
  assert.equal(report.netWorth.netWorth, 300_000);
});

test('30 Sep salary and following expenses reconstruct the real 9,000 balance without double counting opening', () => {
  const account: Account = { id:'retro', name:'Retro', type:'bank', currency:'DOP', openingBalance:0, startDate:'2026-09-30' };
  const incomes: Income[] = [{
    id:'salary', date:'2026-09-30', month:'2026-09', amount:1_100_000, amountBase:1_100_000,
    currency:'DOP', fxRate:1, categoryId:'salary', description:'Sueldo', type:'extra', accountId:'retro',
  }];
  const expenses: Expense[] = [
    { id:'e1', date:'2026-09-30', month:'2026-09', amount:50_000, amountBase:50_000, currency:'DOP', fxRate:1, categoryId:'food', concept:'Gasto 1', nature:'Variable', paymentMethod:'cash', accountId:'retro' },
    { id:'e2', date:'2026-10-01', month:'2026-10', amount:150_000, amountBase:150_000, currency:'DOP', fxRate:1, categoryId:'food', concept:'Gasto 2', nature:'Variable', paymentMethod:'cash', accountId:'retro' },
  ];
  const data: AccountSnapshot = { incomes, expenses, payments:[], transfers:[] };
  assert.equal(selectAccountBalance(account, data, '2026-10-02'), 900_000);

  const report = selectReportsSnapshot(
    { accounts:[account], debts:[], incomes, expenses, debtPayments:[], transfers:[] },
    { start:'2026-09-30', end:'2026-10-02' },
  );
  assert.equal(report.cashFlow.income, 1_100_000);
  assert.equal(report.spending.total, 200_000);
  assert.equal(report.cashFlow.cashExpenses, 200_000);
  assert.equal(report.cashFlow.netCashFlow, 900_000);
  assert.equal(report.netWorth.netWorth, 900_000);
});

test('backup v14 round-trip preserves retroactive bank and cash starts without schema changes', async () => {
  await addAccount({ ...baseAccount('retro'), startDate: bounds.min, openingBalance: 12_345 });
  const cash = await ensureCashAccount();
  await addAccount({ ...cash, startDate: bounds.min, openingBalance: 54_321 }, true);

  const exported = JSON.parse(await exportDataJSON());
  assert.equal(exported.v, 14);
  assert.equal(exported.schemaVersion, 15);

  const bankBefore = exported.accounts.find((row: Account) => row.id === 'retro');
  const cashBefore = exported.accounts.find((row: Account) => row.id === cash.id);
  assert.equal(bankBefore.startDate, bounds.min);
  assert.equal(bankBefore.openingBalance, 12_345);
  assert.equal(cashBefore.startDate, bounds.min);
  assert.equal(cashBefore.openingBalance, 54_321);

  await importDataJSON(JSON.stringify(exported));
  assert.deepEqual(
    { startDate:(await db.accounts.get('retro'))?.startDate, openingBalance:(await db.accounts.get('retro'))?.openingBalance },
    { startDate:bounds.min, openingBalance:12_345 },
  );
  assert.deepEqual(
    { startDate:(await db.accounts.get(cash.id))?.startDate, openingBalance:(await db.accounts.get(cash.id))?.openingBalance },
    { startDate:bounds.min, openingBalance:54_321 },
  );
});

test('UI exposes retroactive tracking date and explicit opening-balance correction', () => {
  const source = readFileSync(new URL('../src/components/dashboard/accounts-overview.tsx', import.meta.url), 'utf8');
  assert.match(source, /Llevar esta cuenta desde/);
  assert.match(source, /Saldo al inicio de ese día/);
  assert.match(source, /Corregir saldo inicial/);
  assert.match(source, /Saldo calculado hoy/);
  assert.match(source, /La fecha inicial está bloqueada porque/);
});

test('pure activity selector includes every account-affecting movement family', () => {
  const empty: AccountSnapshot = { incomes:[], expenses:[], payments:[], transfers:[] };
  assert.equal(selectAccountHasActivity('a', empty), false);
  assert.equal(selectAccountHasActivity('a', { ...empty, incomes:[{ accountId:'a' } as Income] }), true);
  assert.equal(selectAccountHasActivity('a', { ...empty, expenses:[{ accountId:'a', paymentMethod:'cash' } as Expense] }), true);
  assert.equal(selectAccountHasActivity('a', { ...empty, payments:[{ accountId:'a' } as any] }), true);
  assert.equal(selectAccountHasActivity('a', { ...empty, transfers:[{ fromAccountId:'a' } as any] }), true);
  assert.equal(selectAccountHasActivity('a', { ...empty, transfers:[{ toAccountId:'a' } as any] }), true);
  assert.equal(selectAccountHasActivity('a', { ...empty, expenses:[{ accountId:'a', paymentMethod:'credit' } as Expense] }), false);
});

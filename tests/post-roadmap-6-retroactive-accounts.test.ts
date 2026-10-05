import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, beforeEach, test } from 'node:test';

import { accountStartDateBounds, assertAccountStartDateAllowed, assertEditedAccountStartDateAllowed, resolveEditedAccountStartDate } from '../src/domain/account-start';
import { selectAccountBalance, selectAccountHasActivity, selectPosition, type AccountSnapshot } from '../src/domain/ledger';
import type { Account, Expense, Income } from '../src/domain/models';
import { asCents } from '../src/domain/money';
import { selectReportsSnapshot } from '../src/domain/reports';
import { shiftPeriodId } from '../src/domain/periods';
import { db } from '../src/lib/db';
import { addAccount, ensureCashAccount, hasAccountActivity, requireAccount } from '../src/lib/accounts';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { localDate } from '../src/lib/finance-calculations';
import { saveIncome } from '../src/lib/transaction-service';

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
  test(`startDate may move backward after ${label} but never forward`, async () => {
    const account = baseAccount();
    await addAccount(account);
    await addActivity();
    assert.equal(await hasAccountActivity(account.id), true);

    await addAccount({ ...account, startDate: bounds.min }, true);
    assert.equal((await db.accounts.get(account.id))?.startDate, bounds.min);

    await assert.rejects(
      addAccount({ ...account, startDate: today }, true),
      /solo puede moverse hacia atrás/i,
    );
    assert.equal((await db.accounts.get(account.id))?.startDate, bounds.min);
  });
}

test('edited start-date policy allows a backward rebase with activity and rejects a forward move', () => {
  assert.equal(
    assertEditedAccountStartDateAllowed('2026-10-02', '2026-09-30', '2026-10-04', true),
    '2026-09-30',
  );
  assert.throws(
    () => assertEditedAccountStartDateAllowed('2026-09-30', '2026-10-02', '2026-10-04', true),
    /solo puede moverse hacia atrás/i,
  );
  assert.equal(
    assertEditedAccountStartDateAllowed('2026-10-02', '2026-10-04', '2026-10-04', false),
    '2026-10-04',
  );
});

test('account with activity can rebase backward and then register a real retroactive income', async () => {
  const account = { ...baseAccount(), openingBalance:50_000 };
  await addAccount(account);
  await db.expenses.add({
    id:'current-expense',
    date:today,
    month:today.slice(0,7),
    amount:10_000,
    amountBase:10_000,
    currency:'DOP',
    fxRate:1,
    categoryId:'food',
    concept:'Gasto existente',
    nature:'Variable',
    paymentMethod:'cash',
    accountId:'bank',
  });
  assert.equal(selectAccountBalance(account, {
    incomes:[],
    expenses:await db.expenses.toArray(),
    payments:[],
    transfers:[],
  }, today), 40_000);

  await addAccount({ ...account, startDate:bounds.min, openingBalance:0 }, true);
  const rebasedBeforeHistory = (await db.accounts.get('bank'))!;
  assert.equal(selectAccountBalance(rebasedBeforeHistory, {
    incomes:[],
    expenses:await db.expenses.toArray(),
    payments:[],
    transfers:[],
  }, today), -10_000);

  await db.categories.add({
    id:'salary',
    name:'Sueldo',
    type:'income',
    iconName:'landmark',
    archived:false,
    incomeOrder:0,
  });

  await saveIncome({
    id:'retro-income',
    date:bounds.min,
    amount:asCents(50_000),
    amountBase:50_000,
    currency:'DOP',
    fxRate:1,
    categoryId:'salary',
    description:'Ingreso retroactivo',
    type:'extra',
    accountId:'bank',
  });

  const stored = (await db.accounts.get('bank'))!;
  const snapshot: AccountSnapshot = {
    incomes:await db.incomes.toArray(),
    expenses:await db.expenses.toArray(),
    payments:[],
    transfers:[],
  };
  assert.equal(stored.startDate, bounds.min);
  assert.equal(stored.openingBalance, 0);
  assert.equal(selectAccountBalance(stored, snapshot, today), 40_000);

  const report = selectReportsSnapshot(
    { accounts:[stored], debts:[], incomes:snapshot.incomes, expenses:snapshot.expenses, debtPayments:[], transfers:[] },
    { start:bounds.min, end:today },
  );
  assert.equal(report.cashFlow.income, 50_000);
  assert.equal(report.spending.total, 10_000);
  assert.equal(report.cashFlow.netCashFlow, 40_000);
});


test('new income can atomically extend account history when opening balance is supplied', async () => {
  const account = { ...baseAccount(), openingBalance:50_000 };
  await addAccount(account);
  await db.expenses.add({
    id:'current-expense',
    date:today,
    month:today.slice(0,7),
    amount:10_000,
    amountBase:10_000,
    currency:'DOP',
    fxRate:1,
    categoryId:'food',
    concept:'Gasto existente',
    nature:'Variable',
    paymentMethod:'cash',
    accountId:'bank',
  });
  await db.categories.add({
    id:'salary-direct',
    name:'Sueldo directo',
    type:'income',
    iconName:'landmark',
    archived:false,
    incomeOrder:0,
  });

  await saveIncome({
    id:'retro-income-direct',
    date:bounds.min,
    amount:asCents(50_000),
    amountBase:50_000,
    currency:'DOP',
    fxRate:1,
    categoryId:'salary-direct',
    description:'Ingreso retroactivo directo',
    type:'extra',
    accountId:'bank',
  }, false, { accountHistoryOpeningBalance:asCents(0) });

  const stored = (await db.accounts.get('bank'))!;
  const snapshot: AccountSnapshot = {
    incomes:await db.incomes.toArray(),
    expenses:await db.expenses.toArray(),
    payments:[],
    transfers:[],
  };
  assert.equal(stored.startDate, bounds.min);
  assert.equal(stored.openingBalance, 0);
  assert.equal(selectAccountBalance(stored, snapshot, today), 40_000);

  const report = selectReportsSnapshot(
    { accounts:[stored], debts:[], incomes:snapshot.incomes, expenses:snapshot.expenses, debtPayments:[], transfers:[] },
    { start:bounds.min, end:today },
  );
  assert.equal(report.cashFlow.income, 50_000);
  assert.equal(report.spending.total, 10_000);
  assert.equal(report.cashFlow.netCashFlow, 40_000);
});

test('retroactive income without explicit historical opening balance remains blocked and atomic', async () => {
  const account = { ...baseAccount(), openingBalance:50_000 };
  await addAccount(account);
  await db.categories.add({
    id:'salary-blocked',
    name:'Sueldo bloqueado',
    type:'income',
    iconName:'landmark',
    archived:false,
    incomeOrder:0,
  });

  await assert.rejects(
    saveIncome({
      id:'retro-income-blocked',
      date:bounds.min,
      amount:asCents(50_000),
      amountBase:50_000,
      currency:'DOP',
      fxRate:1,
      categoryId:'salary-blocked',
      description:'Ingreso sin apertura',
      type:'extra',
      accountId:'bank',
    }),
    /anterior al inicio/i,
  );

  assert.equal((await db.accounts.get('bank'))?.startDate, today);
  assert.equal(await db.incomes.get('retro-income-blocked'), undefined);
});

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

test('cash can rebase backward and blocks moving forward after activity', async () => {
  const cash = await ensureCashAccount();
  await addAccount({ ...cash, startDate: bounds.min, openingBalance: 35_000 }, true);
  const stored = (await db.accounts.get(cash.id))!;
  assert.equal(stored.startDate, bounds.min);
  assert.equal(stored.openingBalance, 35_000);

  await db.expenses.add({ id:'cash-expense', date:today, month:today.slice(0,7), amount:5_000, categoryId:'food', concept:'Compra', nature:'Variable', paymentMethod:'cash', accountId:cash.id });
  await assert.rejects(
    addAccount({ ...stored, startDate: today }, true),
    /solo puede moverse hacia atrás/i,
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
  assert.match(source, /Saldo hoy/);
  assert.match(source, /Con historial existente, la fecha solo puede moverse hacia atrás/);
  assert.match(source, /Saldo al inicio de esa fecha/);
  assert.match(source, /startInputMax/);
  assert.doesNotMatch(source, /disabled=\{Boolean\(editingAccount && editingAccountHasActivity\)\}/);
});


test('global composer exposes one-step historical extension for a retroactive income', () => {
  const source = readFileSync(new URL('../src/components/dashboard/TransactionModal.tsx', import.meta.url), 'utf8');
  assert.match(source, /needsIncomeHistoryExtension/);
  assert.match(source, /Ampliará el historial de/);
  assert.match(source, /Saldo al inicio de esa fecha/);
  assert.match(source, /accountHistoryOpeningBalance/);
  assert.match(source, /Solo puedes ampliar el historial desde/);
  assert.match(source, /data-retroactive-income-extension="true"/);
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


test('UI preserves an unchanged historical startDate outside the rolling edit window', () => {
  const source = readFileSync(new URL('../src/components/dashboard/accounts-overview.tsx', import.meta.url), 'utf8');
  assert.match(source, /startInputMin = editingAccountRecord && editingAccountRecord\.startDate < startBounds\.min/);
  assert.match(source, /min=\{startInputMin\} max=\{startInputMax\}/);
});


test('year boundary keeps the retroactive window on the previous calendar month', () => {
  assert.deepEqual(accountStartDateBounds('2027-01-05'), { min: '2026-12-01', max: '2027-01-05' });
});

test('untouched edit drafts preserve the persisted account start date', () => {
  assert.equal(
    resolveEditedAccountStartDate('2026-01-01', '2026-10-02', '2026-10-02'),
    '2026-01-01',
  );
  assert.equal(
    resolveEditedAccountStartDate('2026-01-01', '2026-10-02', '2026-01-01'),
    '2026-10-02',
  );
});

test('historical account outside the current window can change name and opening balance when startDate is unchanged', async () => {
  const historical: Account = {
    id:'historical',
    name:'Cuenta antigua',
    type:'bank',
    currency:'DOP',
    openingBalance:10_000,
    startDate:'2026-01-01',
  };
  await db.accounts.add(historical);
  await addAccount({ ...historical, name:'Cuenta antigua corregida', openingBalance:25_000 }, true);
  const stored = await db.accounts.get(historical.id);
  assert.equal(stored?.startDate, '2026-01-01');
  assert.equal(stored?.name, 'Cuenta antigua corregida');
  assert.equal(stored?.openingBalance, 25_000);
});

test('backup import accepts an account startDate older than the current retroactive edit window', async () => {
  await addAccount(baseAccount('backup-old'));
  const backup = JSON.parse(await exportDataJSON());
  const row = backup.accounts.find((account: Account) => account.id === 'backup-old');
  assert.ok(row);
  row.startDate = '2026-01-01';
  row.openingBalance = 77_700;

  await importDataJSON(JSON.stringify(backup));

  const restored = await db.accounts.get('backup-old');
  assert.equal(restored?.startDate, '2026-01-01');
  assert.equal(restored?.openingBalance, 77_700);
});

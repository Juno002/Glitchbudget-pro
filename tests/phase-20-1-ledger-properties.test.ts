import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectPosition } from '../src/domain/ledger';
import { selectMonthlyMetrics } from '../src/domain/metrics';
import type {
  Account,
  AccountTransfer,
  Debt,
  DebtPayment,
  Expense,
} from '../src/domain/models';

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function integer(next: () => number, min: number, max: number) {
  return Math.floor(next() * (max - min + 1)) + min;
}

const through = '2026-09-30';
const month = '2026-09';
const emptySnapshot = () => ({
  incomes: [],
  expenses: [],
  payments: [],
  transfers: [],
});

function account(id: string, openingBalance: number, type: Account['type'] = 'bank'): Account {
  return {
    id,
    name: id,
    type,
    currency: 'DOP',
    openingBalance,
    startDate: '2026-09-01',
  };
}

function card(openingAdjustment: number): Debt {
  return {
    id: 'card',
    name: 'Card',
    type: 'credit_card',
    principal: 500_000,
    apr: 0,
    minPayment: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    status: 'active',
    openingAdjustment,
  };
}

test('property: arbitrary internal transfers conserve liquid assets and net worth', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const next = random(seed);
    const openingA = integer(next, 0, 2_000_000);
    const openingB = integer(next, 0, 2_000_000);
    const accounts = [account('a', openingA, 'cash'), account('b', openingB, 'bank')];

    const transfers: AccountTransfer[] = Array.from(
      { length: integer(next, 1, 40) },
      (_, index) => {
        const aToB = next() >= 0.5;
        return {
          id: 'transfer-' + index,
          fromAccountId: aToB ? 'a' : 'b',
          toAccountId: aToB ? 'b' : 'a',
          amount: integer(next, 1, 100_000),
          date: '2026-09-' + String(integer(next, 1, 28)).padStart(2, '0'),
          note: '',
        };
      },
    );

    const position = selectPosition(accounts, [], { ...emptySnapshot(), transfers }, through);
    assert.equal(position.liquidAssets, openingA + openingB, 'seed ' + seed);
    assert.equal(position.netWorth, openingA + openingB, 'seed ' + seed);
  }
});

test('property: card purchases count as spending without reducing liquid cash', () => {
  for (let seed = 301; seed <= 600; seed += 1) {
    const next = random(seed);
    const opening = integer(next, 100_000, 2_000_000);
    const amount = integer(next, 1, 90_000);
    const accounts = [account('bank', opening)];
    const debt = card(0);
    const expense: Expense = {
      id: 'expense',
      nature: 'Variable',
      concept: 'Generated card purchase',
      amount,
      date: '2026-09-15',
      categoryId: 'otros',
      month,
      paymentMethod: 'credit',
      debtId: debt.id,
    };

    const before = selectPosition(accounts, [debt], emptySnapshot(), through);
    const afterData = { ...emptySnapshot(), expenses: [expense] };
    const after = selectPosition(accounts, [debt], afterData, through);
    const metrics = selectMonthlyMetrics({
      settings: { savePct: 0 },
      incomes: [],
      expenses: [expense],
      budgets: [],
      goalContributions: [],
      debtPayments: [],
    }, month);

    assert.equal(after.liquidAssets, before.liquidAssets, 'seed ' + seed);
    assert.equal(after.liabilities, amount, 'seed ' + seed);
    assert.equal(after.netWorth, before.netWorth - amount, 'seed ' + seed);
    assert.equal(metrics.spending, amount, 'seed ' + seed);
    assert.equal(metrics.cashSpending, 0, 'seed ' + seed);
    assert.equal(metrics.cashFlow, 0, 'seed ' + seed);
  }
});

test('property: paying existing card debt reduces cash and liability equally', () => {
  for (let seed = 601; seed <= 900; seed += 1) {
    const next = random(seed);
    const debtAmount = integer(next, 10_000, 500_000);
    const paymentAmount = integer(next, 1, debtAmount);
    const openingCash = debtAmount + integer(next, 1, 500_000);
    const accounts = [account('bank', openingCash)];
    const debt = card(debtAmount);
    const payment: DebtPayment = {
      id: 'payment',
      debtId: debt.id,
      accountId: 'bank',
      date: '2026-09-20',
      amount: paymentAmount,
    };

    const before = selectPosition(accounts, [debt], emptySnapshot(), through);
    const after = selectPosition(
      accounts,
      [debt],
      { ...emptySnapshot(), payments: [payment] },
      through,
    );

    assert.equal(after.liquidAssets, before.liquidAssets - paymentAmount, 'seed ' + seed);
    assert.equal(after.liabilities, before.liabilities - paymentAmount, 'seed ' + seed);
    assert.equal(after.netWorth, before.netWorth, 'seed ' + seed);
  }
});

test('property: cash expenses reduce liquid assets, net worth and cash flow by the same amount', () => {
  for (let seed = 901; seed <= 1200; seed += 1) {
    const next = random(seed);
    const opening = integer(next, 100_000, 2_000_000);
    const amount = integer(next, 1, Math.min(99_000, opening));
    const accounts = [account('bank', opening)];
    const expense: Expense = {
      id: 'expense',
      accountId: 'bank',
      nature: 'Variable',
      concept: 'Generated cash expense',
      amount,
      date: '2026-09-18',
      categoryId: 'otros',
      month,
      paymentMethod: 'cash',
    };

    const before = selectPosition(accounts, [], emptySnapshot(), through);
    const after = selectPosition(
      accounts,
      [],
      { ...emptySnapshot(), expenses: [expense] },
      through,
    );
    const metrics = selectMonthlyMetrics({
      settings: { savePct: 0 },
      incomes: [],
      expenses: [expense],
      budgets: [],
      goalContributions: [],
      debtPayments: [],
    }, month);

    assert.equal(after.liquidAssets, before.liquidAssets - amount, 'seed ' + seed);
    assert.equal(after.netWorth, before.netWorth - amount, 'seed ' + seed);
    assert.equal(metrics.spending, amount, 'seed ' + seed);
    assert.equal(metrics.cashFlow, -amount, 'seed ' + seed);
  }
});

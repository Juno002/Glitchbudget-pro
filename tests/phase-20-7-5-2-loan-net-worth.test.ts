import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  selectActiveCreditCards,
  selectLoanCompatibilityBalance,
  selectPosition,
} from '../src/domain/ledger';
import type { Account, Debt, DebtPayment } from '../src/domain/models';

const through = '2026-09-30';

function account(openingBalance = 1_000_000): Account {
  return {
    id: 'bank',
    name: 'Banco',
    type: 'bank',
    currency: 'DOP',
    openingBalance,
    startDate: '2026-09-01',
  };
}

function loan(status: Debt['status'] = 'active'): Debt {
  return {
    id: 'legacy-loan',
    name: 'Préstamo histórico',
    type: 'loan',
    principal: 300_000,
    openingAdjustment: 5_000,
    apr: 0.12,
    minPayment: 10_000,
    createdAt: '2026-09-01T12:00:00.000Z',
    status,
  };
}

function card(): Debt {
  return {
    id: 'card',
    name: 'Tarjeta',
    type: 'credit_card',
    principal: 500_000,
    openingAdjustment: 100_000,
    apr: 0,
    minPayment: 0,
    createdAt: '2026-09-01T12:00:00.000Z',
    status: 'active',
  };
}

function payment(amount: number, date = '2026-09-20'): DebtPayment {
  return {
    id: 'loan-payment-' + amount + '-' + date,
    debtId: 'legacy-loan',
    accountId: 'bank',
    amount,
    date,
  };
}

function snapshot(payments: DebtPayment[] = []) {
  return {
    incomes: [],
    expenses: [],
    payments,
    transfers: [],
  };
}

test('20.7.5.2 historical loan balance is principal plus preserved adjustment minus recorded payments', () => {
  const debt = loan();
  assert.equal(selectLoanCompatibilityBalance(debt, [], through), 305_000);
  assert.equal(selectLoanCompatibilityBalance(debt, [payment(50_000)], through), 255_000);
  assert.equal(
    selectLoanCompatibilityBalance(debt, [payment(50_000, '2026-10-01')], through),
    305_000,
  );
});

test('20.7.5.2 overpaid historical loan clamps at zero and never becomes an asset', () => {
  assert.equal(selectLoanCompatibilityBalance(loan(), [payment(400_000)], through), 0);
});

test('20.7.5.2 closed historical loan with remaining balance still reduces net worth', () => {
  const debt = loan('closed');
  const position = selectPosition([account()], [debt], snapshot([payment(50_000)]), through);

  assert.equal(position.bank, 950_000);
  assert.equal(position.liabilities, 255_000);
  assert.equal(position.netWorth, 695_000);
  assert.equal(position.loanBalances.length, 1);
  assert.equal(position.loanBalances[0].compatibilityBalance, 255_000);
});

test('20.7.5.2 card plus historical loan reconcile liabilities and loan payment preserves net worth', () => {
  const accounts = [account()];
  const debts = [card(), loan()];

  const before = selectPosition(accounts, debts, snapshot(), through);
  const after = selectPosition(accounts, debts, snapshot([payment(50_000)]), through);

  assert.equal(before.liabilities, 405_000);
  assert.equal(before.netWorth, 595_000);

  assert.equal(after.bank, 950_000);
  assert.equal(after.liabilities, 355_000);
  assert.equal(after.netWorth, before.netWorth);
});

test('20.7.5.2 operational card selector excludes imported loans regardless of active status', () => {
  assert.deepEqual(
    selectActiveCreditCards([card(), loan('active'), loan('closed')]).map(debt => debt.id),
    ['card'],
  );
});

test('20.7.5.2 cards UI separates historical loans into a read-only compatibility surface', () => {
  const source = readFileSync(
    new URL('../src/components/dashboard/debts-tab.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /selectActiveCreditCards/);
  assert.match(source, /historicalLoans = .*isHistoricalLoanDebt/);
  assert.match(source, /Préstamos importados/);
  assert.match(source, /solo lectura/);
  assert.match(source, /selectHistoricalLoanReadModel/);
});

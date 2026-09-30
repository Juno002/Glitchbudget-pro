import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { cardCreditLimit, loanOriginalPrincipal } from '../src/domain/debt-semantics';
import { selectCardReadModel, selectHistoricalLoanReadModel, selectPosition } from '../src/domain/ledger';
import { selectNetWorthReport } from '../src/domain/reports';
import type { Account, CreditCardDebt, HistoricalLoanDebt } from '../src/domain/models';

const through = '2026-09-30';

const card: CreditCardDebt = {
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

const loan: HistoricalLoanDebt = {
  id: 'loan',
  name: 'Préstamo histórico',
  type: 'loan',
  principal: 300_000,
  openingAdjustment: 5_000,
  apr: 0.12,
  minPayment: 10_000,
  createdAt: '2026-09-01T12:00:00.000Z',
  status: 'active',
};

const account: Account = {
  id: 'bank',
  name: 'Banco',
  type: 'bank',
  currency: 'DOP',
  openingBalance: 1_000_000,
  startDate: '2026-09-01',
};

const snapshot = { incomes: [], expenses: [], payments: [], transfers: [] };

test('20.7.5.3 gives the persisted principal field one explicit meaning per debt kind', () => {
  assert.equal(cardCreditLimit(card), 500_000);
  assert.equal(loanOriginalPrincipal(loan), 300_000);
});

test('20.7.5.3 debt read models expose named quantities instead of ambiguous principal', () => {
  const cardRow = selectCardReadModel(card, [], [], through);
  const loanRow = selectHistoricalLoanReadModel(loan, [], through);

  assert.equal(cardRow.creditLimit, 500_000);
  assert.equal(cardRow.availableLimit, 400_000);
  assert.equal(loanRow.originalPrincipal, 300_000);
  assert.equal(loanRow.compatibilityBalance, 305_000);
  assert.equal('principal' in cardRow, false);
  assert.equal('principal' in loanRow, false);
});

test('20.7.5.3 aggregate liabilities stay general when cards and historical loans coexist', () => {
  const position = selectPosition([account], [card, loan], snapshot, through);
  const report = selectNetWorthReport({
    accounts: [account],
    debts: [card, loan],
    incomes: [],
    expenses: [],
    debtPayments: [],
    transfers: [],
  }, through);

  assert.equal(position.liabilities, 405_000);
  assert.equal(report.liabilities, 405_000);
  assert.equal(report.netWorth, 595_000);
  assert.equal('creditCardLiabilities' in report, false);
});

test('20.7.5.3 React surfaces consume explicit card/loan read models and general liability labels', () => {
  const debts = readFileSync(new URL('../src/components/dashboard/debts-tab.tsx', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/components/dashboard/summary-tab.tsx', import.meta.url), 'utf8');
  const reports = readFileSync(new URL('../src/components/dashboard/reports-tab.tsx', import.meta.url), 'utf8');

  assert.match(debts, /addCreditCard/);
  assert.match(debts, /creditLimit/);
  assert.match(debts, /selectHistoricalLoanReadModel/);
  assert.match(debts, /Principal original/);
  assert.doesNotMatch(debts, /\.principal\b|addDebt\b/);

  assert.match(home, /Pasivos registrados/);
  assert.doesNotMatch(home, /Pasivo real de tarjetas registradas/);
  assert.match(reports, /label="Liabilities"/);
  assert.doesNotMatch(reports, /creditCardLiabilities|Credit-card liabilities|pasivos de tarjeta/);
});

test('20.7.5.3 keeps the ambiguous debt field behind compatibility boundaries without changing backup format', () => {
  const models = readFileSync(new URL('../src/domain/models.ts', import.meta.url), 'utf8');
  const backup = readFileSync(new URL('../src/lib/backup-json.ts', import.meta.url), 'utf8');

  assert.match(models, /principal: number;.*campo persistente de compatibilidad/);
  assert.match(backup, /CURRENT_BACKUP_FORMAT_VERSION = 13/);
});

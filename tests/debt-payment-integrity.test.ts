import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import Dexie from 'dexie';

import { partitionCanonicalFinancialDates } from '../src/domain/financial-date';
import {
  assessFinancialDateIntegrity,
  classifyDebtPaymentIntegrity,
  type RawDebtPayment,
} from '../src/domain/data-integrity';
import type { Account, CreditCardDebt, DebtPayment } from '../src/domain/models';
import {
  selectAccountBalance,
  selectCardSignedBalance,
  selectLoanCompatibilityBalance,
} from '../src/domain/ledger';
import { selectReportsSnapshot } from '../src/domain/reports';
import { db, GlitchBudgetDB } from '../src/lib/db';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { createPreImportSafetyBackup } from '../src/lib/pre-import-backup';
import { decodePreservedValue, encodePreservedValue } from '../src/lib/preserved-value';
import {
  deleteQuarantinedDebtPayment,
  repairQuarantinedDebtPaymentDate,
} from '../src/lib/debt-payment-integrity-service';
import { readFinanceContextData } from '../src/lib/finance-queries';

const bank: Account = {
  id: 'bank',
  name: 'Banco',
  type: 'bank',
  currency: 'DOP',
  openingBalance: 100_000,
  startDate: '2026-09-01',
};

const card: CreditCardDebt = {
  id: 'card',
  name: 'Tarjeta',
  type: 'credit_card',
  principal: 200_000,
  openingAdjustment: 50_000,
  apr: 0,
  minPayment: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
  status: 'closed',
};

async function seedCurrentBase() {
  await db.settings.put({
    id: 'general',
    theme: 'light',
    strictMode: false,
    rolloverStrategy: 'reset',
    baseIncome: { freq: 'mensual', amount: 0 },
    savePct: 0,
    currency: 'DOP',
    locale: 'es-DO',
    incomeCategories: [],
    expenseCategories: [],
  });
  await db.accounts.add(bank);
  await db.debts.add(card);
}

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
  await seedCurrentBase();
});

after(() => db.close());

test('financial-date partition accepts corrupt non-string values without throwing', () => {
  const rows = [
    { id: 'valid', date: '2026-09-10' },
    { id: 'null', date: null },
    { id: 'missing' },
    { id: 'number', date: 20260910 },
    { id: 'text', date: 'not-a-date' },
  ];

  const partition = partitionCanonicalFinancialDates(rows);
  assert.deepEqual(partition.valid.map(row => row.id), ['valid']);
  assert.deepEqual(partition.invalid.map(row => row.id), ['null', 'missing', 'number', 'text']);
});

test('preserved value encoding round-trips corrupt date types losslessly', () => {
  const values: unknown[] = [
    undefined,
    null,
    20260910,
    Number.NaN,
    Infinity,
    -0,
    'not-a-date',
    { nested: undefined, values: [1, null, 'x'] },
    new Set([1, 'x']),
    new Map([[1, undefined]]),
  ];

  for (const value of values) {
    const decoded = decodePreservedValue(encodePreservedValue(value));
    if (typeof value === 'number' && Number.isNaN(value)) assert.ok(typeof decoded === 'number' && Number.isNaN(decoded));
    else if (Object.is(value, -0)) assert.ok(Object.is(decoded, -0));
    else if (value instanceof Set) assert.deepEqual(Array.from(decoded as Set<unknown>), Array.from(value));
    else if (value instanceof Map) assert.deepEqual(Array.from((decoded as Map<unknown, unknown>).entries()), Array.from(value.entries()));
    else assert.deepEqual(decoded, value);
  }
});

test('Dexie v14 with an invalid debt-payment date upgrades to v15 without losing the raw value', async () => {
  const name = 'debt-payment-integrity-v14-upgrade';
  await Dexie.delete(name);

  const old = new Dexie(name);
  old.version(14).stores({ debt_payments: 'id, debtId, date, accountId' });
  await old.open();
  await old.table('debt_payments').add({
    id: 'corrupt',
    debtId: 'card',
    accountId: 'bank',
    amount: 10_000,
    date: 'definitely-not-a-date',
  });
  old.close();

  const current = new GlitchBudgetDB(name);
  try {
    await current.open();
    assert.equal(current.verno, 15);
    const stored = await current.table('debt_payments').get('corrupt');
    assert.equal(stored.date, 'definitely-not-a-date');
  } finally {
    current.close();
    await Dexie.delete(name);
  }
});

test('quarantined payment is excluded from account, debt, metrics and reports', () => {
  const corrupt = {
    id: 'corrupt',
    debtId: card.id,
    accountId: bank.id,
    amount: 10_000,
    date: 'broken',
  } as unknown as DebtPayment;

  const integrity = classifyDebtPaymentIntegrity(
    [corrupt] as unknown as RawDebtPayment[],
    [card],
    [bank],
  );
  assert.equal(integrity.valid.length, 0);
  assert.deepEqual(integrity.quarantined[0].reasons, ['invalid_date']);

  const snapshot = { incomes: [], expenses: [], payments: [corrupt], transfers: [] };
  assert.equal(selectAccountBalance(bank, snapshot, '2026-09-30'), 100_000);
  assert.equal(selectCardSignedBalance(card, [], [corrupt], '2026-09-30'), 50_000);

  const loan = { ...card, id: 'loan', type: 'loan' as const, principal: 80_000 };
  const loanPayment = { ...corrupt, debtId: loan.id };
  assert.equal(selectLoanCompatibilityBalance(loan, [loanPayment], '2026-09-30'), 130_000);

  const report = selectReportsSnapshot({
    accounts: [bank],
    debts: [card],
    incomes: [],
    expenses: [],
    debtPayments: [corrupt],
    transfers: [],
  }, { start: '2026-09-01', end: '2026-09-30' });
  assert.equal(report.cashFlow.debtPayments, 0);
  assert.equal(report.netWorth.banks, 100_000);
  assert.equal(report.netWorth.liabilities, 50_000);
});

test('backup v14 preserves quarantined payment and pre-import OPFS safety copy still succeeds', async () => {
  const corrupt = {
    id: 'corrupt',
    debtId: card.id,
    accountId: bank.id,
    amount: 10_000,
    date: null,
    currency: 'DOP',
    fxRate: 1,
    amountBase: 10_000,
  };
  await db.table('debt_payments').add(corrupt);

  const exportedText = await exportDataJSON();
  const exported = JSON.parse(exportedText);
  assert.equal(exported.v, 14);
  assert.equal(exported.debtPayments.length, 0);
  assert.equal(exported.preservedDebtPayments.length, 1);
  assert.equal(exported.preservedDebtPayments[0].id, 'corrupt');
  const preserved = decodePreservedValue(exported.preservedDebtPayments[0].row) as Record<string, unknown>;
  assert.equal(preserved.date, null);

  const writes: Array<{ name:string; text:string }> = [];
  const safety = await createPreImportSafetyBackup({
    hasOPFS: async () => true,
    exportDataJSON,
    write: async (name, text) => { writes.push({ name, text }); },
    now: () => new Date('2026-10-02T06:00:00.000Z'),
    id: () => 'integrity',
  });
  assert.equal(safety.status, 'created');
  assert.equal(JSON.parse(writes[0].text).v, 14);
  assert.equal(JSON.parse(writes[0].text).preservedDebtPayments.length, 1);

  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
  await importDataJSON(exportedText);

  const restored = await db.table('debt_payments').get('corrupt');
  assert.equal(restored.date, null);
  const query = await readFinanceContextData();
  assert.equal(query.debtPayments.length, 0);
  assert.equal(query.quarantinedDebtPayments.length, 1);
});

test('backup v14 rejects payment ID collisions before destructive write', async () => {
  const corrupt = {
    id: 'same',
    debtId: card.id,
    accountId: bank.id,
    amount: 10_000,
    date: 'broken',
    currency: 'DOP',
    fxRate: 1,
    amountBase: 10_000,
  };
  await db.table('debt_payments').add(corrupt);
  const exported = JSON.parse(await exportDataJSON());
  exported.debtPayments.push({
    id: 'same',
    debtId: card.id,
    accountId: bank.id,
    amount: 10_000,
    date: '2026-09-10',
    currency: 'DOP',
    fxRate: 1,
    amountBase: 10_000,
  });

  const before = await db.table('debt_payments').toArray();
  await assert.rejects(
    importDataJSON(JSON.stringify(exported)),
    /IDs de pago duplicados/i,
  );
  assert.deepEqual(await db.table('debt_payments').toArray(), before);
});

test('repair command validates account start date, ignores active status and returns payment to calculations', async () => {
  await db.table('debt_payments').add({
    id: 'repair',
    debtId: card.id,
    accountId: bank.id,
    amount: 10_000,
    date: 'broken',
    currency: 'DOP',
    fxRate: 1,
    amountBase: 10_000,
  });

  await assert.rejects(
    repairQuarantinedDebtPaymentDate('repair', '2026-08-31'),
    /anterior al inicio/i,
  );

  const result = await repairQuarantinedDebtPaymentDate('repair', '2026-09-10');
  assert.equal(result.status, 'repaired');

  const query = await readFinanceContextData();
  assert.equal(query.quarantinedDebtPayments.length, 0);
  assert.equal(query.debtPayments.length, 1);
  assert.equal(
    selectAccountBalance(bank, { incomes: [], expenses: [], payments: query.debtPayments, transfers: [] }, '2026-09-30'),
    90_000,
  );
  assert.equal(selectCardSignedBalance(card, [], query.debtPayments, '2026-09-30'), 40_000);
});

test('repair may fix the date while a broken reference keeps the payment quarantined', async () => {
  await db.table('debt_payments').add({
    id: 'orphan',
    debtId: 'missing-debt',
    accountId: bank.id,
    amount: 10_000,
    date: 'broken',
    currency: 'DOP',
    fxRate: 1,
    amountBase: 10_000,
  });

  const result = await repairQuarantinedDebtPaymentDate('orphan', '2026-09-10');
  assert.equal(result.status, 'still_quarantined');
  if (result.status === 'still_quarantined') assert.ok(result.issue.reasons.includes('missing_debt'));

  const query = await readFinanceContextData();
  assert.equal(query.debtPayments.length, 0);
  assert.equal(query.quarantinedDebtPayments.length, 1);

  await deleteQuarantinedDebtPayment('orphan');
  assert.equal(await db.table('debt_payments').get('orphan'), undefined);
});

test('read-only integrity inventory reports other historical date anomalies without mutating rows', () => {
  const inventory = assessFinancialDateIntegrity({
    incomes: [{ id:'i', type:'extra', description:'', amount:1, date:'bad', categoryId:'c', month:'2026-09' }],
    expenses: [{ id:'e', nature:'Variable', concept:'', amount:1, date:'bad', categoryId:'c', month:'2026-09' }],
    transfers: [{ id:'t', fromAccountId:'a', toAccountId:'b', amount:1, date:'bad', note:'' }],
    goalContributions: [],
    plannedOccurrences: [],
    recurringRules: [],
    accounts: [bank],
    investments: [],
  });
  assert.equal(inventory.incomes, 1);
  assert.equal(inventory.expenses, 1);
  assert.equal(inventory.transfers, 1);
});

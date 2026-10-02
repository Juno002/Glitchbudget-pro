import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, beforeEach, test } from 'node:test';
import Dexie from 'dexie';

import { normalizeFinancialDate } from '../src/lib/financial-date';
import { selectCardSignedBalance } from '../src/domain/ledger';
import { contains } from '../src/domain/periods';
import type { CreditCardDebt, DebtPayment } from '../src/domain/models';
import { db, GlitchBudgetDB } from '../src/lib/db';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { saveDebtPayment } from '../src/lib/transaction-service';

const originalTimezone = process.env.TZ;
process.env.TZ = 'America/Santo_Domingo';

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

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
  await db.settings.put({
    id: 'general',
    theme: 'light',
    strictMode: true,
    rolloverStrategy: 'reset',
    baseIncome: { freq: 'mensual', amount: 0 },
    savePct: 0,
    currency: 'DOP',
    locale: 'es-DO',
    incomeCategories: [],
    expenseCategories: [],
  });
  await db.accounts.add({
    id: 'bank',
    name: 'Banco',
    type: 'bank',
    currency: 'DOP',
    openingBalance: 1_000_000,
    startDate: '2026-09-01',
  });
  await db.debts.add(card);
});

after(() => {
  db.close();
  if (originalTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimezone;
});

test('20.7.5.4 preserves canonical date-only values and converts UTC instants to the UTC-4 civil day', () => {
  assert.equal(normalizeFinancialDate('2026-09-30', 240), '2026-09-30');
  assert.equal(normalizeFinancialDate('2026-10-01T02:30:00.000Z', 240), '2026-09-30');
  assert.equal(normalizeFinancialDate('2026-10-01T03:59:59.999Z', 240), '2026-09-30');
  assert.equal(normalizeFinancialDate('2026-10-01T04:00:00.000Z', 240), '2026-10-01');
});

test('20.7.5.4 new debt payments accept only canonical local financial dates', async () => {
  await assert.rejects(
    saveDebtPayment({
      id: 'bad-time',
      debtId: card.id,
      accountId: 'bank',
      amount: 10_000,
      date: '2026-10-01T02:30:00.000Z',
    }),
    /fecha válida/i,
  );

  await saveDebtPayment({
    id: 'canonical',
    debtId: card.id,
    accountId: 'bank',
    amount: 10_000,
    date: '2026-09-30',
  });

  assert.equal((await db.debt_payments.get('canonical'))?.date, '2026-09-30');
  assert.equal(await db.debt_payments.get('bad-time'), undefined);
});

test('20.7.5.4 ledger through comparisons operate directly on canonical payment dates', () => {
  const payment: DebtPayment = {
    id: 'pay',
    debtId: card.id,
    amount: 50_000,
    date: '2026-09-30',
  };

  assert.equal(selectCardSignedBalance(card, [], [payment], '2026-09-29'), 100_000);
  assert.equal(selectCardSignedBalance(card, [], [payment], '2026-09-30'), 50_000);
  assert.equal(
    contains({ start: '2026-09-01', end: '2026-09-30' }, '2026-09-30T23:00:00.000Z'),
    true,
  );
});

test('20.7.5.4 legacy backup datetime is normalized once on restore and re-exported date-only', async () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/backup-v4.json', import.meta.url), 'utf8'));
  fixture.debtPayments[0].date = '2026-10-01T02:30:00.000Z';

  await importDataJSON(JSON.stringify(fixture));

  const stored = await db.debt_payments.get('payment');
  assert.equal(stored?.date, '2026-09-30');

  const exported = JSON.parse(await exportDataJSON());
  const payment = exported.debtPayments.find((row: { id: string }) => row.id === 'payment');
  assert.equal(payment.date, '2026-09-30');
  assert.equal(exported.v, 14);
  assert.equal(exported.schemaVersion, 15);
});

test('20.7.5.4 Dexie v14 debt-payment datetimes migrate to canonical local dates in v15', async () => {
  const name = 'phase-20-7-5-4-date-migration';
  await Dexie.delete(name);

  const old = new Dexie(name);
  old.version(14).stores({ debt_payments: 'id, debtId, date, accountId' });
  await old.open();
  await old.table('debt_payments').add({
    id: 'legacy',
    debtId: 'card',
    amount: 25_000,
    date: '2026-10-01T02:30:00.000Z',
    accountId: 'bank',
  });
  old.close();

  const migrated = new GlitchBudgetDB(name);
  try {
    await migrated.open();
    assert.equal(migrated.verno, 15);
    assert.equal((await migrated.debt_payments.get('legacy'))?.date, '2026-09-30');
  } finally {
    migrated.close();
    await Dexie.delete(name);
  }
});

test('20.7.5.4 removes datetime slicing from financial selectors and filters', () => {
  const ledger = readFileSync(new URL('../src/domain/ledger.ts', import.meta.url), 'utf8');
  const filters = readFileSync(new URL('../src/domain/transaction-filters.ts', import.meta.url), 'utf8');
  const backup = readFileSync(new URL('../src/lib/backup-json.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(ledger, /date\.slice\(0,\s*10\)/);
  assert.doesNotMatch(filters, /date\.slice\(0,\s*10\)/);
  assert.match(backup, /normalizeFinancialDate\(payment\.date\)/);
});

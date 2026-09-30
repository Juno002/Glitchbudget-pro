import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { DEBT_SEMANTICS } from '../src/domain/debt-semantics';
import { db } from '../src/lib/db';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { saveExpense } from '../src/lib/transaction-service';

const fixture = (name: string) => JSON.parse(
  readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'),
);

function legacyLoanBackup() {
  const backup = fixture('backup-v4');
  backup.debts ??= [];
  backup.debtPayments ??= [];
  backup.debts.push({
    id: 'legacy-loan',
    name: 'Préstamo histórico',
    type: 'loan',
    principal: 300_000,
    apr: 0.12,
    minPayment: 10_000,
    createdAt: '2026-09-01T12:00:00.000Z',
    status: 'active',
    openingAdjustment: 5_000,
  });
  backup.debtPayments.push({
    id: 'legacy-loan-payment',
    debtId: 'legacy-loan',
    amount: 50_000,
    date: '2026-09-06',
    accountId: 'bank',
    note: 'Pago histórico',
  });
  return backup;
}

after(() => db.close());

test('20.7.5.1 freezes credit-card and loan meanings without treating loan as a current product feature', () => {
  assert.equal(DEBT_SEMANTICS.credit_card.role, 'supported');
  assert.equal(DEBT_SEMANTICS.credit_card.principalMeaning, 'approved_credit_limit');
  assert.equal(
    DEBT_SEMANTICS.credit_card.balanceFormula,
    'opening_adjustment_plus_credit_purchases_minus_payments',
  );

  assert.equal(DEBT_SEMANTICS.loan.role, 'historical_compatibility');
  assert.equal(DEBT_SEMANTICS.loan.principalMeaning, 'original_principal');
  assert.equal(
    DEBT_SEMANTICS.loan.balanceFormula,
    'principal_plus_opening_adjustment_minus_payments_clamped_at_zero',
  );
  assert.deepEqual(
    DEBT_SEMANTICS.loan.allowedActions,
    ['restore', 'export', 'view_read_only_history'],
  );
  assert.match(DEBT_SEMANTICS.loan.netWorthImpact, /liability/i);
  assert.match(DEBT_SEMANTICS.loan.statusRule, /remains a liability/i);
});

test('20.7.5.1 legacy loan survives v4 import and current export without being coerced to a card', async () => {
  await importDataJSON(JSON.stringify(legacyLoanBackup()));

  const stored = await db.debts.get('legacy-loan');
  assert.equal(stored?.type, 'loan');
  assert.equal(stored?.principal, 300_000);
  assert.equal(stored?.openingAdjustment, 5_000);

  const exported = JSON.parse(await exportDataJSON());
  const loan = exported.debts.find((row: { id: string }) => row.id === 'legacy-loan');
  const payment = exported.debtPayments.find((row: { id: string }) => row.id === 'legacy-loan-payment');

  assert.equal(loan.type, 'loan');
  assert.equal(loan.principal, 300_000);
  assert.equal(loan.openingAdjustment, 5_000);
  assert.equal(payment.debtId, 'legacy-loan');
  assert.equal(payment.amount, 50_000);
});

test('20.7.5.1 historical loan cannot be used as the card behind a new credit purchase', async () => {
  await importDataJSON(JSON.stringify(legacyLoanBackup()));

  await assert.rejects(
    saveExpense({
      id: 'invalid-loan-purchase',
      date: '2026-09-07',
      amount: 1_000,
      categoryId: 'food',
      concept: 'No es compra de tarjeta',
      nature: 'Variable',
      paymentMethod: 'credit',
      debtId: 'legacy-loan',
    }),
    /tarjeta de crédito activa/i,
  );

  assert.equal(await db.expenses.get('invalid-loan-purchase'), undefined);
});

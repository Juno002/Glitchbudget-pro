import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, beforeEach, test } from 'node:test';
import { db } from '../src/lib/db';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import {
  addPendingOccurrence, actualTransactionIdForOccurrence, confirmPlannedOccurrence, materializePendingOccurrences, skipPlannedOccurrence, } from '../src/lib/planned-occurrence-service';
import { occurrenceDisplayStatus } from '../src/domain/occurrence-status';
import { BudgetWarning } from '../src/policies/budget-overspending';
import { removeExpense, removeIncome } from '../src/lib/transaction-service';
import { saveExpense } from './helpers/major-unit-transaction-writes';
import { removeRecurringRule, saveRecurringRule } from '../src/lib/recurring-rule-service';
import { readAccountSnapshot } from '../src/lib/accounts';
import { selectMonthlyMetrics } from '../src/domain/metrics';
import { selectPosition } from '../src/domain/ledger';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/backup-v4.json', import.meta.url), 'utf8'));

beforeEach(async () => {
  await importDataJSON(JSON.stringify(fixture));
  await db.planned_occurrences.clear();
});
after(() => db.close());

async function septemberMetrics() {
  const rows = await readAccountSnapshot();
  return selectMonthlyMetrics({
    settings: (await db.settings.get('general'))!,
    incomes: rows.incomes,
    expenses: rows.expenses,
    budgets: await db.plans.toArray(),
    goalContributions: await db.goal_contributions.toArray(),
    debtPayments: rows.payments,
  }, '2026-09');
}

test('confirming an expense occurrence creates one actual transaction and is idempotent', async () => {
  await addPendingOccurrence({ id:'occ-expense', ruleId:'rule', scheduledDate:'2026-09-15' });
  const before = await septemberMetrics();

  const first = await confirmPlannedOccurrence('occ-expense', { accountId:'bank' });
  assert.equal(first.direction, 'expense');
  assert.equal(first.alreadyConfirmed, false);
  assert.equal(first.transactionId, actualTransactionIdForOccurrence('occ-expense'));

  const actual = await db.expenses.get(first.transactionId);
  assert.deepEqual(actual && {
    id: actual.id,
    date: actual.date,
    amount: actual.amount,
    categoryId: actual.categoryId,
    recurringRuleId: actual.recurringRuleId,
    accountId: actual.accountId,
    nature: actual.nature,
  }, {
    id:'actual:occ-expense',
    date:'2026-09-15',
    amount:1000,
    categoryId:'food',
    recurringRuleId:'rule',
    accountId:'bank',
    nature:'Variable',
  });
  assert.deepEqual(await db.planned_occurrences.get('occ-expense'), {
    id:'occ-expense',
    ruleId:'rule',
    scheduledDate:'2026-09-15',
    status:'confirmed',
    transactionId:'actual:occ-expense',
  });

  const afterFirst = await septemberMetrics();
  assert.equal(afterFirst.spending, before.spending + 1000);

  const second = await confirmPlannedOccurrence('occ-expense', { accountId:'cash', actualAmountCents:9999 });
  assert.equal(second.alreadyConfirmed, true);
  assert.equal(await db.expenses.filter(e => e.recurringRuleId === 'rule' && e.id === 'actual:occ-expense').count(), 1);
  assert.deepEqual(await septemberMetrics(), afterFirst);
});

test('concurrent confirmations still create exactly one actual movement', async () => {
  await addPendingOccurrence({ id:'occ-concurrent', ruleId:'rule', scheduledDate:'2026-10-15' });
  const results = await Promise.all([
    confirmPlannedOccurrence('occ-concurrent', { accountId:'bank' }),
    confirmPlannedOccurrence('occ-concurrent', { accountId:'bank' }),
  ]);
  assert.equal(results.filter(result => !result.alreadyConfirmed).length, 1);
  assert.equal(results.filter(result => result.alreadyConfirmed).length, 1);
  assert.equal(await db.expenses.get('actual:occ-concurrent').then(Boolean), true);
  assert.equal(await db.expenses.where('id').equals('actual:occ-concurrent').count(), 1);
});

test('weekly and biweekly rules can confirm multiple occurrences in the same calendar month', async () => {
  for (const cadence of ['weekly','biweekly'] as const) {
    const ruleId = `multi-${cadence}`;
    await saveRecurringRule({
      id:ruleId,
      direction:'expense',
      title:cadence,
      categoryId:'food',
      amount:500,
      defaultAccountId:'bank',
      cadence,
      startDate:'2026-09-03',
      active:true,
    });
  }
  await materializePendingOccurrences({ start:'2026-09-01', end:'2026-09-30' });

  for (const ruleId of ['multi-weekly','multi-biweekly']) {
    const rows = await db.planned_occurrences.where('ruleId').equals(ruleId).sortBy('scheduledDate');
    assert.ok(rows.length >= 2);
    await confirmPlannedOccurrence(rows[0].id);
    await confirmPlannedOccurrence(rows[1].id);
    assert.equal((await db.expenses.toArray()).filter(row => row.recurringRuleId === ruleId).length, 2);
  }
});

test('budget warning aborts both the actual movement and occurrence state until retried', async () => {
  await db.settings.update('general', { budgetOverspendingBehavior:'warn' });
  await db.plans.put({ month:'2026-09', categoryId:'food', limit:30000 });
  await addPendingOccurrence({ id:'occ-warning', ruleId:'rule', scheduledDate:'2026-09-15' });

  let token: string | undefined;
  await assert.rejects(
    confirmPlannedOccurrence('occ-warning', { accountId:'bank' }),
    error => {
      assert.ok(error instanceof BudgetWarning);
      token = error.evaluation.confirmation;
      return true;
    },
  );

  assert.equal(await db.expenses.get('actual:occ-warning'), undefined);
  assert.equal((await db.planned_occurrences.get('occ-warning'))?.status, 'pending');

  await confirmPlannedOccurrence('occ-warning', { accountId:'bank', budgetConfirmation:token });
  assert.ok(await db.expenses.get('actual:occ-warning'));
  assert.equal((await db.planned_occurrences.get('occ-warning'))?.status, 'confirmed');
});

test('account protection aborts confirmation atomically when real funds are insufficient', async () => {
  await db.settings.update('general', { budgetOverspendingBehavior:'allow', preventNegativeAccountBalance:true });
  await addPendingOccurrence({ id:'occ-no-funds', ruleId:'rule', scheduledDate:'2026-09-15' });
  await assert.rejects(
    confirmPlannedOccurrence('occ-no-funds', { accountId:'cash', actualAmountCents:500000 }),
    /fondos|saldo|déficit/i,
  );
  assert.equal(await db.expenses.get('actual:occ-no-funds'), undefined);
  assert.equal((await db.planned_occurrences.get('occ-no-funds'))?.status, 'pending');
});

test('credit-card confirmation increases spending and liability without reducing liquid cash', async () => {
  await db.settings.update('general', { budgetOverspendingBehavior:'allow' });
  await addPendingOccurrence({ id:'occ-credit', ruleId:'rule', scheduledDate:'2026-09-15' });
  const beforeRows = await readAccountSnapshot();
  const beforePosition = selectPosition(await db.accounts.toArray(), await db.debts.toArray(), beforeRows, '2026-09-30');
  const beforeMetrics = await septemberMetrics();

  await confirmPlannedOccurrence('occ-credit', { paymentMethod:'credit', debtId:'card', actualAmountCents:5000 });

  const afterRows = await readAccountSnapshot();
  const afterPosition = selectPosition(await db.accounts.toArray(), await db.debts.toArray(), afterRows, '2026-09-30');
  const afterMetrics = await septemberMetrics();
  assert.equal(afterPosition.liquidAssets, beforePosition.liquidAssets);
  assert.equal(afterPosition.liabilities, beforePosition.liabilities + 5000);
  assert.equal(afterPosition.netWorth, beforePosition.netWorth - 5000);
  assert.equal(afterMetrics.spending, beforeMetrics.spending + 5000);
  assert.equal((await db.expenses.get('actual:occ-credit'))?.accountId, undefined);
});

test('inactive source rules can confirm already-materialized occurrences', async () => {
  await addPendingOccurrence({ id:'occ-inactive', ruleId:'rule', scheduledDate:'2026-09-15' });
  await db.recurrents.update('rule', { active:false });
  const result = await confirmPlannedOccurrence('occ-inactive', { accountId:'bank' });
  assert.equal(result.alreadyConfirmed, false);
  assert.equal((await db.expenses.get(result.transactionId))?.recurringRuleId, 'rule');
});

test('missing source rule leaves a pending occurrence untouched', async () => {
  await addPendingOccurrence({ id:'occ-missing-rule', ruleId:'rule', scheduledDate:'2026-09-15' });
  await db.recurrents.delete('rule');
  await assert.rejects(confirmPlannedOccurrence('occ-missing-rule'), /regla de origen/);
  assert.deepEqual(await db.planned_occurrences.get('occ-missing-rule'), {
    id:'occ-missing-rule', ruleId:'rule', scheduledDate:'2026-09-15', status:'pending',
  });
  assert.equal(await db.expenses.get('actual:occ-missing-rule'), undefined);
});

test('income occurrence creates one income and may use an actual date different from scheduled date', async () => {
  await saveRecurringRule({
    id:'salary-rule',
    direction:'income',
    title:'Pago recurrente',
    categoryId:'salary',
    amount:25000,
    cadence:'monthly',
    day:15,
    startDate:'2026-09-01',
    active:true,
  });
  await addPendingOccurrence({ id:'occ-income', ruleId:'salary-rule', scheduledDate:'2026-09-15' });

  const result = await confirmPlannedOccurrence('occ-income', {
    accountId:'bank',
    actualDate:'2026-09-17',
    actualAmountCents:27500,
  });
  const actual = await db.incomes.get(result.transactionId);
  assert.deepEqual(actual && {
    date:actual.date, amount:actual.amount, categoryId:actual.categoryId,
    recurringRuleId:actual.recurringRuleId, accountId:actual.accountId, type:actual.type,
  }, {
    date:'2026-09-17', amount:27500, categoryId:'salary',
    recurringRuleId:'salary-rule', accountId:'bank', type:'extra',
  });
  assert.equal((await db.planned_occurrences.get('occ-income'))?.scheduledDate, '2026-09-15');
});

test('recurring default account is used when confirmation provides no override', async () => {
  await saveRecurringRule({
    id:'default-account-rule',
    direction:'expense',
    title:'Internet',
    categoryId:'food',
    amount:1200,
    defaultAccountId:'bank',
    cadence:'monthly',
    day:15,
    startDate:'2026-09-01',
    active:true,
  });
  await addPendingOccurrence({ id:'occ-default-account', ruleId:'default-account-rule', scheduledDate:'2026-09-15' });
  const result = await confirmPlannedOccurrence('occ-default-account');
  assert.equal((await db.expenses.get(result.transactionId))?.accountId, 'bank');
});

test('backup rejects an unknown recurring default account atomically', async () => {
  await saveRecurringRule({
    id:'default-account-backup',
    direction:'expense',
    title:'Internet',
    categoryId:'food',
    amount:1200,
    defaultAccountId:'bank',
    cadence:'monthly',
    day:15,
    startDate:'2026-09-01',
    active:true,
  });
  const backup = JSON.parse(await exportDataJSON());
  const row = backup.recurrents.find((rule: {id:string}) => rule.id === 'default-account-backup');
  row.defaultAccountId = 'missing-account';
  const before = await db.recurrents.get('default-account-backup');
  await assert.rejects(importDataJSON(JSON.stringify(backup)), /cuenta predeterminada desconocida/);
  assert.deepEqual(await db.recurrents.get('default-account-backup'), before);
});

test('skipping is idempotent and skipped occurrences cannot later be confirmed', async () => {
  await addPendingOccurrence({ id:'occ-skip', ruleId:'rule', scheduledDate:'2026-09-15' });
  const first = await skipPlannedOccurrence('occ-skip');
  assert.equal(first.status, 'skipped');
  assert.deepEqual(await skipPlannedOccurrence('occ-skip'), first);
  await assert.rejects(confirmPlannedOccurrence('occ-skip'), /omitida/);
  assert.equal(await db.expenses.get('actual:occ-skip'), undefined);
});

test('confirmed occurrences cannot be skipped', async () => {
  await addPendingOccurrence({ id:'occ-confirmed', ruleId:'rule', scheduledDate:'2026-09-15' });
  await confirmPlannedOccurrence('occ-confirmed', { accountId:'bank' });
  await assert.rejects(skipPlannedOccurrence('occ-confirmed'), /confirmada/);
});

test('overdue is derived from explicit today and never persisted', async () => {
  await addPendingOccurrence({ id:'occ-overdue', ruleId:'rule', scheduledDate:'2026-09-15' });
  const pending = (await db.planned_occurrences.get('occ-overdue'))!;
  assert.equal(occurrenceDisplayStatus(pending, '2026-09-15'), 'pending');
  assert.equal(occurrenceDisplayStatus(pending, '2026-09-16'), 'overdue');

  const skipped = await skipPlannedOccurrence('occ-overdue');
  assert.equal(occurrenceDisplayStatus(skipped, '2026-09-20'), 'skipped');
  assert.equal((await db.planned_occurrences.get('occ-overdue'))?.status, 'skipped');
});

test('editing a confirmed actual keeps the occurrence link and scheduled date', async () => {
  await addPendingOccurrence({ id:'occ-edit', ruleId:'rule', scheduledDate:'2026-09-15' });
  const result = await confirmPlannedOccurrence('occ-edit', { accountId:'bank' });
  const existing = (await db.expenses.get(result.transactionId))!;
  await saveExpense({
    ...existing,
    amount:15,
    date:'2026-09-18',
    concept:'Monto real corregido',
  }, true);
  const edited = (await db.expenses.get(result.transactionId))!;
  assert.equal(edited.amount, 1500);
  assert.equal(edited.date, '2026-09-18');
  assert.equal(edited.recurringRuleId, 'rule');
  assert.deepEqual(await db.planned_occurrences.get('occ-edit'), {
    id:'occ-edit', ruleId:'rule', scheduledDate:'2026-09-15',
    status:'confirmed', transactionId:'actual:occ-edit',
  });
});

test('direct deletion of a confirmed actual is blocked for both expenses and incomes', async () => {
  await addPendingOccurrence({ id:'occ-delete-expense', ruleId:'rule', scheduledDate:'2026-09-15' });
  const expense = await confirmPlannedOccurrence('occ-delete-expense', { accountId:'bank' });
  await assert.rejects(removeExpense(expense.transactionId), /no puede eliminarse directamente/);
  assert.ok(await db.expenses.get(expense.transactionId));

  await saveRecurringRule({
    id:'income-delete-rule', direction:'income', title:'Ingreso', categoryId:'salary',
    amount:1000, cadence:'monthly', day:15, startDate:'2026-09-01', active:true,
  });
  await addPendingOccurrence({ id:'occ-delete-income', ruleId:'income-delete-rule', scheduledDate:'2026-09-15' });
  const income = await confirmPlannedOccurrence('occ-delete-income', { accountId:'bank' });
  await assert.rejects(removeIncome(income.transactionId), /no puede eliminarse directamente/);
  assert.ok(await db.incomes.get(income.transactionId));
});

test('rule deletion and direction changes are blocked while pending occurrences exist', async () => {
  await addPendingOccurrence({ id:'occ-rule-integrity', ruleId:'rule', scheduledDate:'2026-09-15' });
  await assert.rejects(removeRecurringRule('rule'), /ocurrencias pendientes/);

  const current = (await db.recurrents.get('rule'))!;
  await assert.rejects(saveRecurringRule({ ...current, direction:'income', categoryId:'salary' }, true), /tipo de una regla/);

  await skipPlannedOccurrence('occ-rule-integrity');
  await removeRecurringRule('rule');
  assert.equal(await db.recurrents.get('rule'), undefined);
  assert.equal((await db.planned_occurrences.get('occ-rule-integrity'))?.status, 'skipped');
});

test('schedule edits are blocked while pending occurrences would become stale', async () => {
  await addPendingOccurrence({ id:'occ-schedule-edit', ruleId:'rule', scheduledDate:'2026-09-15' });
  const current = (await db.recurrents.get('rule'))!;
  await assert.rejects(
    saveRecurringRule({ ...current, cadence:'weekly' }, true),
    /antes de cambiar el calendario/,
  );
  await skipPlannedOccurrence('occ-schedule-edit');
  await saveRecurringRule({ ...current, cadence:'weekly' }, true);
  assert.equal((await db.recurrents.get('rule'))?.cadence, 'weekly');
});

test('rule direction remains immutable after a confirmed occurrence too', async () => {
  await addPendingOccurrence({ id:'occ-direction', ruleId:'rule', scheduledDate:'2026-09-15' });
  await confirmPlannedOccurrence('occ-direction', { accountId:'bank' });
  const current = (await db.recurrents.get('rule'))!;
  await assert.rejects(
    saveRecurringRule({ ...current, direction:'income', categoryId:'salary' }, true),
    /ocurrencias materializadas/,
  );
});

test('backup rejects an orphaned pending occurrence before replacing data', async () => {
  await addPendingOccurrence({ id:'occ-orphan-backup', ruleId:'rule', scheduledDate:'2026-09-15' });
  const backup = JSON.parse(await exportDataJSON());
  backup.recurrents = backup.recurrents.filter((row: {id:string}) => row.id !== 'rule');
  backup.settings.savePct = 0.66;
  const beforePct = (await db.settings.get('general'))?.savePct;
  await assert.rejects(importDataJSON(JSON.stringify(backup)), /pendiente sin su regla/);
  assert.equal((await db.settings.get('general'))?.savePct, beforePct);
  assert.ok(await db.recurrents.get('rule'));
});

test('backup v7 validates confirmed links and round-trips a valid confirmation', async () => {
  await addPendingOccurrence({ id:'occ-backup', ruleId:'rule', scheduledDate:'2026-09-15' });
  await confirmPlannedOccurrence('occ-backup', { accountId:'bank' });
  const exported = await exportDataJSON();
  await importDataJSON(exported);
  assert.ok(await db.expenses.get('actual:occ-backup'));
  assert.equal((await db.planned_occurrences.get('occ-backup'))?.transactionId, 'actual:occ-backup');
});

test('backup rejects dangling or mismatched confirmed occurrence links atomically', async () => {
  await addPendingOccurrence({ id:'occ-corrupt', ruleId:'rule', scheduledDate:'2026-09-15' });
  await confirmPlannedOccurrence('occ-corrupt', { accountId:'bank' });
  const before = JSON.parse(await exportDataJSON());

  const dangling = structuredClone(before);
  dangling.plannedOccurrences[0].transactionId = 'missing-actual';
  dangling.settings.savePct = 0.77;
  await assert.rejects(importDataJSON(JSON.stringify(dangling)), /sin un único movimiento real/);
  assert.equal((await db.settings.get('general'))?.savePct, before.settings.savePct);
  assert.ok(await db.expenses.get('actual:occ-corrupt'));

  const mismatched = structuredClone(before);
  const linked = mismatched.expenses.find((row: {id:string}) => row.id === 'actual:occ-corrupt');
  linked.recurringRuleId = 'other-rule';
  await assert.rejects(importDataJSON(JSON.stringify(mismatched)), /no conserva su regla/);
  assert.ok(await db.expenses.get('actual:occ-corrupt'));
});

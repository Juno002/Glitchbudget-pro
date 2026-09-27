import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, beforeEach, test } from 'node:test';
import { scheduledDatesForRule, plannedOccurrenceId } from '../src/domain/recurrence';
import type { RecurringRule } from '../src/domain/models';
import { db } from '../src/lib/db';
import { importDataJSON } from '../src/lib/backup-json';
import { materializePendingOccurrences, plannedOccurrenceSchema } from '../src/lib/planned-occurrence-service';
import { readAccountSnapshot } from '../src/lib/accounts';
import { selectPosition } from '../src/domain/ledger';
import { selectMonthlyMetrics } from '../src/domain/metrics';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/backup-v4.json', import.meta.url), 'utf8'));
const rule = (patch: Partial<RecurringRule> = {}): RecurringRule => ({
  id: 'schedule',
  direction: 'expense',
  title: 'Plan',
  categoryId: 'food',
  amount: 1000,
  cadence: 'monthly',
  startDate: '2026-01-31',
  active: true,
  ...patch,
});

beforeEach(async () => {
  await importDataJSON(JSON.stringify(fixture));
  await db.planned_occurrences.clear();
});
after(() => db.close());

test('weekly cadence uses exact seven-day intervals from startDate and ignores day metadata', () => {
  const dates = scheduledDatesForRule(
    rule({ cadence:'weekly', startDate:'2026-08-27', day:0 }),
    { start:'2026-09-01', end:'2026-09-30' },
  );
  assert.deepEqual(dates, ['2026-09-03','2026-09-10','2026-09-17','2026-09-24']);
});

test('biweekly cadence uses exact fourteen-day intervals across month boundaries', () => {
  const dates = scheduledDatesForRule(
    rule({ cadence:'biweekly', startDate:'2026-08-28', day:6 }),
    { start:'2026-08-25', end:'2026-10-10' },
  );
  assert.deepEqual(dates, ['2026-08-28','2026-09-11','2026-09-25','2026-10-09']);
});

test('monthly day 31 clamps to each month final valid day including leap years', () => {
  const normal = scheduledDatesForRule(
    rule({ day:31, startDate:'2026-01-31' }),
    { start:'2026-01-01', end:'2026-04-30' },
  );
  assert.deepEqual(normal, ['2026-01-31','2026-02-28','2026-03-31','2026-04-30']);

  const leap = scheduledDatesForRule(
    rule({ day:31, startDate:'2028-01-31' }),
    { start:'2028-01-01', end:'2028-03-31' },
  );
  assert.deepEqual(leap, ['2028-01-31','2028-02-29','2028-03-31']);
});

test('monthly day 29 and 30 use the same last-valid-day policy', () => {
  assert.deepEqual(
    scheduledDatesForRule(rule({ day:29, startDate:'2026-01-29' }), { start:'2026-01-01', end:'2026-03-31' }),
    ['2026-01-29','2026-02-28','2026-03-29'],
  );
  assert.deepEqual(
    scheduledDatesForRule(rule({ day:30, startDate:'2026-01-30' }), { start:'2026-01-01', end:'2026-03-31' }),
    ['2026-01-30','2026-02-28','2026-03-30'],
  );
});

test('monthly rules default to startDate day; legacy day zero also falls back to it', () => {
  const expected = ['2026-01-17','2026-02-17','2026-03-17'];
  assert.deepEqual(
    scheduledDatesForRule(rule({ day:undefined, startDate:'2026-01-17' }), { start:'2026-01-01', end:'2026-03-31' }),
    expected,
  );
  assert.deepEqual(
    scheduledDatesForRule(rule({ day:0, startDate:'2026-01-17' }), { start:'2026-01-01', end:'2026-03-31' }),
    expected,
  );
});

test('monthly rule never generates a candidate before startDate when preferred day is earlier', () => {
  const dates = scheduledDatesForRule(
    rule({ day:15, startDate:'2026-09-20' }),
    { start:'2026-09-01', end:'2026-11-30' },
  );
  assert.deepEqual(dates, ['2026-10-15','2026-11-15']);
});

test('startDate, endDate and requested DateRange are all inclusive bounds', () => {
  const r = rule({ cadence:'weekly', startDate:'2026-09-03', endDate:'2026-09-24' });
  assert.deepEqual(
    scheduledDatesForRule(r, { start:'2026-09-10', end:'2026-09-24' }),
    ['2026-09-10','2026-09-17','2026-09-24'],
  );
  assert.deepEqual(scheduledDatesForRule(r, { start:'2026-09-25', end:'2026-10-31' }), []);
});

test('inactive rules generate nothing and malformed ranges are rejected', () => {
  assert.deepEqual(scheduledDatesForRule(rule({ active:false }), { start:'2026-01-01', end:'2026-12-31' }), []);
  assert.throws(() => scheduledDatesForRule(rule(), { start:'2026-02-30', end:'2026-03-01' }), /Fecha recurrente inválida/);
  assert.throws(() => scheduledDatesForRule(rule(), { start:'2026-04-01', end:'2026-03-01' }), /termina antes/);
});

test('occurrence IDs are deterministic without defining logical identity', () => {
  assert.equal(plannedOccurrenceId('rule-x','2026-09-15'), 'occ:2026-09-15:rule-x');
  assert.equal(plannedOccurrenceId('rule-x','2026-09-15'), plannedOccurrenceId('rule-x','2026-09-15'));
});

test('materialization creates the missing schedule once and repeated generation is idempotent', async () => {
  const first = await materializePendingOccurrences({ start:'2026-09-01', end:'2026-11-30' });
  assert.deepEqual(first.map(row => row.scheduledDate), ['2026-09-15','2026-10-15','2026-11-15']);
  assert.equal(await db.planned_occurrences.count(), 3);

  const second = await materializePendingOccurrences({ start:'2026-09-01', end:'2026-11-30' });
  assert.deepEqual(second, []);
  assert.equal(await db.planned_occurrences.count(), 3);

  const overlap = await materializePendingOccurrences({ start:'2026-10-01', end:'2026-12-31' });
  assert.deepEqual(overlap.map(row => row.scheduledDate), ['2026-12-15']);
  assert.equal(await db.planned_occurrences.count(), 4);
});

test('materialization never overwrites existing skipped or confirmed occurrences', async () => {
  await db.planned_occurrences.bulkAdd([
    plannedOccurrenceSchema.parse({ id:'skip', ruleId:'rule', scheduledDate:'2026-09-15', status:'skipped' }),
    plannedOccurrenceSchema.parse({ id:'confirmed', ruleId:'rule', scheduledDate:'2026-10-15', status:'confirmed', transactionId:'tx-existing' }),
  ]);
  await materializePendingOccurrences({ start:'2026-09-01', end:'2026-11-30' });
  assert.equal((await db.planned_occurrences.get('skip'))?.status, 'skipped');
  assert.deepEqual(await db.planned_occurrences.get('confirmed'), {
    id:'confirmed', ruleId:'rule', scheduledDate:'2026-10-15', status:'confirmed', transactionId:'tx-existing',
  });
  const november = await db.planned_occurrences.where('[ruleId+scheduledDate]').equals(['rule','2026-11-15']).first();
  assert.equal(november?.status, 'pending');
  assert.equal(await db.planned_occurrences.count(), 3);
});

test('inactive and ended rules are not materialized outside their valid schedule', async () => {
  await db.recurrents.update('rule', { active:false });
  assert.deepEqual(await materializePendingOccurrences({ start:'2026-09-01', end:'2026-12-31' }), []);
  await db.recurrents.update('rule', { active:true, endDate:'2026-10-15' });
  const created = await materializePendingOccurrences({ start:'2026-09-01', end:'2026-12-31' });
  assert.deepEqual(created.map(row => row.scheduledDate), ['2026-09-15','2026-10-15']);
});

test('concurrent materialization does not duplicate a logical occurrence', async () => {
  const results = await Promise.all([
    materializePendingOccurrences({ start:'2026-09-01', end:'2026-11-30' }),
    materializePendingOccurrences({ start:'2026-09-01', end:'2026-11-30' }),
  ]);
  assert.equal(results.flat().length, 3);
  assert.equal(await db.planned_occurrences.count(), 3);
});

test('materializing many pending occurrences remains financially neutral', async () => {
  const rowsBefore = await readAccountSnapshot();
  const before = {
    position: selectPosition(await db.accounts.toArray(), await db.debts.toArray(), rowsBefore, '2026-12-31'),
    metrics: selectMonthlyMetrics({
      settings: (await db.settings.get('general'))!,
      incomes: rowsBefore.incomes,
      expenses: rowsBefore.expenses,
      budgets: await db.plans.toArray(),
      goalContributions: await db.goal_contributions.toArray(),
      debtPayments: rowsBefore.payments,
    }, '2026-09'),
  };

  await materializePendingOccurrences({ start:'2026-09-01', end:'2027-03-31' });

  const rowsAfter = await readAccountSnapshot();
  const after = {
    position: selectPosition(await db.accounts.toArray(), await db.debts.toArray(), rowsAfter, '2026-12-31'),
    metrics: selectMonthlyMetrics({
      settings: (await db.settings.get('general'))!,
      incomes: rowsAfter.incomes,
      expenses: rowsAfter.expenses,
      budgets: await db.plans.toArray(),
      goalContributions: await db.goal_contributions.toArray(),
      debtPayments: rowsAfter.payments,
    }, '2026-09'),
  };
  assert.deepEqual(after, before);
});

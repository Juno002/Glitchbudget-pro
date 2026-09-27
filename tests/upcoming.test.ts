import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PlannedOccurrence } from '../src/domain/models';
import { groupUpcomingOccurrences, plannedOccurrenceWindow } from '../src/domain/upcoming';

const occurrence = (id:string, date:string, status:PlannedOccurrence['status']='pending'):PlannedOccurrence => ({
  id, ruleId:'rule', scheduledDate:date, status,
  ...(status === 'confirmed' ? { transactionId:`tx-${id}` } : {}),
});

test('upcoming window is local and deterministic around explicit today', () => {
  assert.deepEqual(plannedOccurrenceWindow('2026-09-27'), {
    start:'2026-08-27',
    end:'2026-12-26',
  });
  assert.deepEqual(plannedOccurrenceWindow('2028-03-01', 2, 2), {
    start:'2028-02-28',
    end:'2028-03-03',
  });
});

test('upcoming groups pending events into overdue, today, tomorrow, next 7 and later', () => {
  const groups = groupUpcomingOccurrences([
    occurrence('later','2026-10-20'),
    occurrence('today','2026-09-27'),
    occurrence('next','2026-10-03'),
    occurrence('tomorrow','2026-09-28'),
    occurrence('overdue','2026-09-26'),
    occurrence('confirmed','2026-09-29','confirmed'),
    occurrence('skipped','2026-09-30','skipped'),
  ], '2026-09-27');

  assert.deepEqual(groups.overdue.map(row=>row.id), ['overdue']);
  assert.deepEqual(groups.today.map(row=>row.id), ['today']);
  assert.deepEqual(groups.tomorrow.map(row=>row.id), ['tomorrow']);
  assert.deepEqual(groups.next7.map(row=>row.id), ['next']);
  assert.deepEqual(groups.later.map(row=>row.id), ['later']);
});

test('next 7 includes day seven but not tomorrow twice', () => {
  const groups = groupUpcomingOccurrences([
    occurrence('tomorrow','2026-09-28'),
    occurrence('day7','2026-10-04'),
    occurrence('day8','2026-10-05'),
  ], '2026-09-27');
  assert.deepEqual(groups.tomorrow.map(row=>row.id), ['tomorrow']);
  assert.deepEqual(groups.next7.map(row=>row.id), ['day7']);
  assert.deepEqual(groups.later.map(row=>row.id), ['day8']);
});

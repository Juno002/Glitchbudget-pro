import type { PlannedOccurrence } from './models';
import type { DateRange } from './periods';
import { occurrenceDisplayStatus } from './occurrence-status';
import { shiftDate } from './recurrence';

export type UpcomingBucket = 'overdue' | 'today' | 'tomorrow' | 'next7' | 'later';

export interface UpcomingGroups {
  overdue: PlannedOccurrence[];
  today: PlannedOccurrence[];
  tomorrow: PlannedOccurrence[];
  next7: PlannedOccurrence[];
  later: PlannedOccurrence[];
}

export function plannedOccurrenceWindow(
  today: string,
  pastDays = 31,
  futureDays = 90,
): DateRange {
  if (!Number.isInteger(pastDays) || pastDays < 0 || !Number.isInteger(futureDays) || futureDays < 0) {
    throw new Error('Ventana de ocurrencias inválida.');
  }
  return { start: shiftDate(today, -pastDays), end: shiftDate(today, futureDays) };
}

/**
 * Upcoming contains unresolved occurrences only. Confirmed/skipped disappear from
 * the actionable queue; their result remains in Movements / history.
 */
export function groupUpcomingOccurrences(
  occurrences: PlannedOccurrence[],
  today: string,
): UpcomingGroups {
  const tomorrow = shiftDate(today, 1);
  const next7End = shiftDate(today, 7);
  const groups: UpcomingGroups = { overdue: [], today: [], tomorrow: [], next7: [], later: [] };

  const pending = occurrences
    .filter(row => row.status === 'pending')
    .slice()
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id));

  for (const occurrence of pending) {
    const status = occurrenceDisplayStatus(occurrence, today);
    if (status === 'overdue') groups.overdue.push(occurrence);
    else if (occurrence.scheduledDate === today) groups.today.push(occurrence);
    else if (occurrence.scheduledDate === tomorrow) groups.tomorrow.push(occurrence);
    else if (occurrence.scheduledDate <= next7End) groups.next7.push(occurrence);
    else groups.later.push(occurrence);
  }

  return groups;
}

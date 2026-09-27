import type { PlannedOccurrence, PlannedOccurrenceStatus } from './models';

export type PlannedOccurrenceDisplayStatus = PlannedOccurrenceStatus | 'overdue';

/**
 * Derived presentation status. Overdue is never persisted.
 * The caller supplies today's local date explicitly.
 */
export function occurrenceDisplayStatus(
  occurrence: PlannedOccurrence,
  today: string,
): PlannedOccurrenceDisplayStatus {
  const date = today.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Fecha de referencia inválida.');
  if (occurrence.status === 'pending' && occurrence.scheduledDate < date) return 'overdue';
  return occurrence.status;
}

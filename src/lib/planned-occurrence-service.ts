import { z } from 'zod';
import { db } from './db';
import { isValidDate } from './finance-calculations';
import type { PlannedOccurrence } from '../domain/models';

const Id = z.string().min(1);

export const plannedOccurrenceSchema = z.object({
  id: Id,
  ruleId: Id,
  scheduledDate: z.string().refine(isValidDate, 'Fecha planificada inválida'),
  status: z.enum(['pending', 'confirmed', 'skipped']),
  transactionId: Id.optional(),
}).strict().superRefine((row, ctx) => {
  if (row.status === 'confirmed' && !row.transactionId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['transactionId'], message: 'Una ocurrencia confirmada debe vincularse a un movimiento real.' });
  }
  if (row.status !== 'confirmed' && row.transactionId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['transactionId'], message: 'Solo una ocurrencia confirmada puede vincularse a un movimiento real.' });
  }
});

export function validatePlannedOccurrenceSet(rows: PlannedOccurrence[]): void {
  const parsed = rows.map(row => plannedOccurrenceSchema.parse(row));
  const ids = new Set<string>();
  const logical = new Set<string>();
  const transactions = new Set<string>();
  for (const row of parsed) {
    if (ids.has(row.id)) throw new Error('Hay IDs de ocurrencias planificadas duplicados.');
    ids.add(row.id);
    const key = `${row.ruleId}\u0000${row.scheduledDate}`;
    if (logical.has(key)) throw new Error('Una regla no puede tener dos ocurrencias en la misma fecha.');
    logical.add(key);
    if (row.transactionId) {
      if (transactions.has(row.transactionId)) throw new Error('Un movimiento real no puede confirmar dos ocurrencias.');
      transactions.add(row.transactionId);
    }
  }
}

/**
 * Fase 7A: crea exclusivamente una ocurrencia pendiente.
 * Las transiciones pending/confirmed/skipped pertenecen al lifecycle de Fase 7C.
 */
export async function addPendingOccurrence(input: Pick<PlannedOccurrence, 'id' | 'ruleId' | 'scheduledDate'>): Promise<PlannedOccurrence> {
  const row = plannedOccurrenceSchema.parse({ ...input, status: 'pending' }) as PlannedOccurrence;
  return db.transaction('rw', db.recurrents, db.planned_occurrences, async () => {
    if (!await db.recurrents.get(row.ruleId)) throw new Error('La regla recurrente no existe.');
    try {
      await db.planned_occurrences.add(row);
    } catch (error) {
      if ((error as { name?: string })?.name === 'ConstraintError') {
        throw new Error('La ocurrencia planificada ya existe para esa regla y fecha.');
      }
      throw error;
    }
    return row;
  });
}

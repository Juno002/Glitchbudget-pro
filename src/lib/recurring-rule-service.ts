import { z } from 'zod';
import { db } from './db';
import { requireCategory } from './category-service';
import { isValidDate } from './finance-calculations';
import type { RecurringRule } from '../domain/models';

export const recurringRuleSchema = z.object({
  id: z.string().min(1), direction: z.enum(['income', 'expense']),
  title: z.string().min(1), categoryId: z.string().min(1),
  amount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  cadence: z.enum(['weekly', 'biweekly', 'monthly']),
  day: z.number().int().min(0).max(31).optional(),
  startDate: z.string().refine(isValidDate), endDate: z.string().refine(isValidDate).optional(),
  active: z.boolean(),
}).strict();

/** Only planning data is writable here; never creates, edits or deletes actual money. */
export async function saveRecurringRule(input: RecurringRule, editing = false) {
  const row = recurringRuleSchema.parse(input);
  if (row.endDate && row.endDate < row.startDate) throw new Error('La fecha final precede al inicio de la regla.');
  return db.transaction('rw', db.categories, db.recurrents, db.planned_occurrences, async () => {
    const old = editing ? await db.recurrents.get(row.id) : undefined;
    if (editing && !old) throw new Error('La regla ya no existe.');
    if (old && old.direction !== row.direction) {
      const pending = await db.planned_occurrences.where('ruleId').equals(row.id).filter(o => o.status === 'pending').count();
      if (pending) throw new Error('No se puede cambiar el tipo de una regla con ocurrencias pendientes.');
    }
    await requireCategory(row.categoryId, row.direction, old?.direction === row.direction ? old.categoryId : undefined);
    if (editing) await db.recurrents.put(row); else await db.recurrents.add(row);
  });
}

/** Historical provenance IDs may survive removal, but unresolved pending occurrences may not be orphaned. */
export async function removeRecurringRule(id: string) {
  await db.transaction('rw', db.recurrents, db.planned_occurrences, async () => {
    const pending = await db.planned_occurrences.where('ruleId').equals(id).filter(o => o.status === 'pending').count();
    if (pending) throw new Error('Esta regla tiene ocurrencias pendientes. Confírmalas u omítelas antes de eliminar la regla.');
    await db.recurrents.delete(id);
  });
}

export async function requireRecurringProvenance(
  id: string | undefined,
  direction: RecurringRule['direction'],
  previousId?: string,
  options: { allowInactive?: boolean } = {},
) {
  if (id === previousId) return; // Includes historical links to removed/inactive rules.
  if (previousId !== undefined) throw new Error('No se puede cambiar la procedencia de un movimiento registrado.');
  if (!id) return;
  const rule = await db.recurrents.get(id);
  if (!rule || (!options.allowInactive && !rule.active) || rule.direction !== direction) {
    throw new Error(options.allowInactive ? 'La regla recurrente no existe o no coincide con el tipo del movimiento.' : 'Selecciona una regla activa del mismo tipo.');
  }
}

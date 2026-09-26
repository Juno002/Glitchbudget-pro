import { db } from './db';
import type { Expense } from '../domain/models';

/** Temporary safety for the current monthly subscription UI, NOT occurrence identity.
 * Phase 7 must replace this with an explicit occurrence ID. Weekly/biweekly rules
 * deliberately bypass this compatibility guard. It is not a domain selector.
 */
export async function legacyMonthlySubscriptionGuard(row: Expense, previous?: Expense) {
  if (!row.recurringRuleId) return;
  if (previous?.recurringRuleId === row.recurringRuleId && previous.date.slice(0, 7) === row.month) return;
  const rule = await db.recurrents.get(row.recurringRuleId);
  if (rule?.cadence !== 'monthly') return;
  const duplicate = await db.expenses.filter(e => e.id !== row.id && e.recurringRuleId === row.recurringRuleId && e.date.slice(0, 7) === row.month).first();
  if (duplicate) throw new Error('Esta suscripción ya tiene un pago registrado en ese mes.');
}

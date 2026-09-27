import { z } from 'zod';
import { db } from './db';
import { isValidDate } from './finance-calculations';
import type { Expense, Income, PlannedOccurrence, RecurringRule } from '../domain/models';
import type { DateRange } from '../domain/periods';
import { plannedOccurrenceId, scheduledDatesForRule, validateDateRange } from '../domain/recurrence';
import { saveExpense, saveIncome } from './transaction-service';

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
    const rule = await db.recurrents.get(row.ruleId);
    if (!rule || !rule.active) throw new Error('La regla recurrente no existe o está inactiva.');
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


/**
 * Fase 7B: materializa únicamente ocurrencias pending que falten en el rango.
 * No sobrescribe pending existentes ni estados confirmed/skipped.
 * La generación es idempotente para la combinación ruleId + scheduledDate.
 */
export async function materializePendingOccurrences(range: DateRange): Promise<PlannedOccurrence[]> {
  validateDateRange(range);
  return db.transaction('rw', db.recurrents, db.planned_occurrences, async () => {
    const rules = (await db.recurrents.toArray()).filter(rule => rule.active);
    const created: PlannedOccurrence[] = [];

    for (const rule of rules) {
      for (const scheduledDate of scheduledDatesForRule(rule, range)) {
        const existing = await db.planned_occurrences
          .where('[ruleId+scheduledDate]')
          .equals([rule.id, scheduledDate])
          .first();
        if (existing) continue;

        const row = plannedOccurrenceSchema.parse({
          id: plannedOccurrenceId(rule.id, scheduledDate),
          ruleId: rule.id,
          scheduledDate,
          status: 'pending',
        }) as PlannedOccurrence;

        await db.planned_occurrences.add(row);
        created.push(row);
      }
    }

    return created;
  });
}


const ActualCents = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export interface ConfirmPlannedOccurrenceOptions {
  actualDate?: string;
  actualAmountCents?: number;
  accountId?: string;
  paymentMethod?: 'cash' | 'credit';
  debtId?: string;
  expenseNature?: Expense['nature'];
  incomeType?: Income['type'];
  budgetConfirmation?: string;
}

export interface ConfirmPlannedOccurrenceResult {
  occurrence: PlannedOccurrence;
  transactionId: string;
  direction: RecurringRule['direction'];
  alreadyConfirmed: boolean;
}

export function actualTransactionIdForOccurrence(occurrenceId: string): string {
  if (!occurrenceId) throw new Error('La ocurrencia no tiene ID.');
  return `actual:${occurrenceId}`;
}

async function linkedActual(occurrence: PlannedOccurrence): Promise<{ direction: RecurringRule['direction']; transactionId: string }> {
  if (!occurrence.transactionId) throw new Error('La ocurrencia confirmada no tiene movimiento vinculado.');
  const [income, expense] = await Promise.all([
    db.incomes.get(occurrence.transactionId),
    db.expenses.get(occurrence.transactionId),
  ]);
  if ((income ? 1 : 0) + (expense ? 1 : 0) !== 1) {
    throw new Error('La ocurrencia confirmada no coincide con exactamente un movimiento real.');
  }
  const actual = income ?? expense!;
  if (actual.recurringRuleId !== occurrence.ruleId) {
    throw new Error('El movimiento real no conserva la procedencia de la ocurrencia.');
  }
  return { direction: income ? 'income' : 'expense', transactionId: occurrence.transactionId };
}

export function validateOccurrenceLedgerLinks(
  occurrences: PlannedOccurrence[],
  incomes: Income[],
  expenses: Expense[],
  rules: RecurringRule[] = [],
): void {
  validatePlannedOccurrenceSet(occurrences);
  const incomeMap = new Map(incomes.map(row => [row.id, row]));
  const expenseMap = new Map(expenses.map(row => [row.id, row]));
  const ruleMap = new Map(rules.map(row => [row.id, row]));

  for (const occurrence of occurrences) {
    if (occurrence.status === 'pending' && !ruleMap.has(occurrence.ruleId)) {
      throw new Error('El respaldo contiene una ocurrencia pendiente sin su regla de origen.');
    }
    if (occurrence.status !== 'confirmed') continue;
    const id = occurrence.transactionId!;
    const income = incomeMap.get(id);
    const expense = expenseMap.get(id);
    if ((income ? 1 : 0) + (expense ? 1 : 0) !== 1) {
      throw new Error('El respaldo contiene una ocurrencia confirmada sin un único movimiento real.');
    }
    const actual = income ?? expense!;
    if (actual.recurringRuleId !== occurrence.ruleId) {
      throw new Error('El respaldo contiene una ocurrencia cuyo movimiento no conserva su regla de origen.');
    }
    const rule = ruleMap.get(occurrence.ruleId);
    const direction: RecurringRule['direction'] = income ? 'income' : 'expense';
    if (rule && rule.direction !== direction) {
      throw new Error('El respaldo contiene una ocurrencia confirmada incompatible con el tipo de su regla.');
    }
  }
}

/**
 * Fase 7C: convierte una ocurrencia pendiente en exactamente un movimiento real.
 * Todo ocurre dentro de una sola transacción IndexedDB; BudgetWarning aborta sin
 * cambiar la ocurrencia y puede reintentarse con su token de confirmación.
 */
export async function confirmPlannedOccurrence(
  occurrenceId: string,
  options: ConfirmPlannedOccurrenceOptions = {},
): Promise<ConfirmPlannedOccurrenceResult> {
  return db.transaction('rw', db.tables, async () => {
    const occurrence = await db.planned_occurrences.get(occurrenceId);
    if (!occurrence) throw new Error('La ocurrencia planificada ya no existe.');
    if (occurrence.status === 'skipped') throw new Error('Una ocurrencia omitida no puede confirmarse.');

    if (occurrence.status === 'confirmed') {
      const actual = await linkedActual(occurrence);
      return { occurrence, ...actual, alreadyConfirmed: true };
    }

    const rule = await db.recurrents.get(occurrence.ruleId);
    if (!rule) throw new Error('La regla de origen ya no existe; no se puede confirmar esta ocurrencia.');

    const actualDate = options.actualDate ?? occurrence.scheduledDate;
    if (!isValidDate(actualDate)) throw new Error('La fecha real es inválida.');
    const amountCents = ActualCents.parse(options.actualAmountCents ?? rule.amount);
    const transactionId = actualTransactionIdForOccurrence(occurrence.id);

    if (await db.incomes.get(transactionId) || await db.expenses.get(transactionId)) {
      throw new Error('El identificador del movimiento de esta ocurrencia ya está ocupado.');
    }

    if (rule.direction === 'income') {
      await saveIncome({
        id: transactionId,
        recurringRuleId: rule.id,
        accountId: options.accountId ?? rule.defaultAccountId,
        type: options.incomeType ?? 'extra',
        description: rule.title,
        amount: amountCents / 100,
        date: actualDate,
        categoryId: rule.categoryId,
      }, false, { allowInactiveRecurringRule: true });
    } else {
      await saveExpense({
        id: transactionId,
        recurringRuleId: rule.id,
        accountId: options.accountId ?? rule.defaultAccountId,
        nature: options.expenseNature ?? 'Variable',
        concept: rule.title,
        amount: amountCents / 100,
        date: actualDate,
        categoryId: rule.categoryId,
        paymentMethod: options.paymentMethod ?? 'cash',
        debtId: options.debtId,
      }, false, options.budgetConfirmation, { allowInactiveRecurringRule: true });
    }

    const confirmed: PlannedOccurrence = {
      ...occurrence,
      status: 'confirmed',
      transactionId,
    };
    plannedOccurrenceSchema.parse(confirmed);
    await db.planned_occurrences.put(confirmed);
    return { occurrence: confirmed, transactionId, direction: rule.direction, alreadyConfirmed: false };
  });
}

export async function skipPlannedOccurrence(occurrenceId: string): Promise<PlannedOccurrence> {
  return db.transaction('rw', db.planned_occurrences, async () => {
    const occurrence = await db.planned_occurrences.get(occurrenceId);
    if (!occurrence) throw new Error('La ocurrencia planificada ya no existe.');
    if (occurrence.status === 'confirmed') throw new Error('Una ocurrencia confirmada no puede omitirse.');
    if (occurrence.status === 'skipped') return occurrence;
    const skipped: PlannedOccurrence = { ...occurrence, status: 'skipped' };
    plannedOccurrenceSchema.parse(skipped);
    await db.planned_occurrences.put(skipped);
    return skipped;
  });
}

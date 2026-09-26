import type { Expense, RecurringRule } from './models';

/** Input contracts confined to migration/import, never used as active models. */
export type LegacyExpense = Omit<Expense, 'nature' | 'recurringRuleId'> & {
  type: Expense['nature'];
  frequency?: 'mensual' | 'quincenal' | 'semanal';
  recurringId?: string;
};
export type LegacyRecurring = Omit<RecurringRule, 'direction' | 'cadence'> & {
  type: RecurringRule['direction'];
  freq: RecurringRule['cadence'];
};

export function migrateActualExpense(old: LegacyExpense): Expense {
  const { type, frequency: _frequency, recurringId, ...actual } = old;
  if (!['Fijo', 'Variable', 'Ocasional'].includes(type)) throw new Error('Naturaleza histórica inválida.');
  return { ...actual, nature: type, ...(recurringId !== undefined ? { recurringRuleId: recurringId } : {}) };
}

export function migrateRecurringRule(old: LegacyRecurring): RecurringRule {
  const { type, freq, ...rule } = old;
  if (!['income', 'expense'].includes(type) || !['weekly', 'biweekly', 'monthly'].includes(freq)) {
    throw new Error('Regla recurrente histórica inválida.');
  }
  return { ...rule, direction: type, cadence: freq };
}

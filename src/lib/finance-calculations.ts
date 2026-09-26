// Compatibility boundary for existing callers and backup characterization tests.
import { selectMonthlyMetrics } from '../domain/metrics';
import type { FinanceSnapshot as RecordedSnapshot } from '../domain/snapshot';
import type { Settings } from '../domain/models';
export interface FinanceSnapshot extends RecordedSnapshot { settings: Pick<Settings, 'baseIncome' | 'savePct'> }
export { monthlyAmount } from './planning-forecast';
export { recordedExpenseForMonth, recordedCategories } from '../domain/metrics';

/** Calendar dates must use the user's timezone, not UTC. */
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDate(date) === value;
}


/** @deprecated Use explicitly named domain metrics in new consumers. */
export function calculateRecordedTotals(data: FinanceSnapshot, month: string) {
  const m = selectMonthlyMetrics(data, month);
  return { totalIncome: m.recordedIncome, totalExpenses: m.spending, cashExpenses: m.cashSpending, creditExpenses: m.cardSpending, totalDebtPayments: m.cardPayments, cashFlow: m.cashFlow, balance: m.monthlyResult, available: m.monthlyPlanningMargin, planned_total: m.plannedBudgetTotal, totalGoalContributions: m.goalContributions, commitments: m.planningReservations, suggestedSave: m.suggestedSave };
}

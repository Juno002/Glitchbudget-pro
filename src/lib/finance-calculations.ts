// Compatibility boundary for existing callers and backup characterization tests.
import { selectMonthlyMetrics } from '../domain/metrics';
import type { FinanceSnapshot as RecordedSnapshot } from '../domain/snapshot';
import type { Settings } from '../domain/models';
export interface FinanceSnapshot extends RecordedSnapshot { settings: Pick<Settings, 'baseIncome' | 'savePct'> }
export { monthlyAmount } from './planning-forecast';
export { recordedExpenseForMonth, recordedCategories } from '../domain/metrics';

// Compatibility exports for existing callers. New date semantics live in the domain.
export {
  localFinancialDate as localDate,
  isCanonicalFinancialDate as isValidDate,
} from '../domain/financial-date';

/** @deprecated Use explicitly named domain metrics in new consumers. */
export function calculateRecordedTotals(data: FinanceSnapshot, month: string) {
  const m = selectMonthlyMetrics(data, month);
  return { totalIncome: m.recordedIncome, totalExpenses: m.spending, cashExpenses: m.cashSpending, creditExpenses: m.cardSpending, totalDebtPayments: m.cardPayments, cashFlow: m.cashFlow, balance: m.monthlyResult, available: m.monthlyPlanningMargin, planned_total: m.plannedBudgetTotal, totalGoalContributions: m.goalContributions, commitments: m.planningReservations, suggestedSave: m.suggestedSave };
}

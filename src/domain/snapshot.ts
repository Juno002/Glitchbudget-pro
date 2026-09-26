import type { DebtPayment, Expense, GoalContribution, Income, Plan, Settings } from './models';
export interface FinanceSnapshot {
  settings: Pick<Settings, 'savePct'>;
  incomes: Income[];
  expenses: Expense[];
  budgets: Plan[];
  goalContributions: GoalContribution[];
  debtPayments: DebtPayment[];
}

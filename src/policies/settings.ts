/** Legacy conversion boundary. Explicit policies always win over the old flag. */
export type BudgetOverspendingBehavior = 'allow' | 'warn' | 'block';
export interface FinancialPolicies { preventNegativeAccountBalance: boolean; budgetOverspendingBehavior: BudgetOverspendingBehavior }
export function normalizeFinancialPolicies(value: { strictMode?: boolean; preventNegativeAccountBalance?: boolean; budgetOverspendingBehavior?: BudgetOverspendingBehavior } = {}): FinancialPolicies {
  return { preventNegativeAccountBalance: value.preventNegativeAccountBalance ?? value.strictMode ?? false,
    budgetOverspendingBehavior: value.budgetOverspendingBehavior ?? (value.strictMode ? 'block' : 'allow') };
}

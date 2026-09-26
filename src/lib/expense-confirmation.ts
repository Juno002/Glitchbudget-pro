import { BudgetWarning } from '../policies/budget-overspending';
/** Never hold an IndexedDB transaction open while awaiting user input. Each retry rechecks all policies. */
export async function withBudgetConfirmation(save: (confirmation?: string) => Promise<void>, confirm: (warning: BudgetWarning) => Promise<boolean>): Promise<boolean> {
  let confirmation: string | undefined;
  for (;;) {
    try { await save(confirmation); return true; }
    catch (error) {
      if (!(error instanceof BudgetWarning)) throw error;
      if (!await confirm(error)) return false;
      confirmation = error.evaluation.confirmation;
    }
  }
}

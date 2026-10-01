import { saveExpense as saveExpenseCents, saveIncome as saveIncomeCents } from '../../src/lib/transaction-service';
import { toCents } from '../../src/lib/utils';

type MajorExpenseInput = Omit<Parameters<typeof saveExpenseCents>[0], 'amount'> & { amount: number };
type MajorIncomeInput = Omit<Parameters<typeof saveIncomeCents>[0], 'amount'> & { amount: number };

export function saveExpense(
  input: MajorExpenseInput,
  editing = false,
  budgetConfirmation?: string,
  options?: Parameters<typeof saveExpenseCents>[3],
) {
  return saveExpenseCents({ ...input, amount: toCents(input.amount) }, editing, budgetConfirmation, options);
}

export function saveIncome(
  input: MajorIncomeInput,
  editing = false,
  options?: Parameters<typeof saveIncomeCents>[2],
) {
  return saveIncomeCents({ ...input, amount: toCents(input.amount) }, editing, options);
}

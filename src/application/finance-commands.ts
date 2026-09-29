import type {
  AccountTransfer,
  DebtPayment,
  Expense,
  Income,
  RecurringRule,
  Settings,
} from '@/domain/models';
import type { Budget, Goal, GoalContribution } from '@/lib/types';
import type { BudgetPeriodRange } from '@/domain/periods';
import { periodContaining, periodForId } from '@/domain/periods';
import { saveExpense, saveIncome, saveDebtPayment, saveGoalContribution, removeIncome, removeExpense } from '@/lib/transaction-service';
import { saveTransfer } from '@/lib/accounts';
import { saveGoal, removeGoal } from '@/lib/goal-service';
import { saveBudgetLimits, reassignBudgetLimit } from '@/lib/budget-service';
import { saveRecurringRule, removeRecurringRule } from '@/lib/recurring-rule-service';
import { rollBudgetsIntoMonth } from '@/lib/budget-rollover';
import { updatePersistedSetting } from '@/lib/settings-service';
import { toCents } from '@/lib/utils';

export async function createIncomeCommand(income: Omit<Income, 'id' | 'month'>) {
  await saveIncome({ ...income, id: crypto.randomUUID() });
}

export async function updateIncomeCommand(income: Income) {
  await saveIncome(income, true);
}

export async function deleteIncomeCommand(id: string) {
  await removeIncome(id);
}

export async function createExpenseCommand(
  expense: Omit<Expense, 'id' | 'month'>,
  budgetConfirmation?: string,
) {
  await saveExpense({ ...expense, id: crypto.randomUUID() }, false, budgetConfirmation);
}

export async function updateExpenseCommand(expense: Expense, budgetConfirmation?: string) {
  await saveExpense(expense, true, budgetConfirmation);
}

export async function deleteExpenseCommand(id: string) {
  await removeExpense(id);
}

export type AccountTransferDraft = Omit<AccountTransfer, 'id' | 'amount'> & { amount: number };

export async function createAccountTransferCommand(transfer: AccountTransferDraft) {
  await saveTransfer({ ...transfer, id: crypto.randomUUID(), amount: toCents(transfer.amount) });
}

export async function createGoalCommand(
  goal: Omit<Goal, 'id' | 'saved' | 'startDate' | 'status'>,
  today: string,
) {
  const row = {
    name: goal.name,
    date: goal.date || undefined,
    target: toCents(goal.target),
    quota: toCents(goal.quota),
    id: crypto.randomUUID(),
    startDate: today,
  };
  await saveGoal(row);
  return row;
}

export async function updateGoalCommand(goal: Goal) {
  await saveGoal(goal, 'update');
}

export async function deleteGoalCommand(id: string) {
  await removeGoal(id);
}

export async function contributeToGoalCommand(id: string, amount: number, today: string) {
  const amountInCents = toCents(amount);
  if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) {
    throw new Error('El aporte debe ser un monto positivo.');
  }
  const contribution: GoalContribution = {
    id: crypto.randomUUID(),
    goalId: id,
    amount: amountInCents,
    date: today,
  };
  return saveGoalContribution(contribution);
}

export async function saveBudgetCollectionCommand(
  month: string,
  budgets: Omit<Budget, 'month'>[],
  settings: Settings,
  budgetPeriod?: BudgetPeriodRange,
) {
  const range = budgetPeriod ?? { ...periodForId(month, settings), kind: 'monthly' as const };
  await saveBudgetLimits(range, budgets.map(budget => ({
    categoryId: budget.categoryId,
    limit: toCents(budget.limit),
  })));
}

export async function transferBudgetCommand(
  month: string,
  fromCategoryId: string,
  toCategoryId: string,
  amount: number,
  settings: Settings,
  budgetPeriod?: BudgetPeriodRange,
) {
  const range = budgetPeriod ?? { ...periodForId(month, settings), kind: 'monthly' as const };
  await reassignBudgetLimit(range, fromCategoryId, toCategoryId, toCents(amount));
}

export async function savePeriodStartDayCommand(day: number, today: string) {
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error('El inicio del período debe estar entre 1 y 31.');
  }
  await updatePersistedSetting('periodStartDay', day);
  const nextId = periodContaining(today, { periodStartDay: day }).id;
  await rollBudgetsIntoMonth(nextId);
  return { day, nextId };
}

export async function saveBaseIncomeCommand(baseIncome: Settings['baseIncome']) {
  const cents = toCents(baseIncome.amount);
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error('Introduce un ingreso positivo o cero.');
  }
  await updatePersistedSetting('baseIncome', { freq: baseIncome.freq, amount: cents });
}

export async function createDebtPaymentCommand(payment: Omit<DebtPayment, 'id'>) {
  await saveDebtPayment({ ...payment, id: crypto.randomUUID() });
}

export async function createRecurringRuleCommand(recurring: Omit<RecurringRule, 'id'>) {
  await saveRecurringRule({ ...recurring, id: crypto.randomUUID() });
}

export async function updateRecurringRuleCommand(recurring: RecurringRule) {
  await saveRecurringRule(recurring, true);
}

export async function deleteRecurringRuleCommand(id: string) {
  await removeRecurringRule(id);
}

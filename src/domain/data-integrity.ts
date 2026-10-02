import type {
  Account,
  AccountTransfer,
  Debt,
  DebtPayment,
  Expense,
  GoalContribution,
  Income,
  Investment,
  PlannedOccurrence,
  RecurringRule,
} from './models';
import { isCanonicalFinancialDate, partitionCanonicalFinancialDates } from './financial-date';

export type RawDebtPayment = Omit<DebtPayment, 'date'> & { date: unknown };

export type DebtPaymentIntegrityReason =
  | 'invalid_date'
  | 'missing_debt'
  | 'missing_account'
  | 'before_account_start'
  | 'invalid_shape';

export type DebtPaymentIntegrityIssue = {
  payment: RawDebtPayment;
  reasons: DebtPaymentIntegrityReason[];
};

export function classifyDebtPaymentIntegrity(
  payments: readonly (DebtPayment | RawDebtPayment)[],
  debts: readonly Debt[],
  accounts: readonly Account[],
): { valid: DebtPayment[]; quarantined: DebtPaymentIntegrityIssue[] } {
  const debtIds = new Set(debts.map(debt => debt.id));
  const accountMap = new Map(accounts.map(account => [account.id, account]));
  const canonicalIds = new Set(
    partitionCanonicalFinancialDates(payments).valid.map(payment => payment.id),
  );
  const valid: DebtPayment[] = [];
  const quarantined: DebtPaymentIntegrityIssue[] = [];

  for (const payment of payments) {
    const raw = payment as RawDebtPayment;
    const reasons: DebtPaymentIntegrityReason[] = [];
    const hasCanonicalDate = canonicalIds.has(raw.id);

    if (
      typeof raw.id !== 'string'
      || raw.id.length === 0
      || typeof raw.debtId !== 'string'
      || raw.debtId.length === 0
      || !Number.isSafeInteger(raw.amount)
      || raw.amount < 0
    ) reasons.push('invalid_shape');
    if (!hasCanonicalDate) reasons.push('invalid_date');
    if (typeof raw.debtId !== 'string' || !debtIds.has(raw.debtId)) reasons.push('missing_debt');

    if (raw.accountId !== undefined) {
      if (typeof raw.accountId !== 'string' || !accountMap.has(raw.accountId)) {
        reasons.push('missing_account');
      } else if (
        hasCanonicalDate
        && typeof raw.date === 'string'
        && raw.date < accountMap.get(raw.accountId)!.startDate
      ) {
        reasons.push('before_account_start');
      }
    }

    if (reasons.length) quarantined.push({ payment: raw, reasons });
    else valid.push(payment as DebtPayment);
  }

  return { valid, quarantined };
}

function countRequiredDateIssues<T>(
  rows: readonly T[],
  read: (row: T) => unknown,
): number {
  return rows.reduce((count, row) => {
    const value = read(row);
    return count + (typeof value === 'string' && isCanonicalFinancialDate(value) ? 0 : 1);
  }, 0);
}

function countOptionalDateIssues<T>(
  rows: readonly T[],
  read: (row: T) => unknown,
): number {
  return rows.reduce((count, row) => {
    const value = read(row);
    if (value === undefined || value === null || value === '') return count;
    return count + (typeof value === 'string' && isCanonicalFinancialDate(value) ? 0 : 1);
  }, 0);
}

export type FinancialDateIntegrityInventory = {
  incomes: number;
  expenses: number;
  transfers: number;
  goalContributions: number;
  plannedOccurrences: number;
  recurringRules: number;
  accounts: number;
  investments: number;
};

export function assessFinancialDateIntegrity(input: {
  incomes: readonly Income[];
  expenses: readonly Expense[];
  transfers: readonly AccountTransfer[];
  goalContributions: readonly GoalContribution[];
  plannedOccurrences: readonly PlannedOccurrence[];
  recurringRules: readonly RecurringRule[];
  accounts: readonly Account[];
  investments: readonly Investment[];
}): FinancialDateIntegrityInventory {
  return {
    incomes: countRequiredDateIssues(input.incomes, row => row.date),
    expenses: countRequiredDateIssues(input.expenses, row => row.date),
    transfers: countRequiredDateIssues(input.transfers, row => row.date),
    goalContributions: countRequiredDateIssues(input.goalContributions, row => row.date),
    plannedOccurrences: countRequiredDateIssues(input.plannedOccurrences, row => row.scheduledDate),
    recurringRules:
      countRequiredDateIssues(input.recurringRules, row => row.startDate)
      + countOptionalDateIssues(input.recurringRules, row => row.endDate),
    accounts: countRequiredDateIssues(input.accounts, row => row.startDate),
    investments:
      countRequiredDateIssues(input.investments, row => row.openedAt)
      + countOptionalDateIssues(input.investments, row => row.maturityDate),
  };
}
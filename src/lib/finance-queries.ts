import { db } from '@/lib/db';

export function readFinanceContextData() {
  return db.transaction('r', db.tables, async () => ({
    expenses: await db.expenses.toArray(),
    incomes: await db.incomes.toArray(),
    goals: await db.goals.toArray(),
    goalContributions: await db.goal_contributions.toArray(),
    budgets: await db.plans.toArray(),
    debts: await db.debts.toArray(),
    debtPayments: await db.debt_payments.toArray(),
    transfers: await db.account_transfers.toArray(),
    accounts: await db.accounts.toArray(),
    investments: await db.investments.toArray(),
  }));
}

export function readGeneralSettings() {
  return db.settings.get('general').then(settings => settings ?? null);
}

export function readCategories() {
  return db.categories.toArray();
}

export function readRecurringRules() {
  return db.recurrents.toArray();
}

export function readPlannedOccurrences() {
  return db.planned_occurrences.toArray();
}

export function readMovementAccountData() {
  return db.transaction('r', [db.accounts, db.account_transfers], async () => ({
    accounts: await db.accounts.toArray(),
    transfers: await db.account_transfers.toArray(),
  }));
}

export function readAccounts() {
  return db.accounts.toArray();
}

export function readAccountOverviewData() {
  return db.transaction(
    'r',
    [db.accounts, db.account_transfers, db.incomes, db.expenses, db.debt_payments, db.debts],
    async () => ({
      accounts: await db.accounts.toArray(),
      transfers: await db.account_transfers.toArray(),
      incomes: await db.incomes.toArray(),
      expenses: await db.expenses.toArray(),
      payments: await db.debt_payments.toArray(),
      debts: await db.debts.toArray(),
    }),
  );
}

export function readInvestmentManagerData() {
  return db.transaction(
    'r',
    [db.investments, db.accounts, db.account_transfers, db.incomes, db.expenses, db.debt_payments],
    async () => ({
      investments: await db.investments.toArray(),
      accounts: await db.accounts.toArray(),
      transfers: await db.account_transfers.toArray(),
      incomes: await db.incomes.toArray(),
      expenses: await db.expenses.toArray(),
      payments: await db.debt_payments.toArray(),
    }),
  );
}

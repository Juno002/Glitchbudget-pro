'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export function useMovementAccountData() {
  return useLiveQuery(() => db.transaction('r', [db.accounts, db.account_transfers], async () => ({
    accounts: await db.accounts.toArray(),
    transfers: await db.account_transfers.toArray(),
  })));
}

export function useAccountsData() {
  return useLiveQuery(() => db.accounts.toArray());
}

export function useAccountOverviewData() {
  return useLiveQuery(() => db.transaction(
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
  ));
}

export function useCategoriesData() {
  return useLiveQuery(() => db.categories.toArray());
}

export function useInvestmentManagerData() {
  return useLiveQuery(() => db.transaction(
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
  ));
}

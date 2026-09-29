'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export function useFinanceContextData(dataVersion: number) {
  const financialData = useLiveQuery(() => db.transaction('r', db.tables, async () => ({
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
  })), [dataVersion]);

  const rawSettings = useLiveQuery(
    () => db.settings.get('general').then(settings => settings ?? null),
    [dataVersion],
  );
  const categories = useLiveQuery(() => db.categories.toArray(), [dataVersion]);
  const recurringRules = useLiveQuery(() => db.recurrents.toArray(), [dataVersion]);
  const plannedOccurrences = useLiveQuery(() => db.planned_occurrences.toArray(), [dataVersion]);

  return {
    financialData,
    rawSettings,
    categories,
    recurringRules,
    plannedOccurrences,
  };
}

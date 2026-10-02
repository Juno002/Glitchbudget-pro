type BrowserPerfCounters = Record<string, { calls: number; totalMs: number; maxMs: number }>;

type PerfGlobal = typeof globalThis & {
  __prismaPerfCounters?: BrowserPerfCounters;
};

async function measuredQuery<T>(name: string, query: () => Promise<T>): Promise<T> {
  const enabled = typeof location !== 'undefined' && new URLSearchParams(location.search).get('perf') === '1';
  const started = enabled ? performance.now() : 0;
  const result = await query();
  if (enabled) {
    const duration = performance.now() - started;
    const root = globalThis as PerfGlobal;
    const counters = root.__prismaPerfCounters ?? {};
    const current = counters[name] ?? { calls: 0, totalMs: 0, maxMs: 0 };
    counters[name] = {
      calls: current.calls + 1,
      totalMs: current.totalMs + duration,
      maxMs: Math.max(current.maxMs, duration),
    };
    root.__prismaPerfCounters = counters;
  }
  return result;
}

import { db } from '@/lib/db';
import { classifyDebtPaymentIntegrity, type RawDebtPayment } from '@/domain/data-integrity';

export function readFinanceContextData() {
  return measuredQuery('financeContext', () => db.transaction('r', db.tables, async () => {
    const [
      expenses,
      incomes,
      goals,
      goalContributions,
      budgets,
      debts,
      rawDebtPayments,
      transfers,
      accounts,
      investments,
    ] = await Promise.all([
      db.expenses.toArray(),
      db.incomes.toArray(),
      db.goals.toArray(),
      db.goal_contributions.toArray(),
      db.plans.toArray(),
      db.debts.toArray(),
      db.debt_payments.toArray(),
      db.account_transfers.toArray(),
      db.accounts.toArray(),
      db.investments.toArray(),
    ]);
    const paymentIntegrity = classifyDebtPaymentIntegrity(
      rawDebtPayments as unknown as RawDebtPayment[],
      debts,
      accounts,
    );
    return {
      expenses,
      incomes,
      goals,
      goalContributions,
      budgets,
      debts,
      debtPayments: paymentIntegrity.valid,
      quarantinedDebtPayments: paymentIntegrity.quarantined,
      transfers,
      accounts,
      investments,
    };
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
  return measuredQuery('accountOverview', () => db.transaction(
    'r',
    [db.accounts, db.account_transfers, db.incomes, db.expenses, db.debt_payments, db.debts],
    async () => {
      const [accounts, transfers, incomes, expenses, rawPayments, debts] = await Promise.all([
        db.accounts.toArray(),
        db.account_transfers.toArray(),
        db.incomes.toArray(),
        db.expenses.toArray(),
        db.debt_payments.toArray(),
        db.debts.toArray(),
      ]);
      return {
        accounts,
        transfers,
        incomes,
        expenses,
        payments: classifyDebtPaymentIntegrity(
          rawPayments as unknown as RawDebtPayment[],
          debts,
          accounts,
        ).valid,
        debts,
      };
    },
  ));
}

export function readInvestmentManagerData() {
  return measuredQuery('investmentManager', () => db.transaction(
    'r',
    [db.investments, db.accounts, db.account_transfers, db.incomes, db.expenses, db.debt_payments, db.debts],
    async () => {
      const [investments, accounts, transfers, incomes, expenses, rawPayments, debts] = await Promise.all([
        db.investments.toArray(),
        db.accounts.toArray(),
        db.account_transfers.toArray(),
        db.incomes.toArray(),
        db.expenses.toArray(),
        db.debt_payments.toArray(),
        db.debts.toArray(),
      ]);
      return {
        investments,
        accounts,
        transfers,
        incomes,
        expenses,
        payments: classifyDebtPaymentIntegrity(
          rawPayments as unknown as RawDebtPayment[],
          debts,
          accounts,
        ).valid,
      };
    },
  ));
}
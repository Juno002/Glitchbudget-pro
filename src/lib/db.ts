
import Dexie, { type Table } from 'dexie';

import type { Settings, Period, Income, Expense, Plan, Goal, GoalContribution, Budget, Recurring, Debt, DebtPayment, FxRate, Account, AccountTransfer } from '../domain/models';
export type { Settings, Period, Income, Expense, Plan, Goal, GoalContribution, Budget, Recurring, Debt, DebtPayment, FxRate, Account, AccountTransfer } from '../domain/models';

export class GlitchBudgetDB extends Dexie {
  accounts!: Table<Account, string>;
  account_transfers!: Table<AccountTransfer, string>;
  expenses!: Table<Expense, string>;
  incomes!: Table<Income, string>;
  goals!: Table<Goal, string>;
  goal_contributions!: Table<GoalContribution, string>;
  plans!: Table<Plan, [string, string]>; // Compound key [month, categoryId]
  settings!: Table<Settings, 'general'>;
  periods!: Table<Period, string>;
  recurrents!: Table<Recurring, string>;
  debts!: Table<Debt, string>;
  debt_payments!: Table<DebtPayment, string>;
  fxRates!: Table<FxRate, string>;

  constructor(name = 'GlitchBudgetDB') {
    super(name);
    this.version(8).stores({ accounts: 'id, type', account_transfers: 'id, fromAccountId, toAccountId, date', incomes: 'id, date, month, categoryId, type, accountId', expenses: 'id, date, month, categoryId, type, accountId', debt_payments: 'id, debtId, date, accountId' });
    this.version(7).stores({
      expenses: 'id, date, month, categoryId, type',
      incomes: 'id, date, month, categoryId, type',
      goals: 'id, status',
      goal_contributions: 'id, goalId, date',
      plans: '[month+categoryId], month, categoryId',
      settings: 'id',
      periods: 'id, year, month',
      recurrents: 'id, type, categoryId, freq, active, startDate, endDate',
      debts: 'id, status, type, createdAt',
      debt_payments: 'id, debtId, date',
      fxRates: 'id, base, quote, updatedAt',
    }).upgrade(tx => {
        return tx.table("settings").toCollection().modify(settings => {
            if (!settings.customCategoryIcons) {
                settings.customCategoryIcons = {};
            }
        });
    });
    this.version(6).stores({
      expenses: 'id, date, month, categoryId, type',
      incomes: 'id, date, month, categoryId, type',
      goals: 'id, status',
      goal_contributions: 'id, goalId, date',
      plans: '[month+categoryId], month, categoryId',
      settings: 'id',
      periods: 'id, year, month',
      recurrents: 'id, type, categoryId, freq, active, startDate, endDate',
      debts: 'id, status, type, createdAt',
      debt_payments: 'id, debtId, date',
      fxRates: 'id, base, quote, updatedAt',
    });
  }
}

export const db = new GlitchBudgetDB();

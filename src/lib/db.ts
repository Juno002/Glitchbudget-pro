
import Dexie, { type Table } from 'dexie';
import { migrateActualExpense, migrateRecurringRule } from '../domain/actual-planned-migration';
import { reconstructCategories, withoutLegacyCategories } from '../domain/categories';
import { migrateGoalRecords } from '../domain/goals';
import { normalizeCurrencyCode } from '../domain/currency';
import { normalizeFinancialDate } from './financial-date';

import type { Settings, Period, Income, Expense, Plan, Goal, GoalContribution, Budget, RecurringRule, PlannedOccurrence, Debt, DebtPayment, FxRate, Account, AccountTransfer, Category, Investment } from '../domain/models';

export const CURRENT_DB_SCHEMA_VERSION = 15;
export type { Settings, Period, Income, Expense, Plan, Goal, GoalContribution, Budget, RecurringRule, PlannedOccurrence, Debt, DebtPayment, FxRate, Account, AccountTransfer, Investment } from '../domain/models';

export class GlitchBudgetDB extends Dexie {
  categories!: Table<Category, string>;
  accounts!: Table<Account, string>;
  account_transfers!: Table<AccountTransfer, string>;
  investments!: Table<Investment, string>;
  expenses!: Table<Expense, string>;
  incomes!: Table<Income, string>;
  goals!: Table<Goal, string>;
  goal_contributions!: Table<GoalContribution, string>;
  plans!: Table<Plan, [string, string]>; // Compound key [month, categoryId]
  settings!: Table<Settings, 'general'>;
  periods!: Table<Period, string>;
  recurrents!: Table<RecurringRule, string>;
  planned_occurrences!: Table<PlannedOccurrence, string>;
  debts!: Table<Debt, string>;
  debt_payments!: Table<DebtPayment, string>;
  fxRates!: Table<FxRate, string>;

  constructor(name = 'GlitchBudgetDB') {
    super(name);
    this.version(CURRENT_DB_SCHEMA_VERSION).stores({
      debt_payments: 'id, debtId, date, accountId',
    }).upgrade(async tx => {
      await tx.table('debt_payments').toCollection().modify(payment => {
        try {
          payment.date = normalizeFinancialDate(payment.date);
        } catch {
          // Preserve corrupt historical data verbatim. Runtime integrity
          // boundaries quarantine it from financial calculations until repaired.
        }
      });
    });
    this.version(14).stores({
      accounts: 'id, type',
      investments: 'id, &accountId, type, status, maturityDate',
    });
    this.version(13).stores({ accounts: 'id, type' }).upgrade(async tx => {
      const settings = await tx.table('settings').get('general');
      const baseCurrency = normalizeCurrencyCode(settings?.currency);
      if (settings && settings.currency !== baseCurrency) {
        await tx.table('settings').update('general', { currency: baseCurrency });
      }

      const accounts = await tx.table('accounts').toArray();
      for (const account of accounts) account.currency = baseCurrency;
      if (accounts.length) await tx.table('accounts').bulkPut(accounts);

      const normalizeMovement = (row: any) => {
        row.currency = baseCurrency;
        row.fxRate = 1;
        row.amountBase = row.amount;
      };
      await tx.table('incomes').toCollection().modify(normalizeMovement);
      await tx.table('expenses').toCollection().modify(normalizeMovement);
      await tx.table('debt_payments').toCollection().modify(normalizeMovement);
    });
    this.version(12).stores({ goals: 'id' }).upgrade(async tx => {
      const migrated = migrateGoalRecords(await tx.table('goals').toArray(), await tx.table('goal_contributions').toArray());
      await tx.table('goals').bulkPut(migrated.goals);
      await tx.table('goal_contributions').bulkPut(migrated.contributions);
    });
    this.version(11).stores({
      planned_occurrences: 'id, ruleId, scheduledDate, status, &[ruleId+scheduledDate], &transactionId',
    });
    this.version(10).stores({
      expenses: 'id, date, month, categoryId, nature, accountId',
      recurrents: 'id, direction, categoryId, cadence, active, startDate, endDate',
    }).upgrade(async tx => {
      await tx.table('expenses').toCollection().modify(old => {
        const actual = migrateActualExpense(old);
        delete old.type; delete old.frequency; delete old.recurringId;
        Object.assign(old, actual);
      });
      await tx.table('recurrents').toCollection().modify(old => {
        const rule = migrateRecurringRule(old);
        delete old.type; delete old.freq;
        Object.assign(old, rule);
      });
    });
    this.version(9).stores({categories:'id, type'}).upgrade(async tx => {
      const settings=await tx.table('settings').get('general');
      const categories=reconstructCategories({settings, incomes:await tx.table('incomes').toArray(), expenses:await tx.table('expenses').toArray(), plans:await tx.table('plans').toArray(), recurrents:await tx.table('recurrents').toArray()});
      await tx.table('categories').bulkAdd(categories);
      if(settings) await tx.table('settings').put(withoutLegacyCategories(settings));
    });
    this.on('populate', tx => tx.table('categories').bulkAdd(reconstructCategories({})).then(()=>undefined));
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
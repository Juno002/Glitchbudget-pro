'use client';
import { saveRecurringRule, removeRecurringRule } from '@/lib/recurring-rule-service';
import { confirmPlannedOccurrence, materializePendingOccurrences, skipPlannedOccurrence, type ConfirmPlannedOccurrenceOptions } from '@/lib/planned-occurrence-service';
import { plannedOccurrenceWindow } from '@/domain/upcoming';
import { BudgetWarning } from '@/policies/budget-overspending';
import { activeCategories } from '@/domain/categories';
import { createCategory, resetCategories, requireCategory } from '@/lib/category-service';


import { periodContaining, periodForId, type BudgetPeriodRange, type PeriodRange } from '@/domain/periods';
import { type BudgetOverspendingBehavior } from '@/policies/settings';
import { withBudgetConfirmation } from '@/lib/expense-confirmation';
import { useBudgetConfirmation } from '@/hooks/use-budget-confirmation';
import { rollBudgetsIntoMonth, rollBudgetsIntoPeriod, prepareBudgetPeriodsForDate } from '@/lib/budget-rollover';
import { reassignBudgetLimit, saveBudgetLimits } from '@/lib/budget-service';
import { saveGoal, removeGoal } from '@/lib/goal-service';

import type { Budget, Goal, GoalContribution } from "@/lib/types";
import React, { createContext, useContext, useMemo, ReactNode, useCallback, useState, useEffect } from "react";
import type { Settings, Income, Expense, Plan, Debt, DebtPayment, RecurringRule, PlannedOccurrence, AccountTransfer, Account, Investment } from '@/domain/models';
import { useToast } from "@/hooks/use-toast";
import { localDate, monthlyAmount } from '@/lib/finance-calculations';
import { saveExpense, saveIncome, saveDebtPayment, saveGoalContribution, removeIncome, removeExpense } from '@/lib/transaction-service';
import { ensureCashAccount, saveTransfer } from '@/lib/accounts';
import { setBaseCurrency as persistBaseCurrency } from '@/lib/currency-service';
import { toCents } from "@/lib/utils";
import { friendlyError } from "@/lib/errors";
import { useFinanceContextData } from '@/hooks/use-finance-context-data';
import { useBackupManagement, type BackupFile } from '@/hooks/use-backup-management';
import { initializeSettings, resetPersistedSettings, updatePersistedSetting, updatePersistedSettings } from '@/lib/settings-service';
import { createDebt, updateDebt as persistDebt, removeDebt } from '@/lib/debt-service';
import { createFinanceReadModels, resolveFinanceSettings, selectGoalViews } from '@/domain/finance-read-models';
import { playExpense, playIncome, playBudgetExceeded, playGoalComplete } from "@/lib/sounds";

const DEFAULT_SETTINGS: Settings = {
  id: 'general',
  theme: 'dark',
  preventNegativeAccountBalance: true,
  budgetOverspendingBehavior: 'block',
  rolloverStrategy: 'reset',
  periodStartDay: 1,
  baseIncome: { freq: 'mensual', amount: 0 },
  currency: "DOP",
  locale: "es-DO",
  savePct: 0.00,
};

type RolloverStrategy = 'reset' | 'accumulate_surplus' | 'accumulate_debt';
export type { BackupFile } from '@/hooks/use-backup-management';

interface FinanceContextType {
  theme: 'light' | 'dark' | 'serious';
  currency: string;
  preventNegativeAccountBalance: boolean;
  budgetOverspendingBehavior: BudgetOverspendingBehavior;
  rolloverStrategy: RolloverStrategy;
  periodStartDay: number;
  currentPeriod: PeriodRange;
  incomes: Income[] | undefined;
  baseIncome: { freq: 'mensual' | 'quincenal' | 'semanal', amount: number };
  expenses: Expense[] | undefined;
  goals: Goal[] | undefined;
  goalContributions: GoalContribution[] | undefined;
  budgets: Plan[] | undefined;
  expenseCategories: string[];
  incomeCategories: string[];
  savePct: number;

  debts: Debt[] | undefined;
  debtPayments: DebtPayment[] | undefined;
  recurringRules: RecurringRule[] | undefined;
  plannedOccurrences: PlannedOccurrence[] | undefined;
  accountTransfers: AccountTransfer[] | undefined;
  accounts: Account[] | undefined;
  investments: Investment[] | undefined;

  setTheme: (theme: 'light' | 'dark' | 'serious') => void;
  setBaseCurrency: (currency: string) => Promise<boolean>;
  setPreventNegativeAccountBalance: (value: boolean) => void;
  setBudgetOverspendingBehavior: (value: BudgetOverspendingBehavior) => void;
  setRolloverStrategy: (strategy: RolloverStrategy) => void;
  setPeriodStartDay: (day: number) => Promise<void>;
  setBaseIncome: (baseIncome: { freq: 'mensual' | 'quincenal' | 'semanal', amount: number }) => void;
  addIncomeItem: (income: Omit<Income, "id" | "month">) => Promise<boolean>;
  updateIncomeItem: (income: Income) => Promise<boolean>;
  deleteIncomeItem: (id: string) => Promise<boolean>;
  addExpense: (expense: Omit<Expense, "id" | "month">) => Promise<boolean>;
  updateExpense: (expense: Expense) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<boolean>;
  addAccountTransfer: (transfer: Omit<AccountTransfer, 'id'>) => Promise<boolean>;
  addGoal: (goal: Omit<Goal, "id" | "saved" | "startDate" | "status">) => Promise<boolean>;
  updateGoal: (goal: Goal) => Promise<boolean>;
  deleteGoal: (id: string) => void;
  contributeToGoal: (id: string, amount: number) => Promise<boolean>;
  updateAllBudgets: (month: string, allBudgets: Omit<Budget, 'month'>[], budgetPeriod?: BudgetPeriodRange) => Promise<boolean>;
  transferBetweenBudgets: (month: string, fromCategoryId: string, toCategoryId: string, amount: number, budgetPeriod?: BudgetPeriodRange) => Promise<boolean>;
  prepareBudgetPeriod: (budgetPeriod: BudgetPeriodRange) => Promise<void>;
  resetSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<Settings>) => void;

  addDebt: (debt: Omit<Debt, 'id' | 'createdAt'>) => Promise<boolean>;
  updateDebt: (debt: Debt) => Promise<boolean>;
  deleteDebt: (id: string) => Promise<boolean>;
  addDebtPayment: (payment: Omit<DebtPayment, 'id'>) => Promise<boolean>;

  addRecurringRule: (recurring: Omit<RecurringRule, 'id'>) => Promise<boolean>;
  updateRecurringRule: (recurring: RecurringRule) => Promise<boolean>;
  deleteRecurringRule: (id: string) => Promise<boolean>;
  confirmPlannedOccurrenceItem: (id: string, options?: Omit<ConfirmPlannedOccurrenceOptions, 'budgetConfirmation'>) => Promise<boolean>;
  skipPlannedOccurrenceItem: (id: string) => Promise<boolean>;

  getMonthlyAverages: () => { incomeAvgMonthly: number, expenseAvgMonthly: number };
  getDisposable: (safetyPct?: number) => number;
  getTotals: ReturnType<typeof createFinanceReadModels>['getTotals'];
  getPosition: () => ReturnType<ReturnType<typeof createFinanceReadModels>['getPosition']>;
  getReportSnapshot: ReturnType<typeof createFinanceReadModels>['getReportSnapshot'];
  getExpensesByCategory: (month: string) => { name: string; value: number }[];
  getIncomesByCategory: (month: string) => { name: string; value: number }[];
  getExpensesByType: (month: string) => { name: string; total: number; count: number; avg: number }[];
  getBudgetStatusDetails: ReturnType<typeof createFinanceReadModels>['getBudgetStatusDetails'];

  addIncomeCategory: (category: string, iconName?: string) => Promise<void>;
  resetIncomeCategories: () => Promise<void>;
  addExpenseCategory: (category: string, iconName?: string) => Promise<void>;
  resetExpenseCategories: () => Promise<void>;

  currentMonth: string;
  setCurrentMonth: (month: string) => void;

  // Backup Management
  createBackup: () => Promise<BackupFile | undefined>;
  listBackups: () => Promise<BackupFile[]>;
  restoreBackup: (name: string) => Promise<boolean>;
  deleteBackup: (name: string) => Promise<void>;
  getBackupFile: (name: string) => Promise<File | null>;
  importData: (file: File) => Promise<boolean>;
  importEncryptedData: (file: File, password: string) => Promise<boolean>;
  backupBeforeDestructiveImport: () => Promise<void>;
  exportData: () => Promise<void>;
  setDataVersion: React.Dispatch<React.SetStateAction<number>>;


  loading: boolean;
  isWorking: boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);


export function FinanceProvider({ children }: { children: ReactNode }) {
  const [currentMonth, setCurrentMonthState] = useState(localDate().slice(0, 7));
  const { toast } = useToast();
  const [dataVersion, setDataVersion] = useState(0);
  const {
    isWorking,
    backupBeforeDestructiveImport,
    createBackup,
    listBackups,
    restoreBackup,
    deleteBackup,
    getBackupFile,
    exportData,
    importData,
    importEncryptedData,
  } = useBackupManagement(setDataVersion);
  const {
    financialData,
    rawSettings,
    categories,
    recurringRules,
    plannedOccurrences,
  } = useFinanceContextData(dataVersion);
  const expenses = financialData?.expenses;
  const incomes = financialData?.incomes;
  const goals = useMemo(() => financialData ? selectGoalViews(financialData.goals, financialData.goalContributions) : undefined, [financialData]);
  const goalContributions = financialData?.goalContributions;
  const budgets = financialData?.budgets;
  const debts = financialData?.debts;
  const debtPayments = financialData?.debtPayments;
  const transfers = financialData?.transfers;
  const accounts = financialData?.accounts;
  const investments = financialData?.investments;
  const expenseCategories = useMemo(() => activeCategories(categories || [], 'expense').map(c => c.id), [categories]);
  const incomeCategories = useMemo(() => activeCategories(categories || [], 'income').map(c => c.id), [categories]);
  useEffect(() => {
    if (accounts && !accounts.some(a => a.isDefaultCash)) {
      void ensureCashAccount().catch(error => toast({ title: 'No se pudo preparar Efectivo', description: friendlyError(error), variant: 'destructive' }));
    }
  }, [accounts, toast]);

  useEffect(() => {
    if (!recurringRules) return;
    const today = localDate();
    void materializePendingOccurrences(plannedOccurrenceWindow(today)).catch(error => {
      toast({ title: 'No se pudieron actualizar los pagos planificados', description: friendlyError(error), variant: 'destructive' });
    });
  }, [recurringRules, toast]);

  const settings = useMemo(() => resolveFinanceSettings(DEFAULT_SETTINGS, rawSettings ?? null), [rawSettings]);

  const loading = useMemo(() => [expenses, incomes, goals, goalContributions, budgets, rawSettings, debts, debtPayments, recurringRules, plannedOccurrences, accounts, transfers, investments, categories].some(v => v === undefined), [expenses, incomes, goals, goalContributions, budgets, rawSettings, debts, debtPayments, recurringRules, plannedOccurrences, accounts, transfers, investments, categories]);
  const currentPeriod = useMemo(() => periodForId(currentMonth, settings), [currentMonth, settings]);

  useEffect(() => {
    if (loading) return;
    void prepareBudgetPeriodsForDate(localDate()).catch(error => toast({ title:'No se pudieron preparar los presupuestos', description:friendlyError(error), variant:'destructive' }));
  }, [loading, rawSettings, toast]);

  useEffect(() => {
    setCurrentMonthState(periodContaining(localDate(), settings).id);
  }, [settings]);

  useEffect(() => {
    async function initializeDB() {
      if (rawSettings === undefined) return;
      try {
        const result = await initializeSettings(DEFAULT_SETTINGS, rawSettings);
        if (result === 'seeded') setDataVersion(version => version + 1);
      } catch (error) {
        console.error('Failed to initialize default settings:', error);
        toast({ title: 'Error de inicialización', description: friendlyError(error), variant: 'destructive' });
      }
    }
    initializeDB().catch(()=>{});
  }, [rawSettings, toast]);

  const activeSettings = settings;
  const { confirm: confirmBudget, dialog: budgetConfirmationDialog } = useBudgetConfirmation(activeSettings.currency, activeSettings.locale);

  useEffect(() => {
    if (activeSettings.theme) {
        const theme = activeSettings.theme === 'system' ? 'dark' : activeSettings.theme;
        document.body.classList.remove('light', 'dark', 'serious', 'system');
        document.documentElement.classList.remove('light', 'dark', 'serious', 'system');
        document.documentElement.classList.add(theme);
        // "only" opts out of automatic darkening in Chromium-based mobile browsers.
        document.documentElement.style.colorScheme = theme === 'dark' ? 'only dark' : 'only light';
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#080808' : theme === 'serious' ? '#f7f7f7' : '#fafafa');
    }
  }, [activeSettings.theme]);


  const readModels = useMemo(() => createFinanceReadModels({
    settings: activeSettings,
    currentMonth,
    incomes: incomes || [],
    expenses: expenses || [],
    budgets: budgets || [],
    goalContributions: goalContributions || [],
    debtPayments: debtPayments || [],
    accounts: accounts || [],
    debts: debts || [],
    transfers: transfers || [],
    expenseCategoryIds: expenseCategories,
  }), [
    activeSettings, currentMonth, incomes, expenses, budgets, goalContributions,
    debtPayments, accounts, debts, transfers, expenseCategories,
  ]);

  const {
    getSpentAmount,
    getTotals,
    getMonthlyAverages,
    getDisposable,
    getBudgetStatusDetails,
    getExpensesByCategory,
    getIncomesByCategory,
    getReportSnapshot,
    getExpensesByType,
  } = readModels;

  const getPosition = useCallback(
    () => readModels.getPosition(localDate()),
    [readModels],
  );

  const addIncomeCategory = useCallback(async (name:string, iconName?:string) => { await createCategory(name,'income',iconName); }, []);
  const addExpenseCategory = useCallback(async (name:string, iconName?:string) => { await createCategory(name,'expense',iconName); }, []);
  const resetIncomeCategories = useCallback(async () => { await resetCategories('income'); }, []);
  const resetExpenseCategories = useCallback(async () => { await resetCategories('expense'); }, []);

  const resetSettings = useCallback(async () => {
    await resetPersistedSettings(DEFAULT_SETTINGS);
    setDataVersion(version => version + 1);
  }, []);

  const setCurrentMonth = useCallback(async (month: string) => {
    setCurrentMonthState(month);

    try {
      const created = await rollBudgetsIntoMonth(month);
      if (created) toast({ title: 'Presupuestos preparados', description: 'Se aplicó tu preferencia de cierre al período seleccionado.' });
    } catch (error) {
      toast({ title: 'No se pudieron preparar los presupuestos', description: friendlyError(error), variant: 'destructive' });
    }
  }, [toast]);

  const addDebt = useCallback(async (debt: Omit<Debt, "id" | "createdAt">) => {
    try {
      await createDebt(debt);
      toast({ title: 'Deuda registrada' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error al registrar', description: friendlyError(e), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const updateDebt = useCallback(async (debt: Debt) => {
    try {
      await persistDebt(debt);
      toast({ title: 'Deuda actualizada' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error al actualizar', description: friendlyError(e), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const deleteDebt = useCallback(async (id: string) => {
    try {
      await removeDebt(id);
      toast({ title: 'Deuda eliminada' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error al eliminar', description: friendlyError(e), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const addDebtPayment = useCallback(async (payment: Omit<DebtPayment, "id">) => {
    try {
      const newPayment: DebtPayment = { ...payment, id: crypto.randomUUID() };
      await saveDebtPayment(newPayment);
      toast({ title: 'Pago registrado' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error al pagar', description: friendlyError(e), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const addRecurringRule = useCallback(async (recurring: Omit<RecurringRule, "id">) => {
    try {
      await saveRecurringRule({ ...recurring, id: crypto.randomUUID() });
      toast({ title: 'Planificación registrada' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: friendlyError(e), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const updateRecurringRule = useCallback(async (recurring: RecurringRule) => {
    try {
      await saveRecurringRule(recurring, true);
      toast({ title: 'Planificación actualizada' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: friendlyError(e), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const deleteRecurringRule = useCallback(async (id: string) => {
    try {
      await removeRecurringRule(id);
      toast({ title: 'Planificación borrada' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: friendlyError(e), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const confirmPlannedOccurrenceItem = useCallback(async (
    id: string,
    options: Omit<ConfirmPlannedOccurrenceOptions, 'budgetConfirmation'> = {},
  ) => {
    let budgetConfirmation: string | undefined;
    for (;;) {
      try {
        const result = await confirmPlannedOccurrence(id, { ...options, budgetConfirmation });
        if (!result.alreadyConfirmed) {
          if (result.direction === 'expense') playExpense(); else playIncome();
          toast({ title: result.direction === 'expense' ? 'Pago confirmado' : 'Ingreso confirmado' });
        }
        return true;
      } catch (error) {
        if (error instanceof BudgetWarning) {
          if (!await confirmBudget(error)) return false;
          budgetConfirmation = error.evaluation.confirmation;
          continue;
        }
        toast({ title: 'No se pudo confirmar', description: friendlyError(error), variant: 'destructive' });
        return false;
      }
    }
  }, [confirmBudget, toast]);

  const skipPlannedOccurrenceItem = useCallback(async (id: string) => {
    try {
      await skipPlannedOccurrence(id);
      toast({ title: 'Planificación omitida' });
      return true;
    } catch (error) {
      toast({ title: 'No se pudo omitir', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const value: FinanceContextType = useMemo(() => ({
    theme: activeSettings.theme === 'system' ? 'dark' : activeSettings.theme,
    currency: activeSettings.currency,
    preventNegativeAccountBalance: activeSettings.preventNegativeAccountBalance,
    budgetOverspendingBehavior: activeSettings.budgetOverspendingBehavior,
    rolloverStrategy: activeSettings.rolloverStrategy,
    periodStartDay: activeSettings.periodStartDay ?? 1,
    currentPeriod,
    baseIncome: activeSettings.baseIncome,
    expenseCategories: expenseCategories,
    incomeCategories: incomeCategories,
    savePct: activeSettings.savePct,
    incomes,
    expenses,
    goals,
    goalContributions,
    budgets,
    debts,
    debtPayments,
    recurringRules,
    plannedOccurrences,
    accountTransfers: transfers,
    accounts,
    investments,
    setTheme,
    setBaseCurrency,
    setPreventNegativeAccountBalance, setBudgetOverspendingBehavior,
    setRolloverStrategy,
    setPeriodStartDay,
    setBaseIncome,
    addIncomeItem,
    updateIncomeItem,
    deleteIncomeItem,
    addExpense,
    updateExpense,
    deleteExpense,
    addAccountTransfer,
    addGoal,
    updateGoal,
    deleteGoal,
    contributeToGoal,
    updateAllBudgets,
    transferBetweenBudgets,
    prepareBudgetPeriod,
    resetSettings,
    updateSettings,
    addDebt,
    updateDebt,
    deleteDebt,
    addDebtPayment,
    addRecurringRule,
    updateRecurringRule,
    deleteRecurringRule,
    confirmPlannedOccurrenceItem,
    skipPlannedOccurrenceItem,
    getMonthlyAverages,
    getDisposable,
    getTotals,
    getPosition,
    getReportSnapshot,
    getSpentAmount,
    getExpensesByCategory,
    getIncomesByCategory,
    getExpensesByType,
    getBudgetStatusDetails,
    addIncomeCategory,
    resetIncomeCategories,
    addExpenseCategory,
    resetExpenseCategories,
    currentMonth,
    setCurrentMonth,
    createBackup,
    listBackups,
    restoreBackup,
    deleteBackup,
    getBackupFile,
    importData,
    importEncryptedData,
    backupBeforeDestructiveImport,
    exportData,
    setDataVersion,
    loading,
    isWorking,
  }), [
    activeSettings, currentPeriod, expenseCategories, incomeCategories, incomes, expenses, goals, goalContributions, budgets, debts, debtPayments, recurringRules, plannedOccurrences, transfers, accounts, investments,
    setTheme, setBaseCurrency, setPreventNegativeAccountBalance, setBudgetOverspendingBehavior, setRolloverStrategy, setPeriodStartDay, setBaseIncome, updateSettings,
    addIncomeItem, updateIncomeItem, deleteIncomeItem, addExpense, updateExpense, deleteExpense, addAccountTransfer,
    addGoal, updateGoal, deleteGoal, contributeToGoal,
    updateAllBudgets, transferBetweenBudgets, prepareBudgetPeriod, resetSettings,
    addDebt, updateDebt, deleteDebt, addDebtPayment,
    addRecurringRule, updateRecurringRule, deleteRecurringRule, confirmPlannedOccurrenceItem, skipPlannedOccurrenceItem,
    getMonthlyAverages, getDisposable, getTotals, getPosition, getReportSnapshot, getSpentAmount,
    getExpensesByCategory, getIncomesByCategory, getExpensesByType, getBudgetStatusDetails,
    addIncomeCategory, resetIncomeCategories, addExpenseCategory, resetExpenseCategories,
    currentMonth, setCurrentMonth, createBackup, listBackups, restoreBackup, deleteBackup, getBackupFile,
    importData, importEncryptedData, backupBeforeDestructiveImport, exportData, setDataVersion, loading, isWorking
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
      {budgetConfirmationDialog}
    </FinanceContext.Provider>
  );
}

export function useFinances() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error("useFinances must be used within a FinanceProvider");
  }
  return context;
}

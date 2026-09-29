'use client';
import { saveRecurringRule, removeRecurringRule } from '@/lib/recurring-rule-service';
import { confirmPlannedOccurrence, materializePendingOccurrences, skipPlannedOccurrence, type ConfirmPlannedOccurrenceOptions } from '@/lib/planned-occurrence-service';
import { plannedOccurrenceWindow } from '@/domain/upcoming';
import { BudgetWarning } from '@/policies/budget-overspending';
import { activeCategories } from '@/domain/categories';
import { createCategory, resetCategories } from '@/lib/category-service';

import { selectDisposable, selectExpensesByNature, selectPeriodAverages, selectPeriodMetrics, recordedCategoriesForPeriod, selectCategorySpendingForPeriod } from '@/domain/metrics';
import { periodContaining, periodForId, type BudgetPeriodRange, type PeriodRange } from '@/domain/periods';
import { type BudgetOverspendingBehavior } from '@/policies/settings';
import { withBudgetConfirmation } from '@/lib/expense-confirmation';
import { useBudgetConfirmation } from '@/hooks/use-budget-confirmation';
import { selectPosition } from '@/domain/ledger';
import { selectReportsSnapshot } from '@/domain/reports';
import type { DateRange } from '@/domain/periods';
import { rollBudgetsIntoMonth, rollBudgetsIntoPeriod, prepareBudgetPeriodsForDate } from '@/lib/budget-rollover';
import { selectBudgetStatusDetails } from '@/domain/budgets';
import { reassignBudgetLimit, saveBudgetLimits } from '@/lib/budget-service';
import { goalView } from '@/domain/goals';
import { saveGoal, removeGoal } from '@/lib/goal-service';

import type { Budget, Goal, GoalContribution } from "@/lib/types";
import React, { createContext, useContext, useMemo, ReactNode, useCallback, useState, useEffect } from "react";
import type { Settings, Income, Expense, Plan, Debt, DebtPayment, RecurringRule, PlannedOccurrence, AccountTransfer, Account, Investment } from '@/domain/models';
import { useToast } from "@/hooks/use-toast";
import { localDate } from '@/lib/finance-calculations';
import { saveExpense, saveIncome, saveDebtPayment, saveGoalContribution, removeIncome, removeExpense } from '@/lib/transaction-service';
import { ensureCashAccount, saveTransfer } from '@/lib/accounts';
import { setBaseCurrency as persistBaseCurrency } from '@/lib/currency-service';
import { toCents } from "@/lib/utils";
import { friendlyError } from "@/lib/errors";
import { useFinanceContextData } from '@/hooks/use-finance-context-data';
import { useBackupManagement, type BackupFile } from '@/hooks/use-backup-management';
import { initializeSettings, resetPersistedSettings, saveBaseIncomeInput, savePeriodStartDay, updatePersistedSetting, updatePersistedSettings } from '@/lib/settings-service';
import { createDebt, updateDebt as persistDebt, removeDebt } from '@/lib/debt-service';
import { playExpense, playIncome, playBudgetExceeded, playGoalComplete } from "@/lib/sounds";
import { DEFAULT_SETTINGS, resolveSettings } from "@/lib/settings-read-model";

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
  getTotals: (periodId: string) => ReturnType<typeof selectPeriodMetrics>;
  getPosition: () => ReturnType<typeof selectPosition>;
  getReportSnapshot: (range: DateRange, through?: string) => ReturnType<typeof selectReportsSnapshot>;
  getExpensesByCategory: (month: string) => { name: string; value: number }[];
  getIncomesByCategory: (month: string) => { name: string; value: number }[];
  getExpensesByType: (month: string) => { name: string; total: number; count: number; avg: number }[];
  getBudgetStatusDetails: (month: string, budgetPeriod?: BudgetPeriodRange) => Array<Budget & { range: BudgetPeriodRange; spent: number; remaining: number; percentage: number; configured: boolean; status: 'ok' | 'alert' | 'over' | 'unbudgeted' }>;

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
  const goals = useMemo(() => financialData?.goals.map(goal => goalView(goal, financialData.goalContributions)), [financialData]);
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

  const settings = useMemo(() => resolveSettings(rawSettings), [rawSettings]);

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
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#080808' : theme === 'serious' ? '#f7f7f7' : '#f5f4ef');
    }
  }, [activeSettings.theme]);


  const getSpentAmount = useCallback((categoryId: string, periodId: string): number =>
    selectCategorySpendingForPeriod(expenses || [], categoryId, periodForId(periodId, activeSettings)), [expenses, activeSettings]);

  const getTotals = useCallback((periodId: string) => selectPeriodMetrics({
    settings: activeSettings, incomes: incomes || [], expenses: expenses || [],
    budgets: budgets || [], goalContributions: goalContributions || [], debtPayments: debtPayments || [],
  }, periodForId(periodId, activeSettings)), [activeSettings, incomes, expenses, budgets, goalContributions, debtPayments]);

  const getMonthlyAverages = useCallback((numMonths = 3) => selectPeriodAverages({
    settings: activeSettings,
    incomes: incomes || [],
    expenses: expenses || [],
    budgets: budgets || [],
    goalContributions: goalContributions || [],
    debtPayments: debtPayments || [],
  }, currentMonth, activeSettings, numMonths), [
    activeSettings, incomes, expenses, budgets, goalContributions, debtPayments, currentMonth,
  ]);

  const getDisposable = useCallback(
    (safetyPct = 0.05) => selectDisposable(getMonthlyAverages(), safetyPct),
    [getMonthlyAverages],
  );

  const updateSetting = useCallback(async (key: keyof Settings, value: any) => {
    try {
      await updatePersistedSetting(key, value);
      return true;
    } catch (error) {
      console.error(`Failed to update setting ${key}:`, error);
      toast({ title: 'Error al guardar configuración', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
      try {
          await updatePersistedSettings(newSettings);
      } catch (error) {
          toast({ title: 'Error al actualizar', description: friendlyError(error), variant: 'destructive' });
      }
  }, [toast]);

  const setTheme = useCallback((theme: 'light' | 'dark' | 'serious') => updateSetting('theme', theme), [updateSetting]);
  const setBaseCurrency = useCallback(async (currency: string) => {
    try {
      const next = await persistBaseCurrency(currency);
      toast({ title: 'Moneda base actualizada', description: `Los importes nuevos usarán ${next}.` });
      return true;
    } catch (error) {
      toast({ title: 'No se pudo cambiar la moneda base', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);
  const setPreventNegativeAccountBalance = useCallback((value: boolean) => updateSetting('preventNegativeAccountBalance', value), [updateSetting]);
  const setBudgetOverspendingBehavior = useCallback((value: BudgetOverspendingBehavior) => updateSetting('budgetOverspendingBehavior', value), [updateSetting]);
  const setRolloverStrategy = useCallback((strategy: RolloverStrategy) => updateSetting('rolloverStrategy', strategy), [updateSetting]);
  const setPeriodStartDay = useCallback(async (day: number) => {
    try {
      await savePeriodStartDay(day);
      const nextId = periodContaining(localDate(), { periodStartDay: day }).id;
      setCurrentMonthState(nextId);
      try { await rollBudgetsIntoMonth(nextId); } catch {}
      toast({ title: 'Inicio del período actualizado', description: day === 1 ? 'Se usarán meses calendario.' : `Cada período comenzará el día ${day}.` });
    } catch (error) {
      toast({ title: 'No se pudo actualizar el inicio del período', description: friendlyError(error), variant: 'destructive' });
    }
  }, [toast]);
  const setBaseIncome = useCallback(async (baseIncome: { freq: 'mensual' | 'quincenal' | 'semanal', amount: number }) => {
    try {
      await saveBaseIncomeInput(baseIncome);
      toast({ title: 'Ingreso base guardado' });
    } catch (error) {
      toast({ title: 'No se pudo guardar el ingreso base', description: friendlyError(error), variant: 'destructive' });
    }
  }, [toast]);

  const addIncomeItem = useCallback(async (income: Omit<Income, "id" | "month">) => {
    try {
      await saveIncome({ ...income, id: crypto.randomUUID() });
      playIncome();
      toast({ title: 'Ingreso agregado' });
      return true;
    } catch (error) {
      toast({ title: 'Error al agregar ingreso', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const updateIncomeItem = useCallback(async (income: Income) => {
    try {
      await saveIncome(income, true);
      toast({ title: 'Ingreso actualizado' });
      return true;
    } catch (error) {
      toast({ title: 'Error al actualizar ingreso', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const deleteIncomeItem = useCallback(async (id: string) => {
    try {
      await removeIncome(id);
      toast({ title: 'Ingreso eliminado' });
      return true;
    } catch (error) {
      toast({ title: 'Error al eliminar ingreso', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const addExpense = useCallback(async (expense: Omit<Expense, "id" | "month">) => {
    try {
      const input = { ...expense, id: crypto.randomUUID() };
      if (!await withBudgetConfirmation(token => saveExpense(input, false, token), confirmBudget)) return false;
      playExpense();
      toast({ title: 'Gasto agregado' });
      return true;
    } catch (error) {
      toast({ title: 'Error al agregar gasto', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast, confirmBudget]);

  const updateExpense = useCallback(async (expense: Expense) => {
    try {
      if (!await withBudgetConfirmation(token => saveExpense(expense, true, token), confirmBudget)) return false;
      toast({ title: 'Gasto actualizado' });
      return true;
    } catch (error) {
      toast({ title: 'Error al actualizar gasto', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast, confirmBudget]);

  const deleteExpense = useCallback(async (id: string) => {
    try {
      await removeExpense(id);
      toast({ title: 'Gasto eliminado' });
      return true;
    } catch (error) {
      toast({ title: 'Error al eliminar gasto', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const addAccountTransfer = useCallback(async (transfer: Omit<AccountTransfer, 'id'>) => {
    try {
      await saveTransfer({ ...transfer, id: crypto.randomUUID() });
      toast({ title: 'Transferencia registrada', description: 'Se actualizó la cuenta de origen y destino sin crear ingreso ni gasto.' });
      return true;
    } catch (error) {
      toast({ title: 'No se pudo registrar la transferencia', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const addGoal = useCallback(async (goal: Omit<Goal, "id" | "saved" | "startDate" | "status">) => {
    try {
      const newGoal = {
          name: goal.name,
          date: goal.date || undefined,
          target: toCents(goal.target),
          quota: toCents(goal.quota),
          id: crypto.randomUUID(),
          startDate: localDate(),
      };
      await saveGoal(newGoal);
      toast({ title: '¡Meta creada!', description: `Tu meta "${newGoal.name}" fue añadida.` });
      return true;
    } catch (error) {
      toast({ title: 'Error al crear meta', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const updateGoal = useCallback(async (goal: Goal) => {
    try {
      await saveGoal(goal, 'update');
      return true;
    } catch (error) {
      toast({ title: 'Error al actualizar meta', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const deleteGoal = useCallback(async (id: string) => {
    try {
      await removeGoal(id);
      toast({ title: 'Meta eliminada' });
    } catch (error) {
      toast({ title: 'Error al eliminar meta', description: friendlyError(error), variant: 'destructive' });
    }
  }, [toast]);

  const contributeToGoal = useCallback(async (id: string, amount: number) => {
    const amountInCents = toCents(amount);
    const today = localDate();
    const newContribution: GoalContribution = { id: crypto.randomUUID(), goalId: id, amount: amountInCents, date: today };

    try {
      const isCompletedNow = await saveGoalContribution(newContribution);
      if (isCompletedNow) {
          playGoalComplete();
      }
      toast({ title: '¡Contribución exitosa!', description: 'La reserva de tu meta se ha actualizado.' });
      return true;
    } catch (error: any) {
      toast({ title: 'Error al aportar a la meta', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const updateAllBudgets = useCallback(async (month: string, allBudgets: Omit<Budget, 'month'>[], budgetPeriod?: BudgetPeriodRange) => {
    try {
      const range = budgetPeriod ?? { ...periodForId(month, activeSettings), kind: 'monthly' as const };
      await saveBudgetLimits(range, allBudgets.map(b => ({ categoryId:b.categoryId, limit:toCents(b.limit) })));
      toast({ title: '¡Presupuestos guardados!'});
      return true;
    } catch (error) {
      toast({ title: 'Error al guardar presupuestos', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast, activeSettings]);

  const transferBetweenBudgets = useCallback(async (month: string, fromCategoryId: string, toCategoryId: string, amount: number, budgetPeriod?: BudgetPeriodRange) => {
    const amountInCents = toCents(amount);
    try {
      const range = budgetPeriod ?? { ...periodForId(month, activeSettings), kind: 'monthly' as const };
      await reassignBudgetLimit(range, fromCategoryId, toCategoryId, amountInCents);
      toast({
        title: 'Transferencia de presupuesto completada',
        description: 'Solo cambió la asignación planificada entre categorías; no se movió dinero real.',
      });
      return true;
    } catch(error) {
      toast({
        title: 'Error en la transferencia de presupuesto',
        description: friendlyError(error),
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, activeSettings]);

  const prepareBudgetPeriod = useCallback(async (budgetPeriod: BudgetPeriodRange) => {
    try {
      if (await rollBudgetsIntoPeriod(budgetPeriod)) setDataVersion(version => version + 1);
    } catch (error) {
      toast({ title: 'No se pudo aplicar el rollover', description: friendlyError(error), variant: 'destructive' });
    }
  }, [toast]);

  const getBudgetStatusDetails = useCallback((periodId: string, budgetPeriod?: BudgetPeriodRange) => {
    const range = budgetPeriod ?? { ...periodForId(periodId, activeSettings), kind: 'monthly' as const };
    return selectBudgetStatusDetails(budgets || [], expenses || [], expenseCategories, range);
  }, [budgets, expenses, expenseCategories, activeSettings]);

  const getExpensesByCategory = useCallback((periodId: string) => recordedCategoriesForPeriod(expenses || [], periodForId(periodId, activeSettings)), [expenses, activeSettings]);
  const getIncomesByCategory = useCallback((periodId: string) => recordedCategoriesForPeriod(incomes || [], periodForId(periodId, activeSettings)), [incomes, activeSettings]);
  const getReportSnapshot = useCallback((range: DateRange, through = range.end) => selectReportsSnapshot({
    accounts: accounts || [],
    debts: debts || [],
    incomes: incomes || [],
    expenses: expenses || [],
    debtPayments: debtPayments || [],
    transfers: transfers || [],
  }, range, through), [accounts, debts, incomes, expenses, debtPayments, transfers]);
  const getPosition = useCallback(
    () => selectPosition(accounts || [], debts || [], { incomes: incomes || [], expenses: expenses || [], payments: debtPayments || [], transfers: transfers || [] }, localDate()),
    [accounts, debts, incomes, expenses, debtPayments, transfers],
  );

  const getExpensesByType = useCallback(
    (periodId: string) => selectExpensesByNature(expenses || [], periodForId(periodId, activeSettings)),
    [expenses, activeSettings],
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

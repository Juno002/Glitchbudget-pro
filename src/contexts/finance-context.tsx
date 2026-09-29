'use client';
import { saveRecurringRule, removeRecurringRule } from '@/lib/recurring-rule-service';
import { confirmPlannedOccurrence, materializePendingOccurrences, skipPlannedOccurrence, type ConfirmPlannedOccurrenceOptions } from '@/lib/planned-occurrence-service';
import { plannedOccurrenceWindow } from '@/domain/upcoming';
import { BudgetWarning } from '@/policies/budget-overspending';
import { activeCategories, withoutLegacyCategories } from '@/domain/categories';
import { createCategory, resetCategories, requireCategory } from '@/lib/category-service';

import { selectPeriodMetrics, recordedCategoriesForPeriod, recordedExpenseForPeriod, selectCategorySpendingForPeriod, selectBudgetRemaining } from '@/domain/metrics';
import { periodContaining, periodForId, type BudgetPeriodRange, type PeriodRange } from '@/domain/periods';
import { normalizeFinancialPolicies, type BudgetOverspendingBehavior } from '@/policies/settings';
import { readFinancialPolicies } from '@/lib/policy-settings';
import { withBudgetConfirmation } from '@/lib/expense-confirmation';
import { useBudgetConfirmation } from '@/hooks/use-budget-confirmation';
import { selectPosition } from '@/domain/ledger';
import { selectReportsSnapshot } from '@/domain/reports';
import type { DateRange } from '@/domain/periods';
import { rollBudgetsIntoMonth, rollBudgetsIntoPeriod, prepareBudgetPeriodsForDate } from '@/lib/budget-rollover';
import { budgetPlanForRange, budgetPlansForRange, budgetStatusForRange } from '@/domain/budgets';
import { reassignBudgetLimit, saveBudgetLimits } from '@/lib/budget-service';
import { goalView } from '@/domain/goals';
import { saveGoal, removeGoal } from '@/lib/goal-service';

import type { Budget, Goal, GoalContribution } from "@/lib/types";
import React, { createContext, useContext, useMemo, ReactNode, useCallback, useState, useEffect } from "react";
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Settings, type Income, type Expense, type Plan, type Debt, type DebtPayment, type RecurringRule, type PlannedOccurrence, type AccountTransfer, type Account, type Investment } from '@/lib/db';
import { computeDisposable } from "@/lib/goal-calculator";
import { useToast } from "@/hooks/use-toast";
import { localDate, monthlyAmount } from '@/lib/finance-calculations';
import { saveExpense, saveIncome, saveDebtPayment, saveGoalContribution, removeIncome, removeExpense } from '@/lib/transaction-service';
import { ensureCashAccount, saveTransfer } from '@/lib/accounts';
import { setBaseCurrency as persistBaseCurrency } from '@/lib/currency-service';
import { toCents } from "@/lib/utils";
import { friendlyError } from "@/lib/errors";
import { importDataJSON, exportDataJSON } from '@/lib/backup-json';
import { restoreEncryptedBackupText } from '@/lib/encrypted-backup-restore';
import { opfsWrite, opfsRead, hasOPFS, opfsList, opfsDelete } from "@/lib/opfs";
import { createPreImportSafetyBackup } from '@/lib/pre-import-backup';
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
export type BackupFile = { name: string; lastModified: number };

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
  const [isWorking, setIsWorking] = useState(false);

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
  const rawSettings = useLiveQuery(() => db.settings.get('general').then(s => s ?? null), [dataVersion]);
  const categories = useLiveQuery(() => db.categories.toArray(), [dataVersion]);
  const expenseCategories = useMemo(() => activeCategories(categories || [], 'expense').map(c => c.id), [categories]);
  const incomeCategories = useMemo(() => activeCategories(categories || [], 'income').map(c => c.id), [categories]);
  const recurringRules = useLiveQuery(() => db.recurrents.toArray(), [dataVersion]);
  const plannedOccurrences = useLiveQuery(() => db.planned_occurrences.toArray(), [dataVersion]);
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

  const settings = useMemo(() => {
    const s: Partial<Settings> = rawSettings ?? {};
    return {
      ...DEFAULT_SETTINGS,
      ...s,
      ...normalizeFinancialPolicies(rawSettings ?? DEFAULT_SETTINGS),
      baseIncome: {
        amount: Math.max(0, Number(s?.baseIncome?.amount ?? 0)),
        freq: s?.baseIncome?.freq ?? 'mensual'
      },
      savePct: s.savePct ?? DEFAULT_SETTINGS.savePct,
    };
  }, [rawSettings]);

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
        if (rawSettings === undefined) return; // Dexie query still pending
        if (rawSettings !== null) {
          await db.transaction('rw', db.settings, readFinancialPolicies);
          return;
        }
        // rawSettings is null => no record in DB, seed defaults
        console.log("No settings found, initializing database with default settings.");
        try {
            await db.settings.put(DEFAULT_SETTINGS);
            setDataVersion(v => v + 1);
        } catch (error) {
            console.error("Failed to initialize default settings:", error);
            toast({ title: "Error de inicialización", description: friendlyError(error), variant: 'destructive' });
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


  const getSpentAmount = useCallback((categoryId: string, periodId: string): number =>
    selectCategorySpendingForPeriod(expenses || [], categoryId, periodForId(periodId, activeSettings)), [expenses, activeSettings]);

  const getTotals = useCallback((periodId: string) => selectPeriodMetrics({
    settings: activeSettings, incomes: incomes || [], expenses: expenses || [],
    budgets: budgets || [], goalContributions: goalContributions || [], debtPayments: debtPayments || [],
  }, periodForId(periodId, activeSettings)), [activeSettings, incomes, expenses, budgets, goalContributions, debtPayments]);

  const getMonthlyAverages = useCallback((numMonths = 3) => {
    const periodIds = Array.from(new Set([
      currentMonth,
      ...[...(incomes || []), ...(expenses || [])].map(t => periodContaining(t.date, activeSettings).id),
    ])).filter(id => id <= currentMonth).sort().slice(-numMonths);
    const totalIncome = periodIds.reduce((sum, id) => sum + getTotals(id).recordedIncome, 0);
    const totalExpenses = periodIds.reduce((sum, id) => sum + getTotals(id).spending, 0);
    return { incomeAvgMonthly: totalIncome / Math.max(1, periodIds.length), expenseAvgMonthly: totalExpenses / Math.max(1, periodIds.length) };
  }, [incomes, expenses, currentMonth, getTotals, activeSettings]);

  const getDisposable = useCallback((safetyPct = 0.05) => {
      const averages = getMonthlyAverages();
      return computeDisposable(averages, safetyPct);
  }, [getMonthlyAverages]);

  const updateSetting = useCallback(async (key: keyof Settings, value: any) => {
    try {
      await db.settings.update('general', { [key]: value });
      return true;
    } catch (error) {
      console.error(`Failed to update setting ${key}:`, error);
      toast({ title: 'Error al guardar configuración', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
      try {
          await db.settings.update('general', withoutLegacyCategories(newSettings));
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
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      toast({ title: 'Día inválido', description: 'El inicio del período debe estar entre 1 y 31.', variant: 'destructive' });
      return;
    }
    if (await updateSetting('periodStartDay', day)) {
      const nextId = periodContaining(localDate(), { periodStartDay: day }).id;
      setCurrentMonthState(nextId);
      try { await rollBudgetsIntoMonth(nextId); } catch {}
      toast({ title: 'Inicio del período actualizado', description: day === 1 ? 'Se usarán meses calendario.' : `Cada período comenzará el día ${day}.` });
    }
  }, [updateSetting, toast]);
  const setBaseIncome = useCallback(async (baseIncome: { freq: 'mensual' | 'quincenal' | 'semanal', amount: number }) => {
    const cents = toCents(baseIncome.amount);
    if (!Number.isSafeInteger(cents) || cents < 0) {
      toast({ title: 'Monto inválido', description: 'Introduce un ingreso positivo o cero.', variant: 'destructive' });
      return;
    }
    if (await updateSetting('baseIncome', { freq: baseIncome.freq, amount: cents })) {
      toast({ title: 'Ingreso base guardado' });
    }
  }, [updateSetting, toast]);

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
      if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) throw new Error('El aporte debe ser un monto positivo.');
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
    const periodBudgets = budgetPlansForRange(budgets || [], range);
    const budgetedCategoryIds = new Set(periodBudgets.map(b => b.categoryId));
    const allRelevantCategoryIds = Array.from(new Set([...expenseCategories, ...budgetedCategoryIds, ...(expenses || []).filter(e => recordedExpenseForPeriod(e, range) > 0).map(e => e.categoryId)]));

    return allRelevantCategoryIds.map(catId => {
      const budget = periodBudgets.find(b => b.categoryId === catId) || budgetPlanForRange(range, catId, 0);
      return budgetStatusForRange(budget, expenses || [], range, budgetedCategoryIds.has(catId));
    });
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

  const getExpensesByType = useCallback((periodId: string) => {
      const period = periodForId(periodId, activeSettings);
      const exps = (expenses || []).filter(e => recordedExpenseForPeriod(e, period) > 0);
      const groupT = exps.reduce((acc, e) => {
          const k = e.nature;
          const val = recordedExpenseForPeriod(e, period);
          if (!acc[k]) acc[k] = { total: 0, count: 0 };
          acc[k].total += val;
          acc[k].count += 1;
          return acc;
      }, {} as { [key: string]: { total: number, count: number } });

      return Object.entries(groupT).map(([key, v]) => ({
          name: key, total: v.total, count: v.count, avg: v.total / Math.max(1, v.count),
      }));
  }, [expenses, activeSettings]);

  const addIncomeCategory = useCallback(async (name:string, iconName?:string) => { await createCategory(name,'income',iconName); }, []);
  const addExpenseCategory = useCallback(async (name:string, iconName?:string) => { await createCategory(name,'expense',iconName); }, []);
  const resetIncomeCategories = useCallback(async () => { await resetCategories('income'); }, []);
  const resetExpenseCategories = useCallback(async () => { await resetCategories('expense'); }, []);

  const resetSettings = useCallback(async () => {
    await db.settings.clear();
    await db.settings.put(DEFAULT_SETTINGS);
    setDataVersion(v => v + 1);
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

  // OPFS Backup Management
  const backupBeforeDestructiveImport = useCallback(async () => {
    const result = await createPreImportSafetyBackup();
    if (result.status === 'created') {
      toast({
        title: 'Copia de seguridad automática creada',
        description: result.name,
      });
    } else {
      toast({
        title: 'Sin copia automática previa',
        description: 'OPFS no está disponible en este navegador. La restauración continuará sin una copia local previa.',
      });
    }
  }, [toast]);

  const createBackup = useCallback(async (): Promise<BackupFile | undefined> => {
    if (!(await hasOPFS())) {
      toast({ title: "Función no soportada", description: "Tu navegador no soporta el sistema de archivos privados (OPFS).", variant: "destructive" });
      return;
    }
    setIsWorking(true);
    try {
        const jsonString = await exportDataJSON();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const name = `glitchbudget-backup-${timestamp}.json`;
        await opfsWrite(name, jsonString);
        toast({ title: "Copia de seguridad creada", description: name });
        const backups = await opfsList();
        return backups.find(b => b.name === name);
    } catch (error) {
        toast({ title: 'Error al crear copia de seguridad', description: friendlyError(error), variant: 'destructive' });
        throw error;
    } finally {
        setIsWorking(false);
    }
  }, [toast]);

  const listBackups = useCallback(async (): Promise<BackupFile[]> => {
      if (!await hasOPFS()) return [];
      return opfsList();
  }, []);

  const restoreBackup = useCallback(async (name: string) => {
    setIsWorking(true);
    try {
        const fileContent = await opfsRead(name);
        if (!fileContent) throw new Error("El archivo de copia de seguridad está vacío o no se pudo leer.");
        await importDataJSON(fileContent, undefined, { beforeWrite: backupBeforeDestructiveImport });
        setDataVersion(v => v + 1);
        toast({ title: 'Restauración completada', description: `Datos restaurados desde ${name}` });
      return true;
    } catch (error) {
        toast({ title: 'Error al restaurar', description: friendlyError(error), variant: 'destructive' });
      return false;
    } finally {
        setIsWorking(false);
    }
  }, [toast, backupBeforeDestructiveImport]);

  const deleteBackup = useCallback(async (name: string) => {
    setIsWorking(true);
    try {
        await opfsDelete(name);
        toast({ title: 'Copia de seguridad eliminada', description: name });
    } catch (error) {
        toast({ title: 'Error al eliminar', description: friendlyError(error), variant: 'destructive' });
        throw error;
    } finally {
        setIsWorking(false);
    }
  }, [toast]);

  const getBackupFile = useCallback(async (name: string): Promise<File | null> => {
      try {
        const fileContent = await opfsRead(name);
        if (fileContent) {
            return new File([fileContent], name, { type: 'application/json' });
        }
        return null;
      } catch (error) {
        toast({ title: 'Error al descargar', description: friendlyError(error), variant: 'destructive' });
        return null;
      }
  }, [toast]);

  const exportData = useCallback(async () => {
    setIsWorking(true);
    try {
        const json = await exportDataJSON();
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `glitchbudget-backup-${localDate()}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast({ title: 'Exportación completada' });
    } catch(error) {
        toast({ title: 'Error al exportar', description: friendlyError(error), variant: 'destructive' });
    } finally {
        setIsWorking(false);
    }
  }, [toast]);

  const importData = useCallback(async (file: File) => {
    setIsWorking(true);
    try {
        const text = await file.text();
        await importDataJSON(text, undefined, { beforeWrite: backupBeforeDestructiveImport });
        setDataVersion(v => v + 1);
        toast({ title: 'Datos restaurados', description: 'El dashboard se actualizará automáticamente.' });
      return true;
    } catch (e: any) {
        toast({ title: 'Error al importar', description: friendlyError(e), variant: 'destructive' });
      return false;
    } finally {
        setIsWorking(false);
    }
  }, [toast, backupBeforeDestructiveImport]);

  const importEncryptedData = useCallback(async (file: File, password: string) => {
    setIsWorking(true);
    try {
      const encryptedText = await file.text();
      await restoreEncryptedBackupText(
        encryptedText,
        password,
        undefined,
        { beforeWrite: backupBeforeDestructiveImport },
      );
      setDataVersion(v => v + 1);
      toast({
        title: 'Backup cifrado restaurado',
        description: 'El archivo se autenticó, descifró e importó localmente.',
      });
      return true;
    } catch (error) {
      toast({
        title: 'No se pudo restaurar el backup cifrado',
        description: friendlyError(error),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsWorking(false);
    }
  }, [toast, backupBeforeDestructiveImport]);

  const addDebt = useCallback(async (debt: Omit<Debt, "id" | "createdAt">) => {
    try {
      const newDebt: Debt = { ...debt, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      await db.debts.add(newDebt);
      toast({ title: 'Deuda registrada' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error al registrar', description: friendlyError(e), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const updateDebt = useCallback(async (debt: Debt) => {
    try {
      await db.debts.put(debt);
      toast({ title: 'Deuda actualizada' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error al actualizar', description: friendlyError(e), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const deleteDebt = useCallback(async (id: string) => {
    try {
      await db.transaction('rw', db.debts, db.expenses, db.debt_payments, async () => {
        const linkedExpense = await db.expenses.filter(e => e.debtId === id).count();
        const linkedPayment = await db.debt_payments.where('debtId').equals(id).count();
        if (linkedExpense || linkedPayment) throw new Error('Esta tarjeta tiene movimientos. Conserva su historial; no se puede eliminar.');
        await db.debts.delete(id);
      });
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

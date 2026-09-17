
'use client';
import { rollBudgetsIntoMonth } from '@/lib/budget-rollover';

import type { Budget, Goal, GoalContribution } from "@/lib/types";
import { defaultExpenseCategories as defaultExpenseCatIds, defaultIncomeCategories as defaultIncomeCatIds } from "@/lib/categories";
import React, { createContext, useContext, useMemo, ReactNode, useCallback, useState, useEffect } from "react";
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Settings, type Income, type Expense, type Plan, type Debt, type DebtPayment, type Recurring } from '@/lib/db';
import { computeDisposable } from "@/lib/goal-calculator";
import { useToast } from "@/hooks/use-toast";
import { calculateTotals, expenseForMonth, localDate, monthlyAmount } from '@/lib/finance-calculations';
import { saveExpense, saveIncome, saveDebtPayment, saveGoalContribution } from '@/lib/transaction-service';
import { toCents } from "@/lib/utils";
import { friendlyError } from "@/lib/errors";
import { importDataJSON, exportDataJSON } from '@/lib/backup-json';
import { opfsWrite, opfsRead, hasOPFS, opfsList, opfsDelete } from "@/lib/opfs";
import { playExpense, playIncome, playBudgetExceeded, playGoalComplete } from "@/lib/sounds";

const DEFAULT_SETTINGS: Settings = {
  id: 'general',
  theme: 'dark',
  strictMode: true,
  rolloverStrategy: 'reset',
  expenseCategories: defaultExpenseCatIds,
  incomeCategories: defaultIncomeCatIds,
  customCategoryIcons: {},
  baseIncome: { freq: 'mensual', amount: 0 },
  currency: "DOP",
  locale: "es-DO",
  savePct: 0.00,
};

type RolloverStrategy = 'reset' | 'accumulate_surplus' | 'accumulate_debt';
export type BackupFile = { name: string; lastModified: number };

interface FinanceContextType {
  theme: 'light' | 'dark' | 'serious';
  strictMode: boolean;
  rolloverStrategy: RolloverStrategy;
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
  recurrents: Recurring[] | undefined;

  setTheme: (theme: 'light' | 'dark' | 'serious') => void;
  setStrictMode: (strict: boolean) => void;
  setRolloverStrategy: (strategy: RolloverStrategy) => void;
  setBaseIncome: (baseIncome: { freq: 'mensual' | 'quincenal' | 'semanal', amount: number }) => void;
  addIncomeItem: (income: Omit<Income, "id" | "month">) => Promise<boolean>;
  updateIncomeItem: (income: Income) => Promise<boolean>;
  deleteIncomeItem: (id: string) => Promise<boolean>;
  addExpense: (expense: Omit<Expense, "id" | "month">) => Promise<boolean>;
  updateExpense: (expense: Expense) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<boolean>;
  addGoal: (goal: Omit<Goal, "id" | "saved" | "startDate" | "status">) => Promise<boolean>;
  updateGoal: (goal: Goal) => Promise<boolean>;
  deleteGoal: (id: string) => void;
  contributeToGoal: (id: string, amount: number) => Promise<boolean>;
  updateAllBudgets: (month: string, allBudgets: Omit<Budget, 'month'>[]) => Promise<boolean>;
  transferBetweenBudgets: (month: string, fromCategoryId: string, toCategoryId: string, amount: number) => Promise<boolean>;
  resetSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<Settings>) => void;

  addDebt: (debt: Omit<Debt, 'id' | 'createdAt'>) => Promise<boolean>;
  updateDebt: (debt: Debt) => Promise<boolean>;
  deleteDebt: (id: string) => Promise<boolean>;
  addDebtPayment: (payment: Omit<DebtPayment, 'id'>) => Promise<boolean>;

  addRecurring: (recurring: Omit<Recurring, 'id'>) => Promise<boolean>;
  updateRecurring: (recurring: Recurring) => Promise<boolean>;
  deleteRecurring: (id: string) => Promise<boolean>;

  getMonthlyAverages: () => { incomeAvgMonthly: number, expenseAvgMonthly: number };
  getDisposable: (safetyPct?: number) => number;
  getTotals: (month: string) => {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    available: number;
    planned_total: number;
    totalGoalContributions: number;
    commitments: number;
    suggestedSave: number;
  };
  getSpentAmount: (categoryId: string, month: string) => number;
  getExpensesByCategory: (month: string) => { name: string; value: number }[];
  getIncomesByCategory: (month: string) => { name: string; value: number }[];
  getExpensesByType: (month: string) => { name: string; total: number; count: number; avg: number }[];
  getBudgetStatusDetails: (month: string) => Array<Budget & { spent: number; remaining: number; status: 'ok' | 'alert' | 'over' | 'unbudgeted' }>;

  addIncomeCategory: (category: string, iconName?: string) => void;
  resetIncomeCategories: () => void;
  addExpenseCategory: (category: string, iconName?: string) => void;
  resetExpenseCategories: () => void;

  currentMonth: string;
  setCurrentMonth: (month: string) => void;

  // Backup Management
  createBackup: () => Promise<BackupFile | undefined>;
  listBackups: () => Promise<BackupFile[]>;
  restoreBackup: (name: string) => Promise<boolean>;
  deleteBackup: (name: string) => Promise<void>;
  getBackupFile: (name: string) => Promise<File | null>;
  importData: (file: File) => Promise<boolean>;
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

  const expenses = useLiveQuery(() => db.expenses.toArray(), [dataVersion]);
  const incomes = useLiveQuery(() => db.incomes.toArray(), [dataVersion]);
  const goals = useLiveQuery(() => db.goals.toArray(), [dataVersion]);
  const goalContributions = useLiveQuery(() => db.goal_contributions.toArray(), [dataVersion]);
  const budgets = useLiveQuery(() => db.plans.toArray(), [dataVersion]);
  const rawSettings = useLiveQuery(() => db.settings.get('general').then(s => s ?? null), [dataVersion]);
  const debts = useLiveQuery(() => db.debts.toArray(), [dataVersion]);
  const debtPayments = useLiveQuery(() => db.debt_payments.toArray(), [dataVersion]);
  const recurrents = useLiveQuery(() => db.recurrents.toArray(), [dataVersion]);

  const settings = useMemo(() => {
    const s: Partial<Settings> = rawSettings ?? {};
    return {
      ...DEFAULT_SETTINGS,
      ...s,
      baseIncome: {
        amount: Math.max(0, Number(s?.baseIncome?.amount ?? 0)),
        freq: s?.baseIncome?.freq ?? 'mensual'
      },
      expenseCategories: Array.isArray((s as any).expenseCategories) ? (s as any).expenseCategories : defaultExpenseCatIds,
      incomeCategories: Array.isArray((s as any).incomeCategories) ? (s as any).incomeCategories : defaultIncomeCatIds,
      savePct: s.savePct ?? DEFAULT_SETTINGS.savePct,
    };
  }, [rawSettings]);

  const loading = useMemo(() => [expenses, incomes, goals, goalContributions, budgets, rawSettings, debts, debtPayments, recurrents].some(v => v === undefined), [expenses, incomes, goals, goalContributions, budgets, rawSettings, debts, debtPayments, recurrents]);

  useEffect(() => {
    async function initializeDB() {
        if (rawSettings === undefined) return; // Dexie query still pending
        if (rawSettings !== null) return; // Settings already exist
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

  const activeSettings = useMemo(() => settings || DEFAULT_SETTINGS, [settings]);

  useEffect(() => {
    if (activeSettings.theme) {
        const theme = activeSettings.theme === 'system' ? 'dark' : activeSettings.theme;
        document.body.classList.remove('light', 'dark', 'serious', 'system');
        document.documentElement.classList.remove('light', 'dark', 'serious', 'system');
        document.documentElement.classList.add(theme);
        document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
    }
  }, [activeSettings.theme]);

  const monthlyFromBase = monthlyAmount;

  const getSpentAmount = useCallback((categoryId: string, month: string): number =>
    (expenses || []).filter(e => e.categoryId === categoryId)
      .reduce((sum, e) => sum + expenseForMonth(e, month), 0), [expenses]);

  const getTotals = useCallback((month: string) => calculateTotals({
    settings: activeSettings, incomes: incomes || [], expenses: expenses || [],
    budgets: budgets || [], goalContributions: goalContributions || [], debtPayments: debtPayments || [],
  }, month), [activeSettings, incomes, expenses, budgets, goalContributions, debtPayments]);

  const getMonthlyAverages = useCallback((numMonths = 3) => {
    const months = Array.from(new Set([currentMonth, ...[...(incomes || []), ...(expenses || [])].map(t => t.date.slice(0, 7))]))
      .filter(month => month <= currentMonth).sort().slice(-numMonths);
    const totalIncome = months.reduce((sum, month) => sum + getTotals(month).totalIncome, 0);
    const totalExpenses = months.reduce((sum, month) => sum + (expenses || []).reduce((subtotal, e) => subtotal + expenseForMonth(e, month), 0), 0);
    return { incomeAvgMonthly: totalIncome / months.length, expenseAvgMonthly: totalExpenses / months.length };
  }, [incomes, expenses, currentMonth, getTotals]);

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
          await db.settings.update('general', newSettings);
      } catch (error) {
          toast({ title: 'Error al actualizar', description: friendlyError(error), variant: 'destructive' });
      }
  }, [toast]);

  const setTheme = useCallback((theme: 'light' | 'dark' | 'serious') => updateSetting('theme', theme), [updateSetting]);
  const setStrictMode = useCallback((strict: boolean) => updateSetting('strictMode', strict), [updateSetting]);
  const setRolloverStrategy = useCallback((strategy: RolloverStrategy) => updateSetting('rolloverStrategy', strategy), [updateSetting]);
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
      await db.incomes.delete(id);
      toast({ title: 'Ingreso eliminado' });
      return true;
    } catch (error) {
      toast({ title: 'Error al eliminar ingreso', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const addExpense = useCallback(async (expense: Omit<Expense, "id" | "month">) => {
    try {
      await saveExpense({ ...expense, id: crypto.randomUUID() });
      playExpense();
      toast({ title: 'Gasto agregado' });
      return true;
    } catch (error) {
      toast({ title: 'Error al agregar gasto', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const updateExpense = useCallback(async (expense: Expense) => {
    try {
      await saveExpense(expense, true);
      toast({ title: 'Gasto actualizado' });
      return true;
    } catch (error) {
      toast({ title: 'Error al actualizar gasto', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const deleteExpense = useCallback(async (id: string) => {
    try {
      await db.expenses.delete(id);
      toast({ title: 'Gasto eliminado' });
      return true;
    } catch (error) {
      toast({ title: 'Error al eliminar gasto', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const addGoal = useCallback(async (goal: Omit<Goal, "id" | "saved" | "startDate" | "status">) => {
    try {
      const newGoal: Goal = {
          name: goal.name,
          date: goal.date || undefined,
          target: toCents(goal.target),
          quota: toCents(goal.quota),
          id: crypto.randomUUID(),
          saved: 0,
          startDate: localDate(),
          status: 'active'
      };
      await db.goals.add(newGoal);
      toast({ title: '¡Meta creada!', description: `Tu meta "${newGoal.name}" fue añadida.` });
      return true;
    } catch (error) {
      toast({ title: 'Error al crear meta', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const updateGoal = useCallback(async (goal: Goal) => {
    try {
      await db.goals.put(goal);
      return true;
    } catch (error) {
      toast({ title: 'Error al actualizar meta', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const deleteGoal = useCallback(async (id: string) => {
    try {
      await db.transaction('rw', db.goals, db.goal_contributions, async () => {
        await db.goals.delete(id);
        await db.goal_contributions.where('goalId').equals(id).delete();
      });
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
      toast({ title: '¡Contribución exitosa!', description: `Has añadido ${(amountInCents / 100).toFixed(2)}.` });
      return true;
    } catch (error: any) {
      toast({ title: 'Error al aportar a la meta', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const updateAllBudgets = useCallback(async (month: string, allBudgets: Omit<Budget, 'month'>[]) => {
    try {
      const budgetsToPut: Plan[] = allBudgets.map(b => ({ ...b, month, limit: toCents(b.limit) }));
      if (budgetsToPut.some(b => !Number.isSafeInteger(b.limit) || b.limit < 0)) throw new Error('Los presupuestos deben ser montos positivos o cero.');
      await db.transaction('rw', db.plans, () => db.plans.bulkPut(budgetsToPut));
       toast({ title: '¡Presupuestos guardados!'});
      return true;
    } catch (error) {
      toast({ title: 'Error al guardar presupuestos', description: friendlyError(error), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const transferBetweenBudgets = useCallback(async (month: string, fromCategoryId: string, toCategoryId: string, amount: number) => {
    const amountInCents = toCents(amount);
    try {
      if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) throw new Error("El monto de la transferencia debe ser positivo.");
      if (fromCategoryId === toCategoryId) throw new Error('Selecciona dos categorías diferentes.');
      await db.transaction('rw', db.plans, db.expenses, async () => {
          const fromBudget = await db.plans.get([month, fromCategoryId]);
          const toBudget = await db.plans.get([month, toCategoryId]);

          const spent = (await db.expenses.toArray()).filter(e => e.categoryId === fromCategoryId).reduce((sum, e) => sum + expenseForMonth(e, month), 0);
          if (!fromBudget || fromBudget.limit - spent < amountInCents) {
              throw new Error("Fondos insuficientes en el presupuesto de origen.");
          }

          await db.plans.update([month, fromCategoryId], { limit: fromBudget.limit - amountInCents });

          if (toBudget) {
              await db.plans.update([month, toCategoryId], { limit: toBudget.limit + amountInCents });
          } else {
              await db.plans.add({ month, categoryId: toCategoryId, limit: amountInCents });
          }
      });
      toast({
            title: 'Transferencia exitosa',
            description: 'El monto ha sido transferido entre los presupuestos.',
      });
      return true;
    } catch(error: any) {
      toast({
            title: 'Error en la transferencia',
            description: friendlyError(error),
            variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const getBudgetStatusDetails = useCallback((month: string) => {
    const monthBudgets = (budgets || []).filter(b => b.month === month);
    const budgetedCategoryIds = new Set(monthBudgets.map(b => b.categoryId));
    const allRelevantCategoryIds = Array.from(new Set([...activeSettings.expenseCategories, ...budgetedCategoryIds, ...(expenses || []).filter(e => expenseForMonth(e, month) > 0).map(e => e.categoryId)]));

    return allRelevantCategoryIds.map(catId => {
      const budget = monthBudgets.find(b => b.categoryId === catId) || { month, categoryId: catId, limit: 0 };
      const spent = getSpentAmount(budget.categoryId, month);
      const remaining = budget.limit - spent;
      let status: 'ok' | 'alert' | 'over' | 'unbudgeted' = 'ok';

      if (budget.limit === 0) status = 'unbudgeted';
      else if (remaining < 0) status = 'over';
      else if (remaining < budget.limit * 0.25) status = 'alert';

      return { ...budget, spent, remaining, status };
    });
  }, [budgets, expenses, getSpentAmount, activeSettings.expenseCategories]);

  const getExpensesByCategory = useCallback((month: string) => {
    return (getBudgetStatusDetails(month) || [])
        .filter(b => b.spent > 0)
        .map(b => ({ name: b.categoryId, value: b.spent }));
  }, [getBudgetStatusDetails]);

  const getIncomesByCategory = useCallback((month: string) => {
    const byCat: { [key: string]: number } = {};
    if (activeSettings.baseIncome.amount > 0) {
      byCat['sueldo'] = monthlyFromBase(activeSettings.baseIncome.freq, activeSettings.baseIncome.amount);
    }
    (incomes || []).filter(i => i.date.slice(0, 7) === month).forEach(i => {
        byCat[i.categoryId] = (byCat[i.categoryId] || 0) + i.amount;
    });
    return Object.entries(byCat).map(([name, value]) => ({ name, value }));
  }, [incomes, activeSettings.baseIncome, monthlyFromBase]);

  const getExpensesByType = useCallback((month: string) => {
      const exps = (expenses || []).filter(e => expenseForMonth(e, month) > 0);
      const groupT = exps.reduce((acc, e) => {
          const k = e.type;
          const val = expenseForMonth(e, month);
          if (!acc[k]) acc[k] = { total: 0, count: 0 };
          acc[k].total += val;
          acc[k].count += 1;
          return acc;
      }, {} as { [key: string]: { total: number, count: number } });

      return Object.entries(groupT).map(([key, v]) => ({
          name: key, total: v.total, count: v.count, avg: v.total / Math.max(1, v.count),
      }));
  }, [expenses]);

  const addIncomeCategory = useCallback((category: string, iconName?: string) => {
    const catId = category.toLowerCase().replace(/\s/g, '-');
    if (!activeSettings.incomeCategories.includes(catId)) {
      const updates: Partial<Settings> = {
        incomeCategories: [...activeSettings.incomeCategories, catId]
      };
      if (iconName) {
        updates.customCategoryIcons = {
          ...activeSettings.customCategoryIcons,
          [catId]: iconName
        };
      }
      updateSettings(updates);
    }
  }, [activeSettings, updateSettings]);
  const resetIncomeCategories = useCallback(() => {
    updateSettings({
        incomeCategories: defaultIncomeCatIds,
        customCategoryIcons: {} // Clear custom icons on reset? Or keep them? User said reset, so we'll likely clear.
    });
  }, [updateSettings]);

  const addExpenseCategory = useCallback((categoryName: string, iconName?: string) => {
    if (!categoryName.trim()) return;
    const catId = categoryName.trim().toLowerCase().replace(/\s/g, '-');
    if (!activeSettings.expenseCategories.includes(catId)) {
      const updates: Partial<Settings> = {
        expenseCategories: [...activeSettings.expenseCategories, catId]
      };
      if (iconName) {
        updates.customCategoryIcons = {
          ...activeSettings.customCategoryIcons,
          [catId]: iconName
        };
      }
      updateSettings(updates);
    }
  }, [activeSettings, updateSettings]);
  const resetExpenseCategories = useCallback(() => updateSetting('expenseCategories', defaultExpenseCatIds), [updateSetting]);

  const resetSettings = useCallback(async () => {
    await db.settings.clear();
    await db.settings.put(DEFAULT_SETTINGS);
    setDataVersion(v => v + 1);
  }, []);

  const setCurrentMonth = useCallback(async (month: string) => {
    setCurrentMonthState(month);

    try {
      const created = await rollBudgetsIntoMonth(month);
      if (created) toast({ title: 'Presupuestos preparados', description: 'Se aplicó tu preferencia de cierre al mes seleccionado.' });
    } catch (error) {
      toast({ title: 'No se pudieron preparar los presupuestos', description: friendlyError(error), variant: 'destructive' });
    }
  }, [toast]);

  // OPFS Backup Management
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
        await importDataJSON(fileContent);
        setDataVersion(v => v + 1);
        toast({ title: 'Restauración completada', description: `Datos restaurados desde ${name}` });
      return true;
    } catch (error) {
        toast({ title: 'Error al restaurar', description: friendlyError(error), variant: 'destructive' });
      return false;
    } finally {
        setIsWorking(false);
    }
  }, [toast]);

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
        await importDataJSON(text);
        setDataVersion(v => v + 1);
        toast({ title: 'Datos restaurados', description: 'El dashboard se actualizará automáticamente.' });
      return true;
    } catch (e: any) {
        toast({ title: 'Error al importar', description: friendlyError(e), variant: 'destructive' });
      return false;
    } finally {
        setIsWorking(false);
    }
  }, [toast]);

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

  const addRecurring = useCallback(async (recurring: Omit<Recurring, "id">) => {
    try {
      await db.recurrents.add({ ...recurring, id: crypto.randomUUID() });
      toast({ title: 'Suscripción registrada' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: friendlyError(e), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const updateRecurring = useCallback(async (recurring: Recurring) => {
    try {
      await db.recurrents.put(recurring);
      toast({ title: 'Suscripción actualizada' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: friendlyError(e), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const deleteRecurring = useCallback(async (id: string) => {
    try {
      await db.recurrents.delete(id);
      toast({ title: 'Suscripción borrada' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: friendlyError(e), variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const value: FinanceContextType = useMemo(() => ({
    theme: activeSettings.theme === 'system' ? 'dark' : activeSettings.theme,
    strictMode: activeSettings.strictMode,
    rolloverStrategy: activeSettings.rolloverStrategy,
    baseIncome: activeSettings.baseIncome,
    expenseCategories: activeSettings.expenseCategories,
    incomeCategories: activeSettings.incomeCategories,
    savePct: activeSettings.savePct,
    incomes,
    expenses,
    goals,
    goalContributions,
    budgets,
    debts,
    debtPayments,
    recurrents,
    setTheme,
    setStrictMode,
    setRolloverStrategy,
    setBaseIncome,
    addIncomeItem,
    updateIncomeItem,
    deleteIncomeItem,
    addExpense,
    updateExpense,
    deleteExpense,
    addGoal,
    updateGoal,
    deleteGoal,
    contributeToGoal,
    updateAllBudgets,
    transferBetweenBudgets,
    resetSettings,
    updateSettings,
    addDebt,
    updateDebt,
    deleteDebt,
    addDebtPayment,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    getMonthlyAverages,
    getDisposable,
    getTotals,
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
    exportData,
    setDataVersion,
    loading,
    isWorking,
  }), [
    activeSettings, incomes, expenses, goals, goalContributions, budgets, debts, debtPayments, recurrents,
    setTheme, setStrictMode, setRolloverStrategy, setBaseIncome, updateSettings,
    addIncomeItem, updateIncomeItem, deleteIncomeItem, addExpense, updateExpense, deleteExpense,
    addGoal, updateGoal, deleteGoal, contributeToGoal,
    updateAllBudgets, transferBetweenBudgets, resetSettings,
    addDebt, updateDebt, deleteDebt, addDebtPayment,
    addRecurring, updateRecurring, deleteRecurring,
    getMonthlyAverages, getDisposable, getTotals, getSpentAmount,
    getExpensesByCategory, getIncomesByCategory, getExpensesByType, getBudgetStatusDetails,
    addIncomeCategory, resetIncomeCategories, addExpenseCategory, resetExpenseCategories,
    currentMonth, setCurrentMonth, createBackup, listBackups, restoreBackup, deleteBackup, getBackupFile,
    importData, exportData, setDataVersion, loading, isWorking
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
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

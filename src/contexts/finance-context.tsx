
'use client';

import type { Budget, Goal, GoalContribution } from "@/lib/types";
import { defaultExpenseCategories as defaultExpenseCatIds, defaultIncomeCategories as defaultIncomeCatIds } from "@/lib/categories";
import React, { createContext, useContext, useMemo, ReactNode, useCallback, useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Settings, type Income, type Expense, type Plan } from '@/lib/db';
import { computeDisposable } from "@/lib/goal-calculator";
import { useToast } from "@/hooks/use-toast";
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
  baseIncome: { freq: 'mensual', amount: 0 },
  currency: "DOP",
  locale: "es-DO",
  savePct: 0.00,
};

type RolloverStrategy = 'reset' | 'accumulate_surplus' | 'accumulate_debt';
export type BackupFile = { name: string; lastModified: number };

interface FinanceContextType {
  theme: 'light' | 'dark';
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
  
  setTheme: (theme: 'light' | 'dark') => void;
  setStrictMode: (strict: boolean) => void;
  setRolloverStrategy: (strategy: RolloverStrategy) => void;
  setBaseIncome: (baseIncome: { freq: 'mensual' | 'quincenal' | 'semanal', amount: number }) => void;
  addIncomeItem: (income: Omit<Income, "id" | "month">) => void;
  updateIncomeItem: (income: Income) => void;
  deleteIncomeItem: (id: string) => void;
  addExpense: (expense: Omit<Expense, "id" | "month">) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  addGoal: (goal: Omit<Goal, "id" | "saved" | "startDate" | "status">) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (id: string) => void;
  contributeToGoal: (id: string, amount: number) => void;
  updateAllBudgets: (month: string, allBudgets: Omit<Budget, 'month'>[]) => void;
  transferBetweenBudgets: (month: string, fromCategoryId: string, toCategoryId: string, amount: number) => void;
  resetSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<Pick<Settings, 'savePct'>>) => void;
  
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
  
  addIncomeCategory: (category: string) => void;
  resetIncomeCategories: () => void;
  addExpenseCategory: (category: string) => void;
  resetExpenseCategories: () => void;
  
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
  
  // Backup Management
  createBackup: () => Promise<BackupFile | undefined>;
  listBackups: () => Promise<BackupFile[]>;
  restoreBackup: (name: string) => Promise<void>;
  deleteBackup: (name: string) => Promise<void>;
  getBackupFile: (name: string) => Promise<File | null>;
  importData: (file: File) => Promise<void>;
  exportData: () => Promise<void>;
  setDataVersion: React.Dispatch<React.SetStateAction<number>>;


  loading: boolean;
  isWorking: boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);


export function FinanceProvider({ children }: { children: ReactNode }) {
  const [currentMonth, setCurrentMonthState] = useState(new Date().toISOString().slice(0, 7));
  const { toast } = useToast();
  const [dataVersion, setDataVersion] = useState(0);
  const [isWorking, setIsWorking] = useState(false);

  const expenses = useLiveQuery(() => db.expenses.toArray(), [dataVersion]);
  const incomes = useLiveQuery(() => db.incomes.toArray(), [dataVersion]);
  const goals = useLiveQuery(() => db.goals.toArray(), [dataVersion]);
  const goalContributions = useLiveQuery(() => db.goal_contributions.toArray(), [dataVersion]);
  const budgets = useLiveQuery(() => db.plans.toArray(), [dataVersion]);
  const rawSettings = useLiveQuery(() => db.settings.get('general').then(s => s ?? null), [dataVersion]);
  
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
  
  const loading = useMemo(() => [expenses, incomes, goals, goalContributions, budgets, rawSettings].some(v => v === undefined), [expenses, incomes, goals, goalContributions, budgets, rawSettings]);
  
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
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(activeSettings.theme);
    }
  }, [activeSettings.theme]);

  const monthlyFromBase = useCallback((freq: 'mensual' | 'quincenal' | 'semanal', amt: number) => {
    amt = Number(amt) || 0;
    if(freq==='quincenal') return amt*2;
    if(freq==='semanal') return Math.round(amt*4.33);
    return amt;
  }, []);

  const getSpentAmount = useCallback((categoryId: string, month: string): number => {
    if (!expenses) return 0;
    return expenses
      .filter(t => {
        const isMatchingCategory = t.categoryId === categoryId;
        const isCurrentMonthNonFixed = t.type !== 'Fijo' && t.month === month;
        const isFixed = t.type === 'Fijo';
        return isMatchingCategory && (isCurrentMonthNonFixed || isFixed)
      })
      .reduce((sum, t) => {
          if (t.type === 'Fijo') {
              return sum + monthlyFromBase(t.frequency || 'mensual', t.amount);
          }
          return sum + t.amount
      }, 0);
  }, [expenses, monthlyFromBase]);
  
  const getTotals = useCallback((month: string) => {
    const baseFreq = activeSettings.baseIncome.freq;
    const baseAmount = activeSettings.baseIncome.amount;
    const baseIncome = monthlyFromBase(baseFreq, baseAmount);
    
    const additionalIncomes = (incomes || []).filter(i => i.month === month);
    const totalAdditionalIncome = additionalIncomes.reduce((sum, i) => sum + i.amount, 0);
    const totalIncome = baseIncome + totalAdditionalIncome;
    
    const totalExpenses = (expenses || [])
      .filter(t => t.type === 'Fijo' || t.month === month)
      .reduce((sum, t) => {
          if (t.type === 'Fijo') {
              return sum + monthlyFromBase(t.frequency || 'mensual', t.amount);
          }
          return sum + t.amount;
      }, 0);

    const monthBudgets = (budgets || []).filter(b => b.month === month);
    const planned_total = monthBudgets.reduce((sum, b) => sum + b.limit, 0);
    
    const totalGoalContributions = (goalContributions || [])
      .filter(c => c.date.slice(0, 7) === month)
      .reduce((sum, c) => sum + c.amount, 0);
      
    // Calculate available balance
    const balance = totalIncome - totalExpenses;
    const suggestedSave = Math.round(totalIncome * activeSettings.savePct);
    const commitments = planned_total + totalGoalContributions + suggestedSave;
    const available = Math.max(0, balance - commitments);

    return { totalIncome, totalExpenses, balance, available, planned_total, totalGoalContributions, commitments, suggestedSave };

  }, [incomes, expenses, budgets, goalContributions, activeSettings, monthlyFromBase]);
  
  const getMonthlyAverages = useCallback((numMonths = 3) => {
      const allTotalsByMonth: { [month: string]: { income: number, expense: number } } = {};
      const allTransactions = [...(incomes || []), ...(expenses || [])];

      allTransactions.forEach(t => {
          const month = (t as any).month || t.date.slice(0,7);
          if (!allTotalsByMonth[month]) {
              allTotalsByMonth[month] = { income: 0, expense: 0 };
          }
      });

      if (activeSettings.baseIncome.amount > 0) {
        Object.keys(allTotalsByMonth).forEach(month => {
          allTotalsByMonth[month].income += monthlyFromBase(activeSettings.baseIncome.freq, activeSettings.baseIncome.amount);
        });
      }
      (incomes || []).forEach(i => {
        if(allTotalsByMonth[i.month]) allTotalsByMonth[i.month].income += i.amount;
      });
      (expenses || []).forEach(e => {
        const month = e.month || e.date.slice(0,7);
        if (allTotalsByMonth[month]) {
           const expenseAmount = e.type === 'Fijo' ? monthlyFromBase(e.frequency || 'mensual', e.amount) : e.amount;
           allTotalsByMonth[month].expense += expenseAmount;
        }
      });
      
      const lastNMonths = Object.keys(allTotalsByMonth).sort().slice(-numMonths);
      
      if(lastNMonths.length === 0) {
        const currentMonthTotals = getTotals(currentMonth);
        return {
          incomeAvgMonthly: currentMonthTotals.totalIncome,
          expenseAvgMonthly: currentMonthTotals.totalExpenses
        }
      }

      const totalIncome = lastNMonths.reduce((sum, m) => sum + allTotalsByMonth[m].income, 0);
      const totalExpense = lastNMonths.reduce((sum, m) => sum + allTotalsByMonth[m].expense, 0);

      return {
          incomeAvgMonthly: totalIncome / lastNMonths.length,
          expenseAvgMonthly: totalExpense / lastNMonths.length,
      }

  }, [incomes, expenses, currentMonth, getTotals, activeSettings.baseIncome, monthlyFromBase]);

  const getDisposable = useCallback((safetyPct = 0.05) => {
      const averages = getMonthlyAverages();
      return computeDisposable(averages, safetyPct);
  }, [getMonthlyAverages]);
  
  const updateSetting = useCallback(async (key: keyof Settings, value: any) => {
    try {
      await db.settings.update('general', { [key]: value });
    } catch (error) {
      console.error(`Failed to update setting ${key}:`, error);
      toast({ title: 'Error al guardar configuración', description: friendlyError(error), variant: 'destructive' });
    }
  }, [toast]);
  
  const updateSettings = useCallback(async (newSettings: Partial<Pick<Settings, 'savePct'>>) => {
      try {
          await db.settings.update('general', newSettings);
      } catch (error) {
          toast({ title: 'Error al actualizar', description: friendlyError(error), variant: 'destructive' });
      }
  }, [toast]);

  const setTheme = (theme: 'light' | 'dark') => updateSetting('theme', theme);
  const setStrictMode = (strict: boolean) => updateSetting('strictMode', strict);
  const setRolloverStrategy = (strategy: RolloverStrategy) => updateSetting('rolloverStrategy', strategy);
  const setBaseIncome = (baseIncome: { freq: 'mensual' | 'quincenal' | 'semanal', amount: number }) => {
    updateSetting('baseIncome', { freq: baseIncome.freq, amount: toCents(baseIncome.amount) });
    toast({ title: "Ingreso base guardado", description: "Tu ingreso principal ha sido actualizado." });
  };
  
  const addIncomeItem = useCallback(async (income: Omit<Income, "id" | "month">) => {
    try {
      const newIncome: Income = { ...income, id: uuidv4(), month: currentMonth, amount: toCents(income.amount) };
      await db.incomes.add(newIncome);
      playIncome();
      toast({ title: `Ingreso agregado`, description: `+${(newIncome.amount / 100).toFixed(2)}` });
    } catch (error) {
      toast({ title: 'Error al agregar ingreso', description: friendlyError(error), variant: 'destructive' });
    }
  }, [currentMonth, toast]);

  const updateIncomeItem = useCallback(async (income: Income) => {
    try {
      const updated: Income = { ...income, amount: toCents(income.amount) };
      await db.incomes.put(updated);
      toast({ title: 'Ingreso actualizado' });
    } catch (error) {
      toast({ title: 'Error al actualizar ingreso', description: friendlyError(error), variant: 'destructive' });
    }
  }, [toast]);

  const deleteIncomeItem = async (id: string) => {
    try {
      await db.incomes.delete(id);
      toast({ title: "Ingreso eliminado" });
    } catch (error) {
      toast({ title: 'Error al eliminar ingreso', description: friendlyError(error), variant: 'destructive' });
    }
  };

  const addExpense = useCallback(async (expense: Omit<Expense, "id" | "month">) => {
    try {
      const amountCents = toCents(expense.amount);
      const newExpense: Expense = { ...expense, id: uuidv4(), month: expense.date.slice(0,7), amount: amountCents };
      
      // Check budget limit Before saving
      const monthDetails = getBudgetStatusDetails(newExpense.month);
      const categoryBudget = monthDetails.find(b => b.categoryId === newExpense.categoryId);
      let exceeded = false;
      if (categoryBudget && categoryBudget.limit > 0) {
          if (categoryBudget.remaining - amountCents < 0) {
              exceeded = true;
          }
      }

      await db.expenses.add(newExpense);
      
      if (exceeded) {
          playBudgetExceeded();
      } else {
          playExpense();
      }
      
      toast({ title: `Gasto agregado`, description: `-${(newExpense.amount / 100).toFixed(2)}` });
    } catch (error) {
       toast({ title: 'Error al agregar gasto', description: friendlyError(error), variant: 'destructive' });
    }
  }, [toast]);

  const updateExpense = useCallback(async (expense: Expense) => {
    try {
      const updated: Expense = { ...expense, amount: toCents(expense.amount) };
      await db.expenses.put(updated);
      toast({ title: 'Gasto actualizado' });
    } catch (error) {
      toast({ title: 'Error al actualizar gasto', description: friendlyError(error), variant: 'destructive' });
    }
  }, [toast]);

  const deleteExpense = async (id: string) => {
    try {
      await db.expenses.delete(id);
      toast({ title: 'Gasto eliminado' });
    } catch (error) {
      toast({ title: 'Error al eliminar gasto', description: friendlyError(error), variant: 'destructive' });
    }
  };
  
  const addGoal = useCallback(async (goal: Omit<Goal, "id" | "saved" | "startDate" | "status">) => {
    try {
      const newGoal: Goal = { 
          name: goal.name,
          date: goal.date,
          target: toCents(goal.target),
          quota: toCents(goal.quota),
          id: uuidv4(), 
          saved: 0, 
          startDate: new Date().toISOString().slice(0,10),
          status: 'active'
      };
      await db.goals.add(newGoal);
      toast({ title: '¡Meta creada!', description: `Tu meta "${newGoal.name}" fue añadida.` });
    } catch (error) {
      toast({ title: 'Error al crear meta', description: friendlyError(error), variant: 'destructive' });
    }
  }, [toast]);
  
  const updateGoal = async (goal: Goal) => {
    try {
      await db.goals.put(goal);
    } catch (error) {
      toast({ title: 'Error al actualizar meta', description: friendlyError(error), variant: 'destructive' });
    }
  };

  const deleteGoal = (id: string) => db.transaction('rw', db.goals, db.goal_contributions, async () => {
    try {
      await db.goals.delete(id);
      await db.goal_contributions.where('goalId').equals(id).delete();
      toast({ title: 'Meta eliminada' });
    } catch (error) {
      toast({ title: 'Error al eliminar meta', description: friendlyError(error), variant: 'destructive' });
    }
  });

  const contributeToGoal = useCallback(async (id: string, amount: number) => {
    const amountInCents = toCents(amount);
    const today = new Date().toISOString().slice(0, 10);
    const newContribution: GoalContribution = { id: uuidv4(), goalId: id, amount: amountInCents, date: today };
    
    try {
      let isCompletedNow = false;
      await db.transaction('rw', db.goals, db.goal_contributions, async () => {
          const goal = await db.goals.get(id);
          if (goal) {
              const newSaved = goal.saved + amountInCents;
              const status = newSaved >= goal.target ? 'completed' : 'active';
              if (status === 'completed' && goal.status !== 'completed') {
                  isCompletedNow = true;
              }
              await db.goals.update(id, { saved: newSaved, status });
              await db.goal_contributions.add(newContribution);
          } else {
            throw new Error("Meta no encontrada");
          }
      });
      if (isCompletedNow) {
          playGoalComplete();
      }
      toast({ title: '¡Contribución exitosa!', description: `Has añadido ${(amountInCents / 100).toFixed(2)}.` });
    } catch (error: any) {
      toast({ title: 'Error al aportar a la meta', description: friendlyError(error), variant: 'destructive' });
    }
  }, [toast]);

  const updateAllBudgets = useCallback(async (month: string, allBudgets: Omit<Budget, 'month'>[]) => {
    try {
      const budgetsToPut: Plan[] = allBudgets.map(b => ({ ...b, month, limit: toCents(b.limit) }));
      await db.plans.bulkPut(budgetsToPut);
       toast({ title: '¡Presupuestos guardados!'});
    } catch (error) {
      toast({ title: 'Error al guardar presupuestos', description: friendlyError(error), variant: 'destructive' });
    }
  }, [toast]);

  const transferBetweenBudgets = useCallback(async (month: string, fromCategoryId: string, toCategoryId: string, amount: number) => {
    const amountInCents = toCents(amount);
    try {
      if (amountInCents <= 0) throw new Error("El monto de la transferencia debe ser positivo.");
      await db.transaction('rw', db.plans, async () => {
          const fromBudget = await db.plans.get([month, fromCategoryId]);
          const toBudget = await db.plans.get([month, toCategoryId]);

          if (!fromBudget || fromBudget.limit < amountInCents) {
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
    } catch(error: any) {
      toast({
            title: 'Error en la transferencia',
            description: friendlyError(error),
            variant: 'destructive',
      });
    }
  }, [toast]);
  
  const getBudgetStatusDetails = useCallback((month: string) => {
    const monthBudgets = (budgets || []).filter(b => b.month === month);
    const budgetedCategoryIds = new Set(monthBudgets.map(b => b.categoryId));
    const allRelevantCategoryIds = Array.from(new Set([...activeSettings.expenseCategories, ...budgetedCategoryIds]));

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
  }, [budgets, getSpentAmount, activeSettings.expenseCategories]);
  
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
    (incomes || []).filter(i => i.month === month).forEach(i => {
        byCat[i.categoryId] = (byCat[i.categoryId] || 0) + i.amount;
    });
    return Object.entries(byCat).map(([name, value]) => ({ name, value }));
  }, [incomes, activeSettings.baseIncome, monthlyFromBase]);

  const getExpensesByType = useCallback((month: string) => {
      const exps = (expenses || []).filter(e => e.type === 'Fijo' || e.month === month);
      const groupT = exps.reduce((acc, e) => {
          const k = e.type;
          const val = k === 'Fijo' ? monthlyFromBase(e.frequency || 'mensual', e.amount) : e.amount;
          if (!acc[k]) acc[k] = { total: 0, count: 0 };
          acc[k].total += val;
          acc[k].count += 1;
          return acc;
      }, {} as { [key: string]: { total: number, count: number } });

      return Object.entries(groupT).map(([key, v]) => ({
          name: key, total: v.total, count: v.count, avg: v.total / Math.max(1, v.count),
      }));
  }, [expenses, monthlyFromBase]);
  
  const addIncomeCategory = (category: string) => {
    const catId = category.toLowerCase().replace(/\s/g, '-');
    if (!activeSettings.incomeCategories.includes(catId)) {
      updateSetting('incomeCategories', [...activeSettings.incomeCategories, catId]);
    }
  };
  const resetIncomeCategories = () => updateSetting('incomeCategories', defaultIncomeCatIds);

  const addExpenseCategory = (categoryName: string) => {
    if (!categoryName.trim()) return;
    const catId = categoryName.trim().toLowerCase().replace(/\s/g, '-');
    if (!activeSettings.expenseCategories.includes(catId)) {
      updateSetting('expenseCategories', [...activeSettings.expenseCategories, catId]);
    }
  };
  const resetExpenseCategories = () => updateSetting('expenseCategories', defaultExpenseCatIds);

  const resetSettings = useCallback(async () => {
    await db.settings.clear();
    await db.settings.put(DEFAULT_SETTINGS);
    setDataVersion(v => v + 1);
  }, []);

  const setCurrentMonth = useCallback(async (month: string) => {
    setCurrentMonthState(month);

    if (!budgets || !activeSettings.rolloverStrategy || activeSettings.rolloverStrategy === 'reset') return;
    
    const monthExists = await db.plans.where('month').equals(month).count() > 0;
    if (monthExists) return;

    const [prevYear, prevMonthNum] = month.split('-').map(Number);
    const prevDate = new Date(prevYear, prevMonthNum - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    
    const prevMonthStatus = getBudgetStatusDetails(prevMonthStr);
    if (prevMonthStatus.length > 0) {
        try {
            const nextMonthBudgets: Plan[] = prevMonthStatus.map(catStatus => {
                let newLimit = catStatus.limit;
                if (activeSettings.rolloverStrategy === 'accumulate_surplus' && catStatus.remaining > 0) {
                    newLimit += catStatus.remaining;
                } else if (activeSettings.rolloverStrategy === 'accumulate_debt' && catStatus.remaining < 0) {
                    newLimit += catStatus.remaining;
                }
                return { month, categoryId: catStatus.categoryId, limit: Math.max(0, newLimit) };
            });
            await db.plans.bulkPut(nextMonthBudgets);
            toast({ title: "Cierre de mes completado", description: `Presupuestos para ${month} generados con la estrategia de ${activeSettings.rolloverStrategy}.` });
        } catch(error) {
            toast({ title: 'Error en el cierre de mes', description: friendlyError(error), variant: 'destructive' });
        }
    }
  }, [activeSettings.rolloverStrategy, getBudgetStatusDetails, toast, budgets]);

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
    } catch (error) {
        toast({ title: 'Error al restaurar', description: friendlyError(error), variant: 'destructive' });
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
        a.download = `glitchbudget-backup-${new Date().toISOString().slice(0,10)}.json`;
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
    } catch (e: any) {
        toast({ title: 'Error al importar', description: friendlyError(e), variant: 'destructive' });
    } finally {
        setIsWorking(false);
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
    activeSettings, incomes, expenses, goals, goalContributions, budgets,
    setTheme, setStrictMode, setRolloverStrategy, setBaseIncome, updateSettings,
    addIncomeItem, updateIncomeItem, deleteIncomeItem, addExpense, updateExpense, deleteExpense,
    addGoal, updateGoal, deleteGoal, contributeToGoal,
    updateAllBudgets, transferBetweenBudgets, resetSettings,
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

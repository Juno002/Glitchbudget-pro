
import Dexie, { type Table } from 'dexie';

// Define a new structure for settings that doesn't rely on separate localStorage keys
export interface Settings {
  id: 'general'; // Singleton ID for settings
  theme: 'light' | 'dark' | 'system' | 'serious';
  strictMode: boolean;
  rolloverStrategy: 'reset' | 'accumulate_surplus' | 'accumulate_debt';
  expenseCategories: string[];
  incomeCategories: string[];
  customCategoryIcons?: { [catId: string]: string }; // Map of catId -> iconName
  currency: string;
  locale: string;
  baseIncome: {
    freq: 'mensual' | 'quincenal' | 'semanal';
    amount: number;
  };
  savePct: number; // Porcentaje de ahorro sugerido
}

export interface Period {
    id: string, // YYYY-MM
    year: number,
    month: number,
    createdAt: string
}

export interface Income {
    id: string;
    type: 'extra' | 'gift';
    description: string;
    amount: number; // Stored as positive cents
    date: string; // YYYY-MM-DD
    categoryId: string;
    month: string;
    currency?: string;
    fxRate?: number;
    amountBase?: number;
}

export interface Expense {
    id: string;
    type: 'Fijo' | 'Variable' | 'Ocasional';
    concept: string;
    amount: number; // Stored as positive cents
    date: string; // YYYY-MM-DD
    frequency?: 'mensual' | 'quincenal' | 'semanal';
    categoryId: string;
    month: string;
    currency?: string;
    fxRate?: number;
    amountBase?: number;
    paymentMethod?: 'cash' | 'credit';
    debtId?: string;
}

export interface Plan {
  month: string; // YYYY-MM
  categoryId: string;
  limit: number;
};

export interface Goal {
    id: string;
    name: string;
    target: number;
    saved: number;
    date?: string; // YYYY-MM-DD (deadline)
    quota: number; // Monto de la cuota mensual planificada
    startDate: string; // YYYY-MM-DD
    status: 'active' | 'completed';
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string; // YYYY-MM-DD
}


export type Budget = Plan;

export interface Recurring {
  id: string;
  type: 'income' | 'expense';
  title: string;
  categoryId: string;
  amount: number;              // centavos, positivo
  freq: 'weekly' | 'biweekly' | 'monthly';
  day?: number;                // monthly: 1..28, weekly: 0..6
  startDate: string;           // YYYY-MM-DD
  endDate?: string;
  active: boolean;
}

export interface Debt {
  id: string;
  name: string;
  type: 'credit_card' | 'loan';
  principal: number;           // centavos
  apr: number;                 // 0..1
  minPayment: number;          // centavos
  createdAt: string;           // ISO
  status: 'active' | 'closed';
  billingCycleDay?: number;    // 1..31 (Día de corte)
  paymentDueDay?: number;      // 1..31 (Día de pago)
}

export interface DebtPayment {
  id: string;
  debtId: string;
  date: string;                // ISO
  amount: number;              // centavos
  note?: string;
}

export interface FxRate {
  id: string;                  // `${quote}->${base}`, ej "USD->DOP"
  quote: string;               // USD
  base: string;                // DOP
  rate: number;                // cuánto BASE por 1 QUOTE
  updatedAt: string;           // ISO
}


export class GlitchBudgetDB extends Dexie {
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

  constructor() {
    super('GlitchBudgetDB');
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

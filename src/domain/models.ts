// Define a new structure for settings that doesn't rely on separate localStorage keys
export interface Settings {
  id: 'general'; // Singleton ID for settings
  theme: 'light' | 'dark' | 'system' | 'serious';
  /** Legacy backup compatibility only. */
  strictMode?: boolean;
  preventNegativeAccountBalance?: boolean;
  budgetOverspendingBehavior?: 'allow' | 'warn' | 'block';
  rolloverStrategy: 'reset' | 'accumulate_surplus' | 'accumulate_debt';
  /** @deprecated Only for pre-v9 database / v3-v4 backup migration. */
  expenseCategories?: string[];
  /** @deprecated Only for pre-v9 database / v3-v4 backup migration. */
  incomeCategories?: string[];
  /** @deprecated Only for pre-v9 database / v3-v4 backup migration. */
  customCategoryIcons?: { [catId: string]: string };
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

/** An actual recorded receipt; forecasts are never stored here. */
export interface Income {
    recurringRuleId?: string;
    accountId?: string;
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

/** An actual dated purchase, counted once regardless of its nature. */
export interface Expense {
    accountId?: string;
    id: string;
    nature: 'Fijo' | 'Variable' | 'Ocasional';
    concept: string;
    amount: number; // Stored as positive cents
    date: string; // YYYY-MM-DD
    categoryId: string;
    month: string;
    currency?: string;
    fxRate?: number;
    amountBase?: number;
    paymentMethod?: 'cash' | 'credit';
    debtId?: string;
    /** Origin only; never repeats this actual transaction. */
    recurringRuleId?: string;
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

/** Planning only; changes to a rule never change actual transactions. */
export interface RecurringRule {
  id: string;
  direction: 'income' | 'expense';
  title: string;
  categoryId: string;
  amount: number;              // centavos, positivo
  cadence: 'weekly' | 'biweekly' | 'monthly';
  day?: number;                // monthly: 1..28, weekly: 0..6
  startDate: string;           // YYYY-MM-DD
  endDate?: string;
  active: boolean;
}

export interface Debt {
  openingAdjustment?: number;
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
  accountId?: string;
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


export interface Account {
  isDefaultCash?: boolean;
  id: string;
  name: string;
  type: 'cash' | 'bank';
  openingBalance: number;
  startDate: string;
}
export interface AccountTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  note: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income' | 'both';
  iconName: string;
  archived: boolean;
  expenseOrder?: number;
  incomeOrder?: number;
}

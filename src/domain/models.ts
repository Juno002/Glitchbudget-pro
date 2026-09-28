// Define a new structure for settings that doesn't rely on separate localStorage keys
export interface Settings {
  id: 'general'; // Singleton ID for settings
  theme: 'light' | 'dark' | 'system' | 'serious';
  /** Legacy backup compatibility only. */
  strictMode?: boolean;
  preventNegativeAccountBalance?: boolean;
  budgetOverspendingBehavior?: 'allow' | 'warn' | 'block';
  rolloverStrategy: 'reset' | 'accumulate_surplus' | 'accumulate_debt';
  /** Day 1..31 on which each financial period starts. Default: 1. */
  periodStartDay?: number;
  /** @deprecated Only for pre-v9 database / v3-v4 backup migration. */
  expenseCategories?: string[];
  /** @deprecated Only for pre-v9 database / v3-v4 backup migration. */
  incomeCategories?: string[];
  /** @deprecated Only for pre-v9 database / v3-v4 backup migration. */
  customCategoryIcons?: { [catId: string]: string };
  /** Base currency for planning, reports and canonical amounts. */
  currency: string;
  locale: string;
  baseIncome: {
    freq: 'mensual' | 'quincenal' | 'semanal';
    amount: number;
  };
  savePct: number; // Porcentaje de ahorro sugerido
}

/** Legacy persisted calendar marker; financial ranges are resolved by domain/periods.ts. */
export interface Period {
    id: string, // YYYY-MM compatibility id
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
  /**
   * Storage period key. Legacy monthly rows use YYYY-MM.
   * Phase 9 ranges may use weekly:/yearly:/one-time: prefixes.
   */
  month: string;
  categoryId: string;
  limit: number;
  /** Missing on legacy rows, which are interpreted as monthly budgets. */
  periodType?: 'weekly' | 'monthly' | 'yearly' | 'one_time';
  /** Inclusive date range for Phase 9 rows. Legacy monthly rows derive it from Period Engine settings. */
  periodStart?: string;
  periodEnd?: string;
};

export interface Goal {
    id: string;
    name: string;
    target: number;
    date?: string; // YYYY-MM-DD (deadline)
    quota: number; // Monto de la cuota mensual planificada
    startDate: string; // YYYY-MM-DD
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  /** Imported progress without a dated reservation; never reduces a period's planning margin. */
  kind?: 'legacy_balance';
}


export type Budget = Plan;

/** Planning only; changes to a rule never change actual transactions. */
export interface RecurringRule {
  id: string;
  direction: 'income' | 'expense';
  title: string;
  categoryId: string;
  amount: number;              // centavos, positivo
  defaultAccountId?: string;   // cuenta sugerida al confirmar
  cadence: 'weekly' | 'biweekly' | 'monthly';
  day?: number;                // monthly preferred day 1..31; weekly/biweekly scheduling ignores this legacy field
  startDate: string;           // YYYY-MM-DD
  endDate?: string;
  active: boolean;
}

export type PlannedOccurrenceStatus = 'pending' | 'confirmed' | 'skipped';

export interface PlannedOccurrence {
  id: string;
  ruleId: string;
  scheduledDate: string; // YYYY-MM-DD
  status: PlannedOccurrenceStatus;
  /** Present only when a confirmed occurrence is linked to its actual movement. */
  transactionId?: string;
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
  amount: number;              // centavos in the account/base currency
  note?: string;
  currency?: string;
  fxRate?: number;
  amountBase?: number;
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
  type: 'cash' | 'bank' | 'investment';
  /** Native currency of this account. Phase 11 creates accounts only in the base currency. */
  currency: string;
  openingBalance: number;
  startDate: string;
}
export type InvestmentType = 'certificate' | 'term_deposit' | 'known_yield';
export type InvestmentCompoundingMethod = 'simple' | 'monthly' | 'quarterly' | 'annually';

export interface Investment {
  id: string;
  accountId: string;
  type: InvestmentType;
  name: string;
  institution?: string;
  openedAt: string;            // YYYY-MM-DD
  maturityDate?: string;       // YYYY-MM-DD
  principal: number;           // centavos; contractual/original principal
  annualRate?: number;         // decimal fraction, e.g. 0.08 = 8%
  compoundingMethod?: InvestmentCompoundingMethod;
  notes?: string;
  status: 'active' | 'closed';
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

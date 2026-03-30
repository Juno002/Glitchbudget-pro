export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  categoryId: string;
  date: string; // ISO string YYYY-MM-DD
};

export interface Income {
    id: string;
    type: 'extra' | 'gift';
    description: string;
    amount: number; // Stored as positive cents
    date: string; // YYYY-MM-DD
    categoryId: string;
    month: string;
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
}

export type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string, strokeWidth?: number }>;
  type: 'income' | 'expense' | 'both';
};

export type Budget = {
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


export type RolloverStrategy = 'reset' | 'accumulate_surplus' | 'accumulate_debt';

    
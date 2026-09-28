export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  categoryId: string;
  date: string; // ISO string YYYY-MM-DD
};

export type { Income, Expense } from '../domain/models';

export type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string, strokeWidth?: string | number }>;
  type: 'income' | 'expense' | 'both';
};

export type Budget = {
  month: string; // YYYY-MM
  categoryId: string;
  limit: number;
};

export type { GoalView as Goal } from '../domain/goals';
export type { GoalContribution } from '../domain/models';


export type RolloverStrategy = 'reset' | 'accumulate_surplus' | 'accumulate_debt';

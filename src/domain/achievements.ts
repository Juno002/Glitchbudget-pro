import type { Expense, GoalContribution, Income, Plan } from './models';
import type { GoalView } from './goals';
import type { BudgetStatusDetail } from './budgets';
import type { AchievementId } from '@/lib/achievements';

export interface AchievementEvaluationInput {
  expenses: Expense[];
  incomes: Income[];
  goals: GoalView[];
  goalContributions: GoalContribution[];
  budgets: Plan[];
  currentMonth: string;
  budgetDetails: BudgetStatusDetail[];
  streak: number;
}

export function evaluateAchievementEligibility(input: AchievementEvaluationInput) {
  const eligible: AchievementId[] = [];
  const add = (id: AchievementId, condition: boolean) => {
    if (condition) eligible.push(id);
  };

  add('first_expense', input.expenses.length >= 1);
  add('first_income', input.incomes.length >= 1);
  add('first_goal', input.goals.length >= 1);

  const transactionCount = input.expenses.length + input.incomes.length;
  add('five_transactions', transactionCount >= 5);
  add('twenty_transactions', transactionCount >= 20);

  add('goal_complete', input.goals.some(goal => goal.status === 'completed'));
  const totalSaved = input.goals.reduce((sum, goal) => sum + goal.saved, 0);
  add('big_saver', totalSaved >= 1_000_000);

  const monthBudgets = input.budgets.filter(
    budget => budget.month === input.currentMonth && budget.limit > 0,
  );
  add('budget_master', monthBudgets.length >= 5);

  const budgetedCategories = input.budgetDetails.filter(detail => detail.limit > 0);
  const budgetsUnderControl = budgetedCategories.length > 0
    && budgetedCategories.every(detail => detail.status !== 'over');
  add('budget_under_control', budgetsUnderControl);

  add('diversified_income', new Set(input.incomes.map(income => income.categoryId)).size >= 3);

  const zeroWaste = budgetsUnderControl
    && budgetedCategories.every(
      detail => detail.remaining >= 0 && detail.remaining <= detail.limit * 0.1,
    );
  add('zero_waste', zeroWaste);

  const trackedPeriods = new Set([
    ...input.expenses.map(expense => expense.month),
    ...input.incomes.map(income => income.month),
  ]);
  add('consistent_tracker', trackedPeriods.size >= 3);

  const contributionCount = input.goalContributions.filter(
    row => row.kind !== 'legacy_balance',
  ).length;
  const nextStreak = Math.max(input.streak, contributionCount);
  add('saver_streak_3', input.streak >= 3);
  add('saver_streak_7', input.streak >= 7);

  return { eligible, contributionCount, nextStreak };
}

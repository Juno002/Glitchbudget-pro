import type { Goal, GoalContribution } from './models';
import { periodContaining, type PeriodSettings } from './periods';

export interface GoalView extends Goal {
  saved: number;
  status: 'active' | 'completed';
}

export function goalSaved(goalId: string, contributions: GoalContribution[]): number {
  return contributions.filter(row => row.goalId === goalId).reduce((sum, row) => {
    if (!Number.isSafeInteger(row.amount) || row.amount < 0 || !Number.isSafeInteger(sum + row.amount)) {
      throw new Error('Los aportes de la meta superan el monto admitido.');
    }
    return sum + row.amount;
  }, 0);
}

export function goalView(goal: Goal, contributions: GoalContribution[]): GoalView {
  const saved = goalSaved(goal.id, contributions);
  return { ...goal, saved, status: saved >= goal.target ? 'completed' : 'active' };
}

/** Includes the current financial period and the period containing the deadline. */
export function goalFundingSchedule(remaining: number, deadline: string | undefined, today: string, settings: PeriodSettings = {}) {
  const current = periodContaining(today, settings);
  if (!deadline) return { periods: null, requiredMonthly: null, overdue: false };
  const end = periodContaining(deadline, settings);
  const monthNumber = (id: string) => Number(id.slice(0, 4)) * 12 + Number(id.slice(5, 7));
  const periods = Math.max(1, monthNumber(end.id) - monthNumber(current.id) + 1);
  return { periods, requiredMonthly: Math.ceil(Math.max(0, remaining) / periods), overdue: deadline < today && remaining > 0 };
}

export function goalMetrics(goal: Goal, contributions: GoalContribution[], today: string, settings: PeriodSettings = {}) {
  const view = goalView(goal, contributions);
  const remaining = Math.max(0, goal.target - view.saved);
  return {
    ...view, remaining,
    percentage: goal.target > 0 ? (view.saved / goal.target) * 100 : 100,
    ...goalFundingSchedule(remaining, goal.date, today, settings),
  };
}

export type LegacyGoal = Goal & { saved?: number; status?: 'active' | 'completed' };

/** Keep real contributions; preserve only an undocumented positive legacy balance. */
export function migrateGoalRecords(goals: LegacyGoal[], contributions: GoalContribution[]) {
  const nextContributions = contributions.map(row => ({ ...row }));
  const ids = new Set(nextContributions.map(row => row.id));
  const goalIds = new Set(goals.map(goal => goal.id));
  if (ids.size !== contributions.length || goalIds.size !== goals.length) throw new Error('El respaldo contiene metas o aportes duplicados.');
  if (contributions.some(row => !goalIds.has(row.goalId))) throw new Error('El respaldo contiene aportes a metas inexistentes.');
  const nextGoals = goals.map(goal => {
    const quota = goal.quota ?? 0;
    if (!Number.isSafeInteger(goal.target) || goal.target < 0 || !Number.isSafeInteger(quota) || quota < 0) throw new Error('El objetivo o aporte planificado de una meta es inválido.');
    const saved = goalSaved(goal.id, contributions);
    const legacySaved = goal.saved ?? 0;
    if (!Number.isSafeInteger(legacySaved) || legacySaved < 0) throw new Error('El saldo anterior de una meta es inválido.');
    if (legacySaved > saved) {
      let id = `legacy-goal-balance:${goal.id}`;
      while (ids.has(id)) id += ':legacy';
      ids.add(id);
      nextContributions.push({ id, goalId:goal.id, amount:legacySaved - saved, date:goal.startDate, kind:'legacy_balance' });
    }
    return { id:goal.id, name:goal.name, target:goal.target, quota, startDate:goal.startDate, ...(goal.date ? { date:goal.date } : {}) };
  });
  return { goals: nextGoals, contributions: nextContributions };
}

import { z } from 'zod';
import { db } from './db';
import { isValidDate } from './finance-calculations';
import { goalSaved } from '../domain/goals';
import type { Goal, GoalContribution } from '../domain/models';

const amount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const date = z.string().refine(isValidDate, 'Selecciona una fecha válida.');
const goalSchema = z.object({
  id:z.string().min(1), name:z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  target:amount.positive(), quota:amount, startDate:date, date:date.optional(),
}).refine(goal => !goal.date || goal.date >= goal.startDate, 'La fecha límite no puede ser anterior al inicio.');

export async function saveGoal(input: Goal, mode: 'create' | 'update' = 'create') {
  const goal = goalSchema.parse(input);
  await db.transaction('rw', db.goals, async () => {
    if (mode === 'create') await db.goals.add(goal);
    else {
      if (!await db.goals.get(goal.id)) throw new Error('Meta no encontrada.');
      await db.goals.put(goal);
    }
  });
}

export async function removeGoal(id: string) {
  await db.transaction('rw', db.goals, db.goal_contributions, async () => {
    await db.goal_contributions.where('goalId').equals(id).delete();
    await db.goals.delete(id);
  });
}

export async function recordGoalContribution(input: GoalContribution) {
  const contribution = z.object({ id:z.string().min(1), goalId:z.string().min(1), amount:amount.positive(), date }).parse(input);
  return db.transaction('rw', db.goals, db.goal_contributions, async () => {
    const goal = await db.goals.get(contribution.goalId);
    if (!goal) throw new Error('Meta no encontrada.');
    if (contribution.date < goal.startDate) throw new Error('El aporte no puede ser anterior al inicio de la meta.');
    const saved = goalSaved(goal.id, await db.goal_contributions.where('goalId').equals(goal.id).toArray());
    if (!Number.isSafeInteger(saved + contribution.amount)) throw new Error('El total supera el monto admitido.');
    await db.goal_contributions.add(contribution);
    return saved < goal.target && saved + contribution.amount >= goal.target;
  });
}

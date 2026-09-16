import { db } from './db';
import { z } from 'zod';
import { IncomeV3, ExpenseV3, PlanV3, GoalV3, GoalContribV3 } from './backup-json';
import { parseCSV, encodeCSV, decodeCSVField } from './csv';
import { localDate } from './finance-calculations';

const columns = {
  incomes: ['id', 'month', 'date', 'categoryId', 'amount', 'description', 'type', 'currency', 'fxRate', 'amountBase'],
  expenses: ['id', 'month', 'date', 'categoryId', 'amount', 'concept', 'type', 'frequency', 'paymentMethod', 'debtId', 'currency', 'fxRate', 'amountBase', 'recurringId'],
  plans: ['month', 'categoryId', 'limit'],
  goals: ['id', 'name', 'target', 'saved', 'date', 'quota', 'startDate', 'status'],
  goal_contributions: ['id', 'goalId', 'amount', 'date'],
};
type ExportTable = keyof typeof columns;
const numeric = new Set(['amount', 'fxRate', 'amountBase', 'limit', 'target', 'saved', 'quota']);

async function exportTable(name: ExportTable) {
  const rows = await db.table(name).toArray();
  const fields = columns[name];
  const content = encodeCSV([fields, ...rows.map(row => fields.map(key => row[key]))]);
  const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = `${name}-${localDate()}.csv`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readRows<T>(file: File, name: ExportTable, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T[]> {
  const [header, ...lines] = parseCSV(await file.text());
  const required = columns[name].slice(0, name === 'incomes' ? 7 : name === 'expenses' ? 8 : undefined);
  if (!header || new Set(header).size !== header.length || required.some(key => !header.includes(key))) {
    throw new Error('El CSV no tiene las columnas necesarias para esta tabla.');
  }
  return lines.map((line, index) => {
    if (line.length !== header.length) throw new Error(`Fila ${index + 2}: número de columnas incorrecto.`);
    const record = Object.fromEntries(header.map((key, i) => {
      const value = decodeCSVField(line[i]);
      return [key, value === '' ? undefined : numeric.has(key) ? Number(value) : value];
    }));
    const result = schema.safeParse(record);
    if (!result.success) throw new Error(`Fila ${index + 2}: ${result.error.issues[0].path.join('.')} — ${result.error.issues[0].message}`);
    return result.data;
  });
}

export const exportIncomesCSV = () => exportTable('incomes');
export const exportExpensesCSV = () => exportTable('expenses');
export const exportPlansCSV = () => exportTable('plans');
export const exportGoalsCSV = () => exportTable('goals');
export const exportGoalContribCSV = () => exportTable('goal_contributions');

export async function importIncomesCSV(file: File) {
  const rows = await readRows(file, 'incomes', IncomeV3);
  await db.transaction('rw', db.incomes, async () => {
    await db.incomes.clear();
    await db.incomes.bulkAdd(rows.map(row => ({ ...row, month: row.date.slice(0, 7) })));
  });
}
export async function importExpensesCSV(file: File) {
  const rows = await readRows(file, 'expenses', ExpenseV3);
  await db.transaction('rw', db.expenses, db.debts, async () => {
    for (const row of rows) {
      if (row.paymentMethod === 'credit' && (!row.debtId || !await db.debts.get(row.debtId))) {
        throw new Error('El CSV contiene una tarjeta desconocida. Restaura el respaldo JSON completo.');
      }
    }
    await db.expenses.clear();
    await db.expenses.bulkAdd(rows.map(row => ({ ...row, concept: row.concept ?? '', month: row.date.slice(0, 7) })));
  });
}
export async function importPlansCSV(file: File) {
  const rows = await readRows(file, 'plans', PlanV3);
  await db.transaction('rw', db.plans, async () => {
    await db.plans.clear(); await db.plans.bulkAdd(rows);
  });
}
export async function importGoalsCSV(file: File) {
  const rows = await readRows(file, 'goals', GoalV3);
  await db.transaction('rw', db.goals, db.goal_contributions, async () => {
    const ids = new Set(rows.map(row => row.id));
    const contributions = await db.goal_contributions.toArray();
    if (contributions.some(c => !ids.has(c.goalId))) {
      throw new Error('Hay aportes vinculados a metas que no están en el CSV. Usa el respaldo JSON completo.');
    }
    await db.goals.clear(); await db.goals.bulkAdd(rows);
  });
}
export async function importGoalContribCSV(file: File) {
  const rows = await readRows(file, 'goal_contributions', GoalContribV3);
  await db.transaction('rw', db.goals, db.goal_contributions, async () => {
    const goals = await db.goals.toArray();
    if (rows.some(c => !goals.some(g => g.id === c.goalId))) throw new Error('El CSV contiene aportes a una meta desconocida.');
    const previous = await db.goal_contributions.toArray();
    for (const goal of goals) {
      const priorSum = previous.filter(c => c.goalId === goal.id).reduce((sum, c) => sum + c.amount, 0);
      const nextSum = rows.filter(c => c.goalId === goal.id).reduce((sum, c) => sum + c.amount, 0);
      const saved = Math.max(0, goal.saved - priorSum) + nextSum;
      await db.goals.update(goal.id, { saved, status: saved >= goal.target ? 'completed' : 'active' });
    }
    await db.goal_contributions.clear(); await db.goal_contributions.bulkAdd(rows);
  });
}

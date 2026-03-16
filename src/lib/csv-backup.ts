// src/lib/csv-backup.ts
import { db } from '@/lib/db';
import type { Income, Expense, Plan, Goal, GoalContribution } from '@/lib/db';

// Helper para descargar archivos
function downloadCSV(content: string, name: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Helper genérico para validar CSV
function parseCSV(text: string): string[][] {
  return text.trim().split('\n').map(line => line.split(','));
}

//
// ---------- EXPORTS ----------
//

export async function exportIncomesCSV() {
  const rows = await db.incomes.toArray();
  const header = 'id,month,date,categoryId,amount,description,type\n';
  const body = rows.map(r => `${r.id},${r.month},${r.date},${r.categoryId},${r.amount},"${r.description.replace(/"/g, '""')}",${r.type}`).join('\n');
  downloadCSV(header + body, 'incomes');
}

export async function exportExpensesCSV() {
  const rows = await db.expenses.toArray();
  const header = 'id,month,date,categoryId,amount,concept,type,frequency\n';
  const body = rows.map(r => `${r.id},${r.month},${r.date},${r.categoryId},${r.amount},"${r.concept.replace(/"/g, '""')}",${r.type},${r.frequency ?? ''}`).join('\n');
  downloadCSV(header + body, 'expenses');
}

export async function exportPlansCSV() {
  const rows = await db.plans.toArray();
  const header = 'month,categoryId,limit\n';
  const body = rows.map(r => `${r.month},${r.categoryId},${r.limit}`).join('\n');
  downloadCSV(header + body, 'plans');
}

export async function exportGoalsCSV() {
  const rows = await db.goals.toArray();
  const header = 'id,name,target,saved,date,quota,startDate,status\n';
  const body = rows.map(r => `${r.id},"${r.name.replace(/"/g, '""')}",${r.target},${r.saved},${r.date ?? ''},${r.quota},${r.startDate},${r.status}`).join('\n');
  downloadCSV(header + body, 'goals');
}

export async function exportGoalContribCSV() {
  const rows = await db.goal_contributions.toArray();
  const header = 'id,goalId,amount,date\n';
  const body = rows.map(r => `${r.id},${r.goalId},${r.amount},${r.date}`).join('\n');
  downloadCSV(header + body, 'goal-contributions');
}

//
// ---------- IMPORTS ----------
//

export async function importIncomesCSV(file: File) {
  const [header, ...lines] = parseCSV(await file.text());
  const expected = 'id,month,date,categoryId,amount,description,type';
  if (header.join(',') !== expected) throw new Error('Encabezado inválido en incomes.csv');

  const rows: Income[] = lines.map(([id, month, date, categoryId, amount, description, type]) => ({
    id, month, date, categoryId,
    amount: parseInt(amount, 10), 
    description: description.slice(1,-1).replace(/""/g, '"'),
    type: type as Income['type']
  }));

  await db.transaction('rw', db.incomes, async () => {
    await db.incomes.clear();
    await db.incomes.bulkAdd(rows);
  });
}

export async function importExpensesCSV(file: File) {
  const [header, ...lines] = parseCSV(await file.text());
  const expected = 'id,month,date,categoryId,amount,concept,type,frequency';
  if (header.join(',') !== expected) throw new Error('Encabezado inválido en expenses.csv');

  const rows: Expense[] = lines.map(([id, month, date, categoryId, amount, concept, type, frequency]) => ({
    id, month, date, categoryId,
    amount: parseInt(amount, 10), 
    concept: concept.slice(1,-1).replace(/""/g, '"'),
    type: type as Expense['type'],
    frequency: frequency as Expense['frequency']
  }));

  await db.transaction('rw', db.expenses, async () => {
    await db.expenses.clear();
    await db.expenses.bulkAdd(rows);
  });
}

export async function importPlansCSV(file: File) {
  const [header, ...lines] = parseCSV(await file.text());
  const expected = 'month,categoryId,limit';
  if (header.join(',') !== expected) throw new Error('Encabezado inválido en plans.csv');

  const rows: Plan[] = lines.map(([month, categoryId, limit]) => ({
    month, categoryId,
    limit: parseInt(limit, 10)
  }));

  await db.transaction('rw', db.plans, async () => {
    await db.plans.clear();
    await db.plans.bulkPut(rows); // bulkPut for compound primary key
  });
}

export async function importGoalsCSV(file: File) {
  const [header, ...lines] = parseCSV(await file.text());
  const expected = 'id,name,target,saved,date,quota,startDate,status';
  if (header.join(',') !== expected) throw new Error('Encabezado inválido en goals.csv');

  const rows: Goal[] = lines.map(([id, name, target, saved, date, quota, startDate, status]) => ({
    id, 
    name: name.slice(1,-1).replace(/""/g, '"'),
    target: parseInt(target, 10),
    saved: parseInt(saved, 10),
    date: date || undefined,
    quota: parseInt(quota, 10),
    startDate, 
    status: status as Goal['status']
  }));

  await db.transaction('rw', db.goals, async () => {
    await db.goals.clear();
    await db.goals.bulkAdd(rows);
  });
}

export async function importGoalContribCSV(file: File) {
  const [header, ...lines] = parseCSV(await file.text());
  const expected = 'id,goalId,amount,date';
  if (header.join(',') !== expected) throw new Error('Encabezado inválido en goal-contributions.csv');

  const rows: GoalContribution[] = lines.map(([id, goalId, amount, date]) => ({
    id, goalId,
    amount: parseInt(amount, 10), date
  }));

  await db.transaction('rw', db.goal_contributions, async () => {
    await db.goal_contributions.clear();
    await db.goal_contributions.bulkAdd(rows);
  });
}

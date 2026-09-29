import { preserveImportedCategories } from './category-service';
import { requireAccount } from './accounts';
import { db } from './db';
import { z } from 'zod';
import { IncomeV6, ExpenseCSV, IncomeV11, ExpenseV11, PlanV7, GoalV3, GoalContribV8 } from './backup-json';
import { migrateGoalRecords, goalSaved } from '../domain/goals';
import { validateBudgetPlans } from '../domain/budgets';
import { parseCSV, encodeCSV, decodeCSVField } from './csv';
import { localDate } from './finance-calculations';
import { normalizeCurrencyCode } from '../domain/currency';
import { normalizeTransactionLabels } from '../domain/transaction-metadata';
import { appliesTo, type CategoryDirection } from '../domain/categories';

const columns = {
  incomes: ['id', 'month', 'date', 'categoryId', 'amount', 'description', 'type', 'currency', 'fxRate', 'amountBase', 'accountId', 'recurringRuleId', 'labels'],
  expenses: ['id', 'month', 'date', 'categoryId', 'amount', 'concept', 'nature', 'paymentMethod', 'debtId', 'currency', 'fxRate', 'amountBase', 'recurringRuleId', 'accountId', 'necessity', 'labels'],
  plans: ['month', 'categoryId', 'limit', 'periodType', 'periodStart', 'periodEnd'],
  goals: ['id', 'name', 'target', 'date', 'quota', 'startDate'],
  goal_contributions: ['id', 'goalId', 'amount', 'date', 'kind'],
};
type ExportTable = keyof typeof columns;
export type CsvImportOptions = { beforeWrite?: () => Promise<void> };
const numeric = new Set(['amount', 'fxRate', 'amountBase', 'limit', 'target', 'saved', 'quota']);

async function validateCSVCategoryCompatibility(
  rows: Array<{ categoryId: string }>,
  direction: CategoryDirection,
): Promise<void> {
  for (const id of new Set(rows.map(row => row.categoryId))) {
    const existing = await db.categories.get(id);
    if (existing && !appliesTo(existing, direction)) {
      throw new Error('Categoría incompatible en el CSV: ' + id);
    }
  }
}

export async function serializeTableCSV(name: ExportTable) {
  const rows = await db.table(name).toArray();
  const fields = columns[name];
  return encodeCSV([fields, ...rows.map(row => fields.map(key => key === 'labels' && Array.isArray(row[key]) ? JSON.stringify(row[key]) : row[key]))]);
}

async function exportTable(name: ExportTable) {
  const content = await serializeTableCSV(name);
  const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = `${name}-${localDate()}.csv`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readRows<T>(file: File, name: ExportTable, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T[]> {
  const [header, ...lines] = parseCSV(await file.text());
  const required = columns[name].slice(0, name === 'incomes' ? 7 : name === 'expenses' ? 6 : name === 'plans' ? 3 : name === 'goal_contributions' ? 4 : undefined);
  if (!header || new Set(header).size !== header.length || required.some(key => !header.includes(key))) {
    throw new Error('El CSV no tiene las columnas necesarias para esta tabla.');
  }
  return lines.map((line, index) => {
    if (line.length !== header.length) throw new Error(`Fila ${index + 2}: número de columnas incorrecto.`);
    const record = Object.fromEntries(header.map((key, i) => {
      const value = decodeCSVField(line[i]);
      if (value === '') return [key, undefined];
      if (key === 'labels') {
        try {
          const parsed = JSON.parse(value);
          return [key, Array.isArray(parsed) ? parsed : undefined];
        } catch {
          throw new Error(`Fila ${index + 2}: labels — usa una lista JSON, por ejemplo ["casa","trabajo"]`);
        }
      }
      return [key, numeric.has(key) ? Number(value) : value];
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

export async function importIncomesCSV(file: File, options: CsvImportOptions = {}) {
  const rows = await readRows(file, 'incomes', z.union([IncomeV11, IncomeV6]));
  const baseCurrency = normalizeCurrencyCode((await db.settings.get('general'))?.currency);
  const normalized = [];
  for (const row of rows) {
    const account = row.accountId ? await requireAccount(row.accountId, row.date) : undefined;
    if (account && account.currency !== baseCurrency) {
      throw new Error('El CSV contiene una cuenta en otra moneda. Usa una conversión manual antes de importar.');
    }
    normalized.push({
      ...row,
      labels:'labels' in row && row.labels ? normalizeTransactionLabels(row.labels) : undefined,
      month:row.date.slice(0,7),
      currency:account?.currency || baseCurrency,
      fxRate:1,
      amountBase:row.amount,
    });
  }
  await validateCSVCategoryCompatibility(normalized, 'income');
  if (options.beforeWrite) await options.beforeWrite();

  await db.transaction('rw', db.incomes, db.categories, db.settings, async () => {
    await preserveImportedCategories(normalized.map(row => ({ categoryId:row.categoryId })), 'income');
    await db.incomes.clear();
    await db.incomes.bulkAdd(normalized);
  });
}

export async function importExpensesCSV(file: File, options: CsvImportOptions = {}) {
  const rows = await readRows(file, 'expenses', z.union([ExpenseV11, ExpenseCSV]));
  const baseCurrency = normalizeCurrencyCode((await db.settings.get('general'))?.currency);
  const normalized = [];
  for (const row of rows) {
    const account = row.accountId ? await requireAccount(row.accountId, row.date) : undefined;
    if (account && account.currency !== baseCurrency) {
      throw new Error('El CSV contiene una cuenta en otra moneda. Usa una conversión manual antes de importar.');
    }
    if (row.paymentMethod === 'credit' && (!row.debtId || !await db.debts.get(row.debtId))) {
      throw new Error('El CSV contiene una tarjeta desconocida. Restaura el respaldo JSON completo.');
    }
    normalized.push({
      ...row,
      labels:'labels' in row && row.labels ? normalizeTransactionLabels(row.labels) : undefined,
      concept:row.concept ?? '',
      month:row.date.slice(0,7),
      currency:account?.currency || baseCurrency,
      fxRate:1,
      amountBase:row.amount,
    });
  }
  await validateCSVCategoryCompatibility(normalized, 'expense');
  if (options.beforeWrite) await options.beforeWrite();

  await db.transaction('rw', [db.expenses, db.categories, db.settings], async () => {
    await preserveImportedCategories(normalized.map(row => ({ categoryId:row.categoryId })), 'expense');
    await db.expenses.clear();
    await db.expenses.bulkAdd(normalized);
  });
}

export async function importPlansCSV(file: File, options: CsvImportOptions = {}) {
  const rows = await readRows(file, 'plans', PlanV7);
  validateBudgetPlans(rows);
  await validateCSVCategoryCompatibility(rows, 'expense');
  if (options.beforeWrite) await options.beforeWrite();

  await db.transaction('rw', db.plans, db.categories, async () => {
    await preserveImportedCategories(rows, 'expense');
    await db.plans.clear();
    await db.plans.bulkAdd(rows);
  });
}

export async function importGoalsCSV(file: File, options: CsvImportOptions = {}) {
  const rows = await readRows(file, 'goals', GoalV3);
  const ids = new Set(rows.map(row => row.id));
  const contributions = await db.goal_contributions.toArray();
  if (contributions.some(c => !ids.has(c.goalId))) {
    throw new Error('Hay aportes vinculados a metas que no están en el CSV. Usa el respaldo JSON completo.');
  }
  if (rows.some(row => row.saved > goalSaved(row.id, contributions))) {
    throw new Error('Este CSV antiguo contiene progreso sin sus aportes. Restaura el respaldo JSON completo para evitar duplicarlo al importar los aportes por separado.');
  }
  const migrated = migrateGoalRecords(rows, contributions);
  if (options.beforeWrite) await options.beforeWrite();

  await db.transaction('rw', db.goals, db.goal_contributions, async () => {
    await db.goals.clear();
    await db.goals.bulkAdd(migrated.goals);
    await db.goal_contributions.bulkPut(migrated.contributions);
  });
}

export async function importGoalContribCSV(file: File, options: CsvImportOptions = {}) {
  const rows = await readRows(file, 'goal_contributions', GoalContribV8);
  const hasKind = parseCSV(await file.text())[0].includes('kind');
  const goals = await db.goals.toArray();
  if (rows.some(c => !goals.some(g => g.id === c.goalId))) {
    throw new Error('El CSV contiene aportes a una meta desconocida.');
  }
  const previous = await db.goal_contributions.toArray();
  const migrated = migrateGoalRecords(goals, previous);
  const next = hasKind
    ? rows
    : [
        ...rows,
        ...migrated.contributions.filter(row => (
          row.kind === 'legacy_balance' && !rows.some(item => item.id === row.id)
        )),
      ];
  const validated = migrateGoalRecords(migrated.goals, next);
  if (options.beforeWrite) await options.beforeWrite();

  await db.transaction('rw', db.goals, db.goal_contributions, async () => {
    await db.goals.bulkPut(validated.goals);
    await db.goal_contributions.clear();
    await db.goal_contributions.bulkAdd(validated.contributions);
  });
}

import { migrateActualExpense, migrateRecurringRule } from '../domain/actual-planned-migration';
import { recurringRuleSchema } from './recurring-rule-service';
import { reconstructCategories, withoutLegacyCategories, appliesTo } from '../domain/categories';
import { categorySchema, validateCategorySet } from './category-service';
import { normalizeFinancialPolicies } from '../policies/settings';
import { accountSchema, transferSchema } from './accounts';

import { z } from 'zod';
import { db } from '@/lib/db';
import { isValidDate } from './finance-calculations';

// ---------- Esquema JSON v3 ----------
const ISODate = z.string().refine(isValidDate, 'Fecha inválida');
const ISODateTime = z.string().datetime();
const MonthID = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/,'Mes inválido');
const Id = z.string().min(1);
const MoneyCents = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

const SettingsV3 = z.object({
  id: z.literal('general').default('general'),
  currency: z.string().default('DOP'),
  locale: z.string().default('es-DO'),
  theme: z.enum(['light','dark','system','serious']).optional(),
  strictMode: z.boolean().default(false),
  preventNegativeAccountBalance: z.boolean().optional(),
  budgetOverspendingBehavior: z.enum(['allow', 'warn', 'block']).optional(),
  savePct: z.number().min(0).max(1).default(0),
  customCategoryIcons: z.record(z.string()).optional(),
  rolloverStrategy: z.enum(['reset','accumulate_surplus','accumulate_debt']).default('reset'),
  baseIncome: z.object({ 
    freq: z.enum(['mensual','quincenal','semanal']).default('mensual'),
    amount: MoneyCents 
  }).default({ freq: 'mensual', amount: 0 }),
  incomeCategories: z.array(z.string()).optional(),
  expenseCategories: z.array(z.string()).optional()
}).passthrough(); // conserva claves futuras sin romper


const PeriodV3 = z.object({
  id: MonthID,
  year: z.number().int().nonnegative(),
  month: z.number().int().min(1).max(12),
  createdAt: ISODateTime
});

export const IncomeV3 = z.object({
  accountId: Id.optional(),
  type: z.enum(['extra', 'gift']).default('extra'),
  id: Id, month: MonthID, date: ISODate, categoryId: Id,
  amount: z.number().int().nonnegative(),
  description: z.string().default('ingreso'),
  currency: z.string().optional(),
  fxRate: z.number().optional(),
  amountBase: z.number().int().optional()
});

export const ExpenseV3 = z.object({
  accountId: Id.optional(),
  type: z.enum(['Fijo', 'Variable', 'Ocasional']).default('Variable'),
  frequency: z.enum(['mensual', 'quincenal', 'semanal']).optional(),
  id: Id, month: MonthID, date: ISODate, categoryId: Id,
  amount: z.number().int().nonnegative(),
  concept: z.string().optional(),
  currency: z.string().optional(),
  fxRate: z.number().optional(),
  amountBase: z.number().int().optional(),
  paymentMethod: z.enum(['cash', 'credit']).optional(),
  debtId: z.string().optional(),
  recurringId: z.string().optional()
});

export const IncomeV6 = IncomeV3.extend({ recurringRuleId: Id.optional() });
export const ExpenseV6 = ExpenseV3.omit({type:true,frequency:true,recurringId:true}).extend({nature:z.enum(['Fijo','Variable','Ocasional']),recurringRuleId:Id.optional()}).strict();
export const ExpenseCSV = z.union([ExpenseV6, ExpenseV3.strict().transform(row=>migrateActualExpense({...row,concept:row.concept??''}))]);

export const PlanV3 = z.object({
  month: MonthID, categoryId: Id,
  limit: z.number().int().nonnegative()
});

export const GoalV3 = z.object({
  quota: MoneyCents.default(0),
  id: Id, name: z.string(),
  target: z.number().int().nonnegative(),
  saved: z.number().int().nonnegative().default(0),
  startDate: ISODate,
  date: ISODate.optional(),
  status: z.enum(['active','completed']).default('active')
});

export const GoalContribV3 = z.object({
  id: Id, goalId: Id,
  amount: z.number().int().nonnegative(),
  date: ISODate
});

const RecurrentV3 = z.object({
  id: Id, type: z.enum(['income', 'expense']), title: z.string(), categoryId: Id,
  amount: MoneyCents, freq: z.enum(['weekly', 'biweekly', 'monthly']),
  day: z.number().int().min(0).max(31).optional(), startDate: ISODate,
  endDate: ISODate.optional(), active: z.boolean(),
});
const DebtV3 = z.object({
  openingAdjustment: z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER).optional(),
  id: Id, name: z.string(), type: z.enum(['credit_card', 'loan']), principal: MoneyCents,
  apr: z.number().finite().nonnegative(), minPayment: MoneyCents, createdAt: ISODateTime,
  status: z.enum(['active', 'closed']), billingCycleDay: z.number().int().min(1).max(31).optional(),
  paymentDueDay: z.number().int().min(1).max(31).optional(),
});
const DebtPaymentV3 = z.object({
  accountId: Id.optional(),
  id: Id, debtId: Id, date: z.union([ISODate, ISODateTime]), amount: MoneyCents, note: z.string().optional(),
});
const FxRateV3 = z.object({
  id: Id, quote: Id, base: Id, rate: z.number().finite().positive(), updatedAt: ISODateTime,
});

const DumpV3 = z.object({
  v: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  categories: z.array(categorySchema).optional(),
  accounts: z.array(accountSchema).optional(),
  accountTransfers: z.array(transferSchema).optional(),
  exportedAt: ISODateTime,
  settings: SettingsV3,
  periods: z.array(PeriodV3),
  incomes: z.array(IncomeV3),
  expenses: z.array(ExpenseV3),
  plans: z.array(PlanV3),
  goals: z.array(GoalV3),
  goalContributions: z.array(GoalContribV3),
  recurrents: z.array(RecurrentV3).optional(),
  debts: z.array(DebtV3).optional(),
  debtPayments: z.array(DebtPaymentV3).optional(),
  fxRates: z.array(FxRateV3).optional(),
});
const DumpV6 = DumpV3.extend({ v:z.literal(6), incomes:z.array(IncomeV6), expenses:z.array(ExpenseV6), recurrents:z.array(recurringRuleSchema) });
type DumpV6T = z.infer<typeof DumpV6>;
function parseBackup(raw:unknown) {
 if ((raw as {v?:number})?.v===6) return DumpV6.parse(raw);
 const legacy=DumpV3.parse(raw);
 return {...legacy, expenses:legacy.expenses.map(row=>migrateActualExpense({...row,concept:row.concept??''})), recurrents:(legacy.recurrents||[]).map(migrateRecurringRule)};
}

// ---------- Helpers ----------
const toCents = (n: number) => Math.round(n);
const nowIsoZ = () => new Date().toISOString();

function uniq<T>(arr: T[]) { return Array.from(new Set(arr)); }

export async function exportDataJSON(): Promise<string> {
  // Lee todo de Dexie
  const [settings, periods, incomes, expenses, plans, goals, goalContributions, recurrents, debts, debtPayments, fxRates, accounts, accountTransfers, categories] = await db.transaction('r', db.tables, () => Promise.all([
    db.settings.get('general').then(s => s ?? { id:'general', currency:'DOP', locale:'es-DO', theme: 'dark', strictMode: false, rolloverStrategy: 'reset', expenseCategories: [], incomeCategories: [], baseIncome: {freq: 'mensual', amount: 0}, savePct: 0, customCategoryIcons: {} }),
    db.periods.toArray(),
    db.incomes.toArray(),
    db.expenses.toArray(),
    db.plans.toArray(),
    db.goals.toArray(),
    db.goal_contributions.toArray(),
    db.recurrents.toArray(),
    db.debts.toArray(),
    db.debt_payments.toArray(),
    db.fxRates.toArray(),
    db.accounts.toArray(),
    db.account_transfers.toArray(),
    db.categories.toArray(),
  ]));

  // Current v6 contract; amounts remain in cents.
  const dump: DumpV6T = {
    v: 6,
    categories,
    accounts, accountTransfers,
    exportedAt: nowIsoZ(),
    settings: {
      ...settings,
      savePct: settings.savePct ?? 0,
      id: 'general',
      currency: settings.currency ?? 'DOP',
      locale: settings.locale ?? 'es-DO',
      theme: (settings.theme as ('light' | 'dark' | 'system' | 'serious')) ?? 'system',
      strictMode: settings.strictMode ?? false,
      ...normalizeFinancialPolicies(settings),
      rolloverStrategy: (settings.rolloverStrategy as ('reset' | 'accumulate_surplus' | 'accumulate_debt')) ?? 'reset',
      baseIncome: { 
        freq: (settings.baseIncome?.freq as ('mensual' | 'quincenal' | 'semanal')) ?? 'mensual',
        amount: Math.max(0, Number(settings.baseIncome?.amount ?? 0))
      },
    },
    periods: periods.map(p => ({
      id: p.id, year: p.year, month: p.month, createdAt: p.createdAt
    })),
    incomes: incomes.map(i => ({
      type: i.type,
      id: i.id, month: i.month, date: i.date, categoryId: i.categoryId,
      amount: toCents(i.amount), description: i.description, recurringRuleId:i.recurringRuleId,
      accountId: i.accountId, currency: i.currency, fxRate: i.fxRate, amountBase: i.amountBase,
    })),
    expenses: expenses.map(e => ({
      nature: e.nature,
      id: e.id, month: e.month, date: e.date, categoryId: e.categoryId,
      amount: toCents(e.amount), concept: e.concept,
      accountId: e.accountId, currency: e.currency, fxRate: e.fxRate, amountBase: e.amountBase,
      paymentMethod: e.paymentMethod, debtId: e.debtId, recurringRuleId: e.recurringRuleId,
    })),
    plans: plans.map(p => ({
      month: p.month, categoryId: p.categoryId,
      limit: toCents(p.limit)
    })),
    goals: goals.map(g => ({
      quota: g.quota ?? 0,
      id: g.id, name: g.name,
      target: toCents(g.target), saved: toCents(g.saved ?? 0),
      startDate: g.startDate, date: g.date || undefined, status: g.status ?? 'active'
    })),
    goalContributions: goalContributions.map(gc => ({
      id: gc.id, goalId: gc.goalId, amount: toCents(gc.amount), date: gc.date
    })),
    recurrents,
    debts,
    debtPayments,
    fxRates,
  };

  // Valida antes de entregar
  dump.settings = withoutLegacyCategories(dump.settings);
  validateCategorySet(categories);
  validateCategoryReferences(dump, categories);
  DumpV6.parse(dump);
  return JSON.stringify(dump, null, 2);
}

export async function downloadExportJSON() {
  const s = await exportDataJSON();
  const blob = new Blob([s], { type:'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `glitchbudget-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importDataJSON(text: string): Promise<{
  counts: Record<string, number>
}> {
  // 1) Parse + valida contrato v3
  const raw = JSON.parse(text);
  const d = parseBackup(raw); // si no cumple, explota aquí con un mensaje útil

  if (d.v >= 4 && (!d.accounts || !d.accountTransfers)) throw new Error('El respaldo v4 está incompleto: faltan cuentas o transferencias.');
  if(d.v>=5 && !d.categories) throw new Error('El respaldo no contiene categorías.');
  const categories=d.v>=5 ? d.categories! : reconstructCategories({settings:d.settings,incomes:d.incomes,expenses:d.expenses,plans:d.plans,recurrents:d.recurrents.map(r=>({categoryId:r.categoryId,type:r.direction}))});
  validateCategorySet(categories);
  validateCategoryReferences(d, categories);
  const accountMap = new Map((d.accounts || []).map(a => [a.id, a]));
  if ((d.accounts || []).filter(a => a.isDefaultCash).length > 1) throw new Error('El respaldo contiene varias cuentas de efectivo predeterminadas.');
  for (const row of [...d.incomes, ...d.expenses, ...(d.debtPayments || [])]) {
    if (row.accountId && (!accountMap.has(row.accountId) || row.date.slice(0,10) < accountMap.get(row.accountId)!.startDate)) throw new Error('El respaldo contiene una cuenta desconocida o un movimiento anterior a su saldo inicial.');
  }
  for (const transfer of d.accountTransfers || []) {
    for (const id of [transfer.fromAccountId, transfer.toAccountId]) {
      if (!accountMap.has(id) || transfer.date < accountMap.get(id)!.startDate) throw new Error('El respaldo contiene una transferencia con cuentas o fechas inválidas.');
    }
  }
  const goalIds = new Set(d.goals.map(g => g.id));
  const debtIds = new Set((d.debts || []).map(debt => debt.id));
  if (d.goalContributions.some(c => !goalIds.has(c.goalId))) throw new Error('El respaldo contiene aportes a metas inexistentes.');
  if ((d.debtPayments || []).some(p => !debtIds.has(p.debtId))) throw new Error('El respaldo contiene pagos de tarjetas inexistentes.');
  if (d.expenses.some(e => e.paymentMethod === 'credit' && (!e.debtId || !debtIds.has(e.debtId)))) {
    throw new Error('El respaldo contiene gastos vinculados a tarjetas inexistentes.');
  }

  // 2) Integridad referencial mínima: periods presentes
  //    Si faltan periods pero los periodId aparecen en incomes/expenses/plans, los creamos.
  const periodIds = uniq([
    ...d.periods.map(p => p.id),
    ...d.incomes.map(i => i.date.slice(0, 7)),
    ...d.expenses.map(e => e.date.slice(0, 7)),
    ...d.plans.map(p => p.month)
  ]);
  const periodsEnsured = periodIds.map(id => {
    const found = d.periods.find(p => p.id === id);
    if (found) return found;
    const [y, m] = id.split('-').map(n => parseInt(n, 10));
    return { id, year: y, month: m, createdAt: nowIsoZ() };
  });

  // 3) Mapea a tu DB (nombres internos)
  const settingsRow = {
    ...d.settings,
    id: 'general',
    currency: d.settings.currency ?? 'DOP',
    locale:   d.settings.locale   ?? 'es-DO',
    theme:    (d.settings.theme as ('light' | 'dark' | 'system' | 'serious')) ?? 'system',
    strictMode: d.settings.strictMode ?? false,
    ...normalizeFinancialPolicies(d.settings),
    rolloverStrategy: d.settings.rolloverStrategy ?? 'reset',
    baseIncome: { 
      amount: Math.max(0, Number(d.settings.baseIncome?.amount ?? 0)),
      freq: d.settings.baseIncome?.freq ?? 'mensual',
    },
    incomeCategories:  Array.isArray(d.settings.incomeCategories)  ? d.settings.incomeCategories  : [],
    expenseCategories: Array.isArray(d.settings.expenseCategories) ? d.settings.expenseCategories : []
  };

  const incomes = d.incomes.map(i => ({
    id: i.id, month: i.date.slice(0, 7), date: i.date, categoryId: i.categoryId,
    amount: i.amount, description: i.description, type: i.type, recurringRuleId: 'recurringRuleId' in i ? i.recurringRuleId : undefined,
    accountId: i.accountId, currency: i.currency, fxRate: i.fxRate, amountBase: i.amountBase,
  }));

  const expenses = d.expenses.map(e => ({
    id: e.id, month: e.date.slice(0, 7), date: e.date, categoryId: e.categoryId,
    amount: e.amount, concept: e.concept ?? '', nature: e.nature,
    accountId: e.accountId, currency: e.currency, fxRate: e.fxRate, amountBase: e.amountBase,
    paymentMethod: e.paymentMethod, debtId: e.debtId, recurringRuleId: e.recurringRuleId,
  }));

  const plans = d.plans.map(p => ({
    month: p.month, categoryId: p.categoryId,
    limit: p.limit
  }));

  const goals = d.goals.map(g => ({
    id: g.id, name: g.name,
    target: g.target, saved: g.saved,
    startDate: g.startDate, date: g.date, status: g.status,
    quota: g.quota
  }));

  const goal_contributions = d.goalContributions.map(gc => ({
    id: gc.id, goalId: gc.goalId, amount: gc.amount, date: gc.date
  }));

  const recurrents = d.recurrents ?? [];
  const debts = d.debts ?? [];
  const debtPayments = d.debtPayments ?? [];
  const fxRates = d.fxRates ?? [];


  // 4) Transacción: clear + bulkAdd
  await db.transaction('rw',
    db.tables,
    async () => {
      await Promise.all([
        db.categories.clear(),
        db.settings.clear(),
        db.periods.clear(),
        db.incomes.clear(),
        db.expenses.clear(),
        db.plans.clear(),
        db.goals.clear(),
        db.goal_contributions.clear(),
        db.recurrents.clear(),
        db.debts.clear(),
        db.debt_payments.clear(),
        db.fxRates.clear(),
        db.accounts.clear(),
        db.account_transfers.clear(),
      ]);
      await db.settings.put(withoutLegacyCategories(settingsRow) as any);
      if(categories.length) await db.categories.bulkAdd(categories);
      if (d.accounts?.length) await db.accounts.bulkAdd(d.accounts);
      if (d.accountTransfers?.length) await db.account_transfers.bulkAdd(d.accountTransfers);
      if (periodsEnsured.length) await db.periods.bulkAdd(periodsEnsured as any);
      if (incomes.length) await db.incomes.bulkAdd(incomes as any);
      if (expenses.length) await db.expenses.bulkAdd(expenses as any);
      if (plans.length) await db.plans.bulkPut(plans as any);
      if (goals.length) await db.goals.bulkAdd(goals as any);
      if (goal_contributions.length) await db.goal_contributions.bulkAdd(goal_contributions as any);
      if (recurrents.length) await db.recurrents.bulkAdd(recurrents as any);
      if (debts.length) await db.debts.bulkAdd(debts as any);
      if (debtPayments.length) await db.debt_payments.bulkAdd(debtPayments as any);
      if (fxRates.length) await db.fxRates.bulkAdd(fxRates as any);
    }
  );

  // 5) Conteo post-import (para logs o toasts)
  const [cs, cp, ci, ce, cpl, cg, cgc, cr, cd, cdp, cfr] = await Promise.all([
    db.settings.count(), db.periods.count(), db.incomes.count(), db.expenses.count(),
    db.plans.count(), db.goals.count(), db.goal_contributions.count(),
    db.recurrents.count(), db.debts.count(), db.debt_payments.count(), db.fxRates.count(),
  ]);

  return { counts: {
    settings: cs, periods: cp, incomes: ci, expenses: ce, plans: cpl, goals: cg, goal_contributions: cgc,
    recurrents: cr, debts: cd, debt_payments: cdp, fxRates: cfr,
  }};
}

function validateCategoryReferences(data: Pick<DumpV6T, 'incomes'|'expenses'|'plans'|'recurrents'>, categories: import('../domain/models').Category[]) {
 const map=new Map(categories.map(c=>[c.id,c]));
 const check=(id:string,type:'income'|'expense')=>{const row=map.get(id);if(!row || !appliesTo(row,type))throw new Error('El respaldo contiene una categoría inexistente o incompatible: '+id);};
 data.incomes.forEach(r=>check(r.categoryId,'income'));data.expenses.forEach(r=>check(r.categoryId,'expense'));data.plans.forEach(r=>check(r.categoryId,'expense'));data.recurrents?.forEach(r=>check(r.categoryId,r.direction));
}

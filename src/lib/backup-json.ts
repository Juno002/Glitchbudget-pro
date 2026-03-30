
import { z } from 'zod';
import { db } from '@/lib/db';
import type { Recurring, Debt, DebtPayment, FxRate } from '@/lib/db';

// ---------- Esquema JSON v3 ----------
const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'ISODate');
const ISODateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T.*Z$/,'ISODateTime Z');
const MonthID = z.string().regex(/^\d{4}-\d{2}$/,'MonthID YYYY-MM');
const Id = z.string().min(1);
const MoneyCents = z.number().int().nonnegative();

const SettingsV3 = z.object({
  id: z.literal('general').default('general'),
  currency: z.string().default('DOP'),
  locale: z.string().default('es-DO'),
  theme: z.enum(['light','dark','system','serious']).optional(),
  strictMode: z.boolean().default(false),
  rolloverStrategy: z.enum(['reset','accumulate_surplus','accumulate_debt']).default('reset'),
  baseIncome: z.object({ 
    freq: z.enum(['mensual','quincenal','semanal']).default('mensual'),
    amount: MoneyCents 
  }).default({ freq: 'mensual', amount: 0 }),
  incomeCategories: z.array(z.string()).default([]),
  expenseCategories: z.array(z.string()).default([])
}).passthrough(); // conserva claves futuras sin romper


const PeriodV3 = z.object({
  id: MonthID,
  year: z.number().int().nonnegative(),
  month: z.number().int().min(1).max(12),
  createdAt: ISODateTime
});

const IncomeV3 = z.object({
  id: Id, month: MonthID, date: ISODate, categoryId: Id,
  amount: z.number().int().nonnegative(),
  description: z.string().default('ingreso'),
  currency: z.string().optional(),
  fxRate: z.number().optional(),
  amountBase: z.number().int().optional()
});

const ExpenseV3 = z.object({
  id: Id, month: MonthID, date: ISODate, categoryId: Id,
  amount: z.number().int().nonnegative(),
  concept: z.string().optional(),
  currency: z.string().optional(),
  fxRate: z.number().optional(),
  amountBase: z.number().int().optional(),
  paymentMethod: z.enum(['cash', 'credit']).optional(),
  debtId: z.string().optional()
});

const PlanV3 = z.object({
  month: MonthID, categoryId: Id,
  limit: z.number().int().nonnegative()
});

const GoalV3 = z.object({
  id: Id, name: z.string(),
  target: z.number().int().nonnegative(),
  saved: z.number().int().nonnegative().default(0),
  startDate: ISODate,
  date: ISODate.optional(),
  status: z.enum(['active','completed']).default('active')
});

const GoalContribV3 = z.object({
  id: Id, goalId: Id,
  amount: z.number().int().nonnegative(),
  date: ISODate
});

const RecurrentV3 = z.custom<Recurring>();
const DebtV3 = z.custom<Debt>();
const DebtPaymentV3 = z.custom<DebtPayment>();
const FxRateV3 = z.custom<FxRate>();

const DumpV3 = z.object({
  v: z.literal(3),
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
type DumpV3T = z.infer<typeof DumpV3>;

// ---------- Helpers ----------
const toCents = (n: number) => Math.round(n);
const nowIsoZ = () => new Date().toISOString();

function uniq<T>(arr: T[]) { return Array.from(new Set(arr)); }

export async function exportDataJSON(): Promise<string> {
  // Lee todo de Dexie
  const [settings, periods, incomes, expenses, plans, goals, goalContributions, recurrents, debts, debtPayments, fxRates] = await Promise.all([
    db.settings.get('general').then(s => s ?? { id:'general', currency:'DOP', locale:'es-DO', theme: 'dark', strictMode: false, rolloverStrategy: 'reset', expenseCategories: [], incomeCategories: [], baseIncome: {freq: 'mensual', amount: 0} }),
    db.periods.toArray(),
    db.incomes.toArray(),
    db.expenses.toArray(),
    db.plans.toArray(),
    db.goals.toArray(),
    db.goal_contributions.toArray().catch(()=>[]),
    db.recurrents.toArray().catch(()=>[]),
    db.debts.toArray().catch(()=>[]),
    db.debt_payments.toArray().catch(()=>[]),
    db.fxRates.toArray().catch(()=>[]),
  ]);

  // Mapea al contrato v3 (montos ya están en centavos en DB)
  const dump: DumpV3T = {
    v: 3,
    exportedAt: nowIsoZ(),
    settings: {
      id: 'general',
      currency: settings.currency ?? 'DOP',
      locale: settings.locale ?? 'es-DO',
      theme: (settings.theme as ('light' | 'dark' | 'system' | 'serious')) ?? 'system',
      strictMode: settings.strictMode ?? false,
      rolloverStrategy: (settings.rolloverStrategy as ('reset' | 'accumulate_surplus' | 'accumulate_debt')) ?? 'reset',
      baseIncome: { 
        freq: (settings.baseIncome?.freq as ('mensual' | 'quincenal' | 'semanal')) ?? 'mensual',
        amount: Math.max(0, Number(settings.baseIncome?.amount ?? 0))
      },
      incomeCategories: Array.isArray(settings.incomeCategories) ? settings.incomeCategories : [],
      expenseCategories: Array.isArray(settings.expenseCategories) ? settings.expenseCategories : []
    },
    periods: periods.map(p => ({
      id: p.id, year: p.year, month: p.month, createdAt: p.createdAt
    })),
    incomes: incomes.map(i => ({
      id: i.id, month: i.month, date: i.date, categoryId: i.categoryId,
      amount: toCents(i.amount), description: i.description,
      currency: i.currency, fxRate: i.fxRate, amountBase: i.amountBase,
    })),
    expenses: expenses.map(e => ({
      id: e.id, month: e.month, date: e.date, categoryId: e.categoryId,
      amount: toCents(e.amount), concept: e.concept,
      currency: e.currency, fxRate: e.fxRate, amountBase: e.amountBase,
      paymentMethod: e.paymentMethod, debtId: e.debtId,
    })),
    plans: plans.map(p => ({
      month: p.month, categoryId: p.categoryId,
      limit: toCents(p.limit)
    })),
    goals: goals.map(g => ({
      id: g.id, name: g.name,
      target: toCents(g.target), saved: toCents(g.saved ?? 0),
      startDate: g.startDate, date: g.date, status: g.status ?? 'active'
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
  DumpV3.parse(dump);
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
  const d = DumpV3.parse(raw); // si no cumple, explota aquí con un mensaje útil

  // 2) Integridad referencial mínima: periods presentes
  //    Si faltan periods pero los periodId aparecen en incomes/expenses/plans, los creamos.
  const periodIds = uniq([
    ...d.periods.map(p => p.id),
    ...d.incomes.map(i => i.month),
    ...d.expenses.map(e => e.month),
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
    id: 'general',
    currency: d.settings.currency ?? 'DOP',
    locale:   d.settings.locale   ?? 'es-DO',
    theme:    (d.settings.theme as ('light' | 'dark' | 'system' | 'serious')) ?? 'system',
    strictMode: d.settings.strictMode ?? false,
    rolloverStrategy: d.settings.rolloverStrategy ?? 'reset',
    baseIncome: { 
      amount: Math.max(0, Number(d.settings.baseIncome?.amount ?? 0)),
      freq: d.settings.baseIncome?.freq ?? 'mensual',
    },
    incomeCategories:  Array.isArray(d.settings.incomeCategories)  ? d.settings.incomeCategories  : [],
    expenseCategories: Array.isArray(d.settings.expenseCategories) ? d.settings.expenseCategories : []
  };

  const incomes = d.incomes.map(i => ({
    id: i.id, month: i.month, date: i.date, categoryId: i.categoryId,
    amount: i.amount, description: i.description, type: 'extra',
    currency: i.currency, fxRate: i.fxRate, amountBase: i.amountBase,
  }));

  const expenses = d.expenses.map(e => ({
    id: e.id, month: e.month, date: e.date, categoryId: e.categoryId,
    amount: e.amount, concept: e.concept ?? '', type: 'Variable',
    currency: e.currency, fxRate: e.fxRate, amountBase: e.amountBase,
    paymentMethod: e.paymentMethod, debtId: e.debtId,
  }));

  const plans = d.plans.map(p => ({
    month: p.month, categoryId: p.categoryId,
    limit: p.limit
  }));

  const goals = d.goals.map(g => ({
    id: g.id, name: g.name,
    target: g.target, saved: g.saved,
    startDate: g.startDate, date: g.date, status: g.status,
    quota: 0 // quota is not in the backup, so we default to 0
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
      ]);
      await db.settings.put(settingsRow as any);
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

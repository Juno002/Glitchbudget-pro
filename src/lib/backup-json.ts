import { migrateGoalRecords } from '../domain/goals';
import { migrateActualExpense, migrateRecurringRule } from '../domain/actual-planned-migration';
import { recurringRuleSchema } from './recurring-rule-service';
import { plannedOccurrenceSchema, validateOccurrenceLedgerLinks, validatePlannedOccurrenceSet } from './planned-occurrence-service';
import { reconstructCategories, withoutLegacyCategories, appliesTo } from '../domain/categories';
import { categorySchema, validateCategorySet } from './category-service';
import { normalizeFinancialPolicies } from '../policies/settings';
import { accountSchema, legacyAccountSchema, phase11AccountSchema, transferSchema } from './accounts';
import { investmentSchema } from './investments';
import { normalizeCurrencyCode } from '../domain/currency';
import { normalizeTransactionLabels } from '../domain/transaction-metadata';

import { z } from 'zod';
import { validateBudgetPlans } from '../domain/budgets';
import { db } from '@/lib/db';
import { isValidDate } from './finance-calculations';

// ---------- Esquema JSON v3 ----------
const ISODate = z.string().refine(isValidDate, 'Fecha inválida');
const ISODateTime = z.string().datetime();
const MonthID = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/,'Mes inválido');
const Id = z.string().min(1);
const MoneyCents = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const CurrencyCode = z.string().regex(/^[A-Z]{3}$/, 'Moneda inválida');
const TransactionLabels = z.array(z.string().trim().min(1).max(40)).max(12);

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
  periodStartDay: z.number().int().min(1).max(31).optional(),
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

export const PlanV7 = z.object({
  month: z.string().min(1),
  categoryId: Id,
  limit: z.number().int().nonnegative(),
  periodType: z.enum(['weekly','monthly','yearly','one_time']).optional(),
  periodStart: ISODate.optional(),
  periodEnd: ISODate.optional(),
}).refine(plan => {
  const metadata = [plan.periodType, plan.periodStart, plan.periodEnd];
  return metadata.every(value => value === undefined) || metadata.every(value => value !== undefined);
}, 'El período del presupuesto está incompleto.');

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

export const GoalV8 = GoalV3.omit({ saved:true, status:true }).extend({ target:MoneyCents });
export const GoalContribV8 = GoalContribV3.extend({ amount:MoneyCents, kind:z.literal('legacy_balance').optional() });

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
const DebtPaymentV9 = DebtPaymentV3.extend({
  currency: CurrencyCode,
  fxRate: z.number().finite().positive(),
  amountBase: MoneyCents,
});
const FxRateV3 = z.object({
  id: Id, quote: Id, base: Id, rate: z.number().finite().positive(), updatedAt: ISODateTime,
});

const DumpV3 = z.object({
  v: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  categories: z.array(categorySchema).optional(),
  accounts: z.array(legacyAccountSchema).optional(),
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
const DumpV7 = DumpV6.extend({ v:z.literal(7), plans:z.array(PlanV7), plannedOccurrences:z.array(plannedOccurrenceSchema) });
const DumpV8 = DumpV7.extend({ v:z.literal(8), goals:z.array(GoalV8), goalContributions:z.array(GoalContribV8) });
const SettingsV9 = SettingsV3.extend({ currency: CurrencyCode });
const IncomeV9 = IncomeV6.extend({ currency:CurrencyCode, fxRate:z.number().finite().positive(), amountBase:MoneyCents });
const ExpenseV9 = ExpenseV6.extend({ currency:CurrencyCode, fxRate:z.number().finite().positive(), amountBase:MoneyCents });
const DumpV9 = DumpV8.extend({
  v:z.literal(9),
  settings:SettingsV9,
  accounts:z.array(phase11AccountSchema),
  incomes:z.array(IncomeV9),
  expenses:z.array(ExpenseV9),
  debtPayments:z.array(DebtPaymentV9),
});
const DumpV10 = DumpV9.extend({
  v:z.literal(10),
  accounts:z.array(accountSchema),
  investments:z.array(investmentSchema),
});
export const IncomeV11 = IncomeV9.extend({ labels:TransactionLabels.optional() });
export const ExpenseV11 = ExpenseV9.extend({
  necessity:z.enum(['must','need','want']).optional(),
  labels:TransactionLabels.optional(),
});
const DumpV11 = DumpV10.extend({
  v:z.literal(11),
  incomes:z.array(IncomeV11),
  expenses:z.array(ExpenseV11),
});
type DumpV11T = z.infer<typeof DumpV11>;
function parseBackup(raw:unknown) {
 const version=(raw as {v?:number})?.v;
 if (version===11) return DumpV11.parse(raw);
 if (version===10) return DumpV10.parse(raw);
 if (version===9) return {...DumpV9.parse(raw), investments:[]};
 if (version===8) return {...DumpV8.parse(raw), investments:[]};
 if (version===7) return {...DumpV7.parse(raw), investments:[]};
 if (version===6) return {...DumpV6.parse(raw), plannedOccurrences: [], investments:[]};
 const legacy=DumpV3.parse(raw);
 return {...legacy, expenses:legacy.expenses.map(row=>migrateActualExpense({...row,concept:row.concept??''})), recurrents:(legacy.recurrents||[]).map(migrateRecurringRule), plannedOccurrences: [], investments:[]};
}

// ---------- Helpers ----------
const toCents = (n: number) => Math.round(n);
const nowIsoZ = () => new Date().toISOString();

function uniq<T>(arr: T[]) { return Array.from(new Set(arr)); }

export async function exportDataJSON(): Promise<string> {
  // Lee todo de Dexie
  const [settings, periods, incomes, expenses, plans, goals, goalContributions, recurrents, plannedOccurrences, debts, debtPayments, fxRates, accounts, accountTransfers, categories, investments] = await db.transaction('r', db.tables, () => Promise.all([
    db.settings.get('general').then(s => s ?? { id:'general', currency:'DOP', locale:'es-DO', theme: 'dark', strictMode: false, rolloverStrategy: 'reset', periodStartDay: 1, expenseCategories: [], incomeCategories: [], baseIncome: {freq: 'mensual', amount: 0}, savePct: 0, customCategoryIcons: {} }),
    db.periods.toArray(),
    db.incomes.toArray(),
    db.expenses.toArray(),
    db.plans.toArray(),
    db.goals.toArray(),
    db.goal_contributions.toArray(),
    db.recurrents.toArray(),
    db.planned_occurrences.toArray(),
    db.debts.toArray(),
    db.debt_payments.toArray(),
    db.fxRates.toArray(),
    db.accounts.toArray(),
    db.account_transfers.toArray(),
    db.categories.toArray(),
    db.investments.toArray(),
  ]));

  const goalData = migrateGoalRecords(goals, goalContributions);
  const baseCurrency = normalizeCurrencyCode(settings.currency);
  const accountCurrencies = new Map(accounts.map(account => [account.id, normalizeCurrencyCode(account.currency, baseCurrency)]));
  // Current v11 contract adds optional transaction metadata while preserving Phase 12 persistence.
  const dump: DumpV11T = {
    v: 11,
    categories,
    accounts: accounts.map(account => ({ ...account, currency:normalizeCurrencyCode(account.currency, baseCurrency) })), accountTransfers,
    investments,
    exportedAt: nowIsoZ(),
    settings: {
      ...settings,
      savePct: settings.savePct ?? 0,
      id: 'general',
      currency: baseCurrency,
      locale: settings.locale ?? 'es-DO',
      theme: (settings.theme as ('light' | 'dark' | 'system' | 'serious')) ?? 'system',
      strictMode: settings.strictMode ?? false,
      ...normalizeFinancialPolicies(settings),
      rolloverStrategy: (settings.rolloverStrategy as ('reset' | 'accumulate_surplus' | 'accumulate_debt')) ?? 'reset',
      ...(settings.periodStartDay !== undefined ? { periodStartDay: settings.periodStartDay } : {}),
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
      accountId: i.accountId,
      labels: i.labels?.length ? i.labels : undefined,
      currency: accountCurrencies.get(i.accountId || '') || baseCurrency,
      fxRate: 1,
      amountBase: toCents(i.amount),
    })),
    expenses: expenses.map(e => ({
      nature: e.nature,
      id: e.id, month: e.month, date: e.date, categoryId: e.categoryId,
      amount: toCents(e.amount), concept: e.concept,
      accountId: e.accountId,
      currency: accountCurrencies.get(e.accountId || '') || baseCurrency,
      fxRate: 1,
      amountBase: toCents(e.amount),
      paymentMethod: e.paymentMethod, debtId: e.debtId, recurringRuleId: e.recurringRuleId,
      necessity: e.necessity,
      labels: e.labels?.length ? e.labels : undefined,
    })),
    plans: plans.map(p => ({
      month: p.month, categoryId: p.categoryId,
      limit: toCents(p.limit),
      periodType: p.periodType,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
    })),
    goals: goalData.goals.map(g => ({
      quota: g.quota ?? 0,
      id: g.id, name: g.name,
      target: toCents(g.target),
      startDate: g.startDate, date: g.date || undefined,
    })),
    goalContributions: goalData.contributions.map(gc => ({
      id: gc.id, goalId: gc.goalId, amount: toCents(gc.amount), date: gc.date, kind:gc.kind,
    })),
    recurrents,
    plannedOccurrences,
    debts,
    debtPayments: debtPayments.map(payment => ({
      ...payment,
      currency:accountCurrencies.get(payment.accountId || '') || baseCurrency,
      fxRate:1,
      amountBase:toCents(payment.amount),
    })),
    fxRates,
  };

  // Valida antes de entregar
  dump.settings = withoutLegacyCategories(dump.settings);
  validateCategorySet(categories);
  validateCategoryReferences(dump, categories);
  validateBudgetPlans(dump.plans);
  validateOccurrenceLedgerLinks(plannedOccurrences, incomes, expenses, recurrents);
  DumpV11.parse(dump);
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
  validateBudgetPlans(d.plans);

  if (d.v >= 4 && (!d.accounts || !d.accountTransfers)) throw new Error('El respaldo v4 está incompleto: faltan cuentas o transferencias.');
  if(d.v>=5 && !d.categories) throw new Error('El respaldo no contiene categorías.');
  const categories=d.v>=5 ? d.categories! : reconstructCategories({settings:d.settings,incomes:d.incomes,expenses:d.expenses,plans:d.plans,recurrents:d.recurrents.map(r=>({categoryId:r.categoryId,type:r.direction}))});
  validateCategorySet(categories);
  validateCategoryReferences(d, categories);
  const baseCurrency = normalizeCurrencyCode(d.settings.currency);
  const accounts = (d.accounts || []).map(account => ({
    ...account,
    currency: normalizeCurrencyCode('currency' in account ? account.currency : undefined, baseCurrency),
  }));
  if (accounts.some(account => account.currency !== baseCurrency)) {
    throw new Error('Este respaldo contiene cuentas en otra moneda. Fase 11 requiere conversión manual antes de admitirlas.');
  }
  const accountMap = new Map(accounts.map(a => [a.id, a]));
  const investments = d.investments ?? [];
  const investmentAccountIds = new Set<string>();
  for (const investment of investments) {
    const account = accountMap.get(investment.accountId);
    if (!account || account.type !== 'investment') throw new Error('El respaldo contiene una inversión sin su cuenta de inversión.');
    if (investmentAccountIds.has(investment.accountId)) throw new Error('El respaldo contiene varias inversiones para la misma cuenta.');
    investmentAccountIds.add(investment.accountId);
  }
  if (accounts.some(account => account.type === 'investment' && !investmentAccountIds.has(account.id))) {
    throw new Error('El respaldo contiene una cuenta de inversión sin metadatos de inversión.');
  }
  if (accounts.filter(a => a.isDefaultCash).length > 1) throw new Error('El respaldo contiene varias cuentas de efectivo predeterminadas.');
  for (const row of [...d.incomes, ...d.expenses, ...(d.debtPayments || [])]) {
    if (row.accountId && (!accountMap.has(row.accountId) || row.date.slice(0,10) < accountMap.get(row.accountId)!.startDate)) throw new Error('El respaldo contiene una cuenta desconocida o un movimiento anterior a su saldo inicial.');
    if (row.accountId && accountMap.get(row.accountId)!.type === 'investment') throw new Error('El respaldo usa una inversión como cuenta operativa.');
  }
  for (const rule of d.recurrents || []) {
    if (rule.defaultAccountId && !accountMap.has(rule.defaultAccountId)) {
      throw new Error('El respaldo contiene una regla recurrente con cuenta predeterminada desconocida.');
    }
  }
  for (const transfer of d.accountTransfers || []) {
    for (const id of [transfer.fromAccountId, transfer.toAccountId]) {
      if (!accountMap.has(id) || transfer.date < accountMap.get(id)!.startDate) throw new Error('El respaldo contiene una transferencia con cuentas o fechas inválidas.');
    }
    const fromAccount = accountMap.get(transfer.fromAccountId)!;
    const toAccount = accountMap.get(transfer.toAccountId)!;
    if (fromAccount.currency !== toAccount.currency) {
      throw new Error('El respaldo contiene una transferencia entre monedas sin una conversión manual compatible.');
    }
    if (fromAccount.type === 'investment') {
      throw new Error('El respaldo contiene un retiro de inversión que no pertenece a Investments 1.0.');
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
    ...d.plans.map(p => p.month).filter(id => /^\d{4}-\d{2}$/.test(id))
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
    currency: baseCurrency,
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
    accountId: i.accountId,
    currency: i.accountId ? accountMap.get(i.accountId)!.currency : baseCurrency,
    fxRate: 1,
    amountBase: i.amount,
    labels: 'labels' in i && i.labels ? normalizeTransactionLabels(i.labels) : undefined,
  }));

  const expenses = d.expenses.map(e => ({
    id: e.id, month: e.date.slice(0, 7), date: e.date, categoryId: e.categoryId,
    amount: e.amount, concept: e.concept ?? '', nature: e.nature,
    accountId: e.accountId,
    currency: e.accountId ? accountMap.get(e.accountId)!.currency : baseCurrency,
    fxRate: 1,
    amountBase: e.amount,
    paymentMethod: e.paymentMethod, debtId: e.debtId, recurringRuleId: e.recurringRuleId,
    necessity: 'necessity' in e ? e.necessity : undefined,
    labels: 'labels' in e && e.labels ? normalizeTransactionLabels(e.labels) : undefined,
  }));

  const plans = d.plans.map(p => ({
    month: p.month,
    categoryId: p.categoryId,
    limit: p.limit,
    periodType: 'periodType' in p ? p.periodType : undefined,
    periodStart: 'periodStart' in p ? p.periodStart : undefined,
    periodEnd: 'periodEnd' in p ? p.periodEnd : undefined,
  }));

  const goalData = migrateGoalRecords(d.goals, d.goalContributions);
  const goals = goalData.goals;
  const goal_contributions = goalData.contributions;

  const recurrents = d.recurrents ?? [];
  const plannedOccurrences = d.plannedOccurrences ?? [];
  validateOccurrenceLedgerLinks(plannedOccurrences, incomes, expenses, recurrents);
  const debts = d.debts ?? [];
  const debtPayments = (d.debtPayments ?? []).map(payment => ({
    ...payment,
    currency: payment.accountId ? accountMap.get(payment.accountId)!.currency : baseCurrency,
    fxRate: 1,
    amountBase: payment.amount,
  }));
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
        db.planned_occurrences.clear(),
        db.debts.clear(),
        db.debt_payments.clear(),
        db.fxRates.clear(),
        db.accounts.clear(),
        db.account_transfers.clear(),
        db.investments.clear(),
      ]);
      await db.settings.put(withoutLegacyCategories(settingsRow) as any);
      if(categories.length) await db.categories.bulkAdd(categories);
      if (accounts.length) await db.accounts.bulkAdd(accounts);
      if (d.accountTransfers?.length) await db.account_transfers.bulkAdd(d.accountTransfers);
      if (investments.length) await db.investments.bulkAdd(investments);
      if (periodsEnsured.length) await db.periods.bulkAdd(periodsEnsured as any);
      if (incomes.length) await db.incomes.bulkAdd(incomes as any);
      if (expenses.length) await db.expenses.bulkAdd(expenses as any);
      if (plans.length) await db.plans.bulkPut(plans as any);
      if (goals.length) await db.goals.bulkAdd(goals as any);
      if (goal_contributions.length) await db.goal_contributions.bulkAdd(goal_contributions as any);
      if (recurrents.length) await db.recurrents.bulkAdd(recurrents as any);
      if (plannedOccurrences.length) await db.planned_occurrences.bulkAdd(plannedOccurrences as any);
      if (debts.length) await db.debts.bulkAdd(debts as any);
      if (debtPayments.length) await db.debt_payments.bulkAdd(debtPayments as any);
      if (fxRates.length) await db.fxRates.bulkAdd(fxRates as any);
    }
  );

  // 5) Conteo post-import (para logs o toasts)
  const [cs, cp, ci, ce, cpl, cg, cgc, cr, cpo, cd, cdp, cfr, cinv] = await Promise.all([
    db.settings.count(), db.periods.count(), db.incomes.count(), db.expenses.count(),
    db.plans.count(), db.goals.count(), db.goal_contributions.count(),
    db.recurrents.count(), db.planned_occurrences.count(), db.debts.count(), db.debt_payments.count(), db.fxRates.count(), db.investments.count(),
  ]);

  return { counts: {
    settings: cs, periods: cp, incomes: ci, expenses: ce, plans: cpl, goals: cg, goal_contributions: cgc,
    recurrents: cr, planned_occurrences: cpo, debts: cd, debt_payments: cdp, fxRates: cfr, investments:cinv,
  }};
}

function validateCategoryReferences(data: {
  incomes: Array<{ categoryId:string }>;
  expenses: Array<{ categoryId:string }>;
  plans: Array<{ categoryId:string }>;
  recurrents?: Array<{ categoryId:string; direction:'income'|'expense' }>;
}, categories: import('../domain/models').Category[]) {
 const map=new Map(categories.map(c=>[c.id,c]));
 const check=(id:string,type:'income'|'expense')=>{const row=map.get(id);if(!row || !appliesTo(row,type))throw new Error('El respaldo contiene una categoría inexistente o incompatible: '+id);};
 data.incomes.forEach(r=>check(r.categoryId,'income'));data.expenses.forEach(r=>check(r.categoryId,'expense'));data.plans.forEach(r=>check(r.categoryId,'expense'));data.recurrents?.forEach(r=>check(r.categoryId,r.direction));
}

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
import { normalizeFinancialDate } from './financial-date';
import { classifyDebtPaymentIntegrity, type RawDebtPayment } from '../domain/data-integrity';
import { decodePreservedValue, encodePreservedValue, encodedPreservedValueSchema, type EncodedPreservedValue } from './preserved-value';
import {
  exportLocalAutomation,
  normalizeLocalAutomationBackup,
  replaceLocalAutomation,
  type LocalAutomationBackup,
  type LocalAutomationStorage,
} from './local-automation';

import { z } from 'zod';
import { validateBudgetPlans } from '../domain/budgets';
import { db, CURRENT_DB_SCHEMA_VERSION } from '@/lib/db';
import packageInfo from '../../package.json';
import { isValidDate } from './finance-calculations';
import { BACKUP_TABLE_COVERAGE, assertBackupTableCoverage } from './backup-table-coverage';

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
const DebtPaymentV14 = DebtPaymentV9.extend({ date: ISODate });
const PreservedDebtPaymentV14 = z.object({
  id: Id,
  row: encodedPreservedValueSchema,
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
const LocalAutomationV12 = z.object({
  templates:z.array(z.unknown()).max(30),
  savedFilters:z.array(z.unknown()).max(20),
  rules:z.array(z.unknown()).max(50),
});
const DumpV12 = DumpV11.extend({
  v:z.literal(12),
  localAutomation:LocalAutomationV12,
});
export const CURRENT_BACKUP_FORMAT_VERSION = 14;
export const CURRENT_APP_VERSION = packageInfo.version;
const DumpV13 = DumpV12.extend({
  v:z.literal(13),
  schemaVersion:z.number().int().positive(),
  appVersion:z.string().trim().min(1),
  categories:z.array(categorySchema),
  accounts:z.array(accountSchema),
  accountTransfers:z.array(transferSchema),
  recurrents:z.array(recurringRuleSchema),
  debts:z.array(DebtV3),
  debtPayments:z.array(DebtPaymentV9),
  fxRates:z.array(FxRateV3),
});
const DumpV14 = DumpV13.extend({
  v:z.literal(CURRENT_BACKUP_FORMAT_VERSION),
  debtPayments:z.array(DebtPaymentV14),
  preservedDebtPayments:z.array(PreservedDebtPaymentV14),
});
type DumpV14T = z.infer<typeof DumpV14>;

function requireCompatibleSchema<T extends { schemaVersion:number }>(parsed:T):T {
  if (parsed.schemaVersion > CURRENT_DB_SCHEMA_VERSION) {
    throw new Error('Este respaldo requiere una versión más reciente del esquema de Prisma.');
  }
  return parsed;
}

function parseBackup(raw:unknown) {
 const version=(raw as {v?:unknown})?.v;
 if (!Number.isInteger(version)) throw new Error('El archivo no contiene una versión de respaldo válida.');
 if ((version as number) > CURRENT_BACKUP_FORMAT_VERSION) {
   throw new Error('Esta copia requiere una versión más reciente de Prisma.');
 }
 if (version===CURRENT_BACKUP_FORMAT_VERSION) return requireCompatibleSchema(DumpV14.parse(raw));
 if (version===13) return requireCompatibleSchema(DumpV13.parse(raw));
 if (version===12) return DumpV12.parse(raw);
 if (version===11) return DumpV11.parse(raw);
 if (version===10) return DumpV10.parse(raw);
 if (version===9) return {...DumpV9.parse(raw), investments:[]};
 if (version===8) return {...DumpV8.parse(raw), investments:[]};
 if (version===7) return {...DumpV7.parse(raw), investments:[]};
 if (version===6) return {...DumpV6.parse(raw), plannedOccurrences: [], investments:[]};
 if (version===3 || version===4 || version===5) {
   const legacy=DumpV3.parse(raw);
   return {...legacy, expenses:legacy.expenses.map(row=>migrateActualExpense({...row,concept:row.concept??''})), recurrents:(legacy.recurrents||[]).map(migrateRecurringRule), plannedOccurrences: [], investments:[]};
 }
 throw new Error('La versión de esta copia no es compatible con Prisma.');
}

// ---------- Helpers ----------
const toCents = (n: number) => Math.round(n);
const nowIsoZ = () => new Date().toISOString();

function uniq<T>(arr: T[]) { return Array.from(new Set(arr)); }

function browserAutomationStorage(): LocalAutomationStorage | undefined {
  return typeof window !== 'undefined' ? window.localStorage : undefined;
}

const EMPTY_LOCAL_AUTOMATION: LocalAutomationBackup = {
  templates: [],
  savedFilters: [],
  rules: [],
};

export async function exportDataJSON(
  storage: LocalAutomationStorage | undefined = browserAutomationStorage(),
): Promise<string> {
  assertBackupTableCoverage(db.tables.map(table => table.name));
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
  const paymentIntegrity = classifyDebtPaymentIntegrity(
    debtPayments as unknown as RawDebtPayment[],
    debts,
    accounts,
  );
  // Backup v14 keeps valid payments strict and quarantined rows lossless.
  const dump: DumpV14T = {
    v: CURRENT_BACKUP_FORMAT_VERSION,
    schemaVersion: CURRENT_DB_SCHEMA_VERSION,
    appVersion: CURRENT_APP_VERSION,
    localAutomation: storage ? exportLocalAutomation(storage) : EMPTY_LOCAL_AUTOMATION,
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
    debtPayments: paymentIntegrity.valid.map(payment => ({
      ...payment,
      date:payment.date,
      currency:accountCurrencies.get(payment.accountId || '') || baseCurrency,
      fxRate:1,
      amountBase:toCents(payment.amount),
    })),
    preservedDebtPayments: paymentIntegrity.quarantined.map(({ payment }) => ({
      id: payment.id,
      row: encodePreservedValue(payment),
    })),
    fxRates,
  };

  // Valida antes de entregar
  dump.settings = withoutLegacyCategories(dump.settings);
  validateCategorySet(categories);
  validateCategoryReferences(dump, categories);
  validateBudgetPlans(dump.plans);
  validateOccurrenceLedgerLinks(plannedOccurrences, incomes, expenses, recurrents);
  DumpV14.parse(dump);
  return JSON.stringify(dump, null, 2);
}

export async function downloadExportJSON() {
  const s = await exportDataJSON();
  const blob = new Blob([s], { type:'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `prisma-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export type BackupImportPreview = {
  formatVersion: number;
  schemaVersion?: number;
  appVersion?: string;
  exportedAt: string;
  accounts: number;
  transactions: number;
  budgets: number;
  goals: number;
  cards: number;
  investments: number;
};

function decodePreservedDebtPayment(entry: { id:string; row:EncodedPreservedValue }): RawDebtPayment {
  const decoded = decodePreservedValue(entry.row);
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
    throw new Error('La copia contiene un pago preservado con una estructura inválida.');
  }
  const row = decoded as Record<string, unknown>;
  if (row.id !== entry.id) {
    throw new Error('La copia contiene un pago preservado cuyo ID no coincide.');
  }
  if (typeof row.date === 'string') {
    try {
      row.date = normalizeFinancialDate(row.date);
    } catch {
      // Keep the exact original string when it still cannot be normalized.
    }
  }
  return row as unknown as RawDebtPayment;
}

type PreparedBackupImport = {
  d: any;
  importedAutomation: LocalAutomationBackup | null;
  categories: any[];
  accounts: any[];
  investments: any[];
  periodsEnsured: any[];
  settingsRow: any;
  incomes: any[];
  expenses: any[];
  plans: any[];
  goals: any[];
  goalContributions: any[];
  recurrents: any[];
  plannedOccurrences: any[];
  debts: any[];
  debtPayments: any[];
  fxRates: any[];
  preview: BackupImportPreview;
};

function prepareDataJSONImport(
  text: string,
  storage: LocalAutomationStorage | undefined,
): PreparedBackupImport {
  assertBackupTableCoverage(db.tables.map(table => table.name));

  const raw = JSON.parse(text);
  const d = parseBackup(raw);
  const importedAutomation = d.v >= 12 && 'localAutomation' in d
    ? normalizeLocalAutomationBackup(d.localAutomation)
    : null;

  if (importedAutomation && !storage && (
    importedAutomation.templates.length
    || importedAutomation.savedFilters.length
    || importedAutomation.rules.length
  )) {
    throw new Error('Este respaldo incluye automatización local, pero el almacenamiento local no está disponible.');
  }

  validateBudgetPlans(d.plans);
  if (d.v >= 4 && (!d.accounts || !d.accountTransfers)) {
    throw new Error('El respaldo v4 está incompleto: faltan cuentas o transferencias.');
  }
  if (d.v >= 5 && !d.categories) throw new Error('El respaldo no contiene categorías.');

  const categories = d.v >= 5
    ? d.categories!
    : reconstructCategories({
      settings:d.settings,
      incomes:d.incomes,
      expenses:d.expenses,
      plans:d.plans,
      recurrents:d.recurrents.map((rule:any) => ({ categoryId:rule.categoryId, type:rule.direction })),
    });
  validateCategorySet(categories);
  validateCategoryReferences(d, categories);

  const baseCurrency = normalizeCurrencyCode(d.settings.currency);
  const accounts = (d.accounts || []).map((account:any) => ({
    ...account,
    currency: normalizeCurrencyCode('currency' in account ? account.currency : undefined, baseCurrency),
  }));
  if (accounts.some((account:any) => account.currency !== baseCurrency)) {
    throw new Error('Este respaldo contiene cuentas en otra moneda. Fase 11 requiere conversión manual antes de admitirlas.');
  }

  const accountMap = new Map<string, any>(accounts.map((account:any) => [account.id, account]));
  const investments = d.investments ?? [];
  const investmentAccountIds = new Set<string>();
  for (const investment of investments) {
    const account = accountMap.get(investment.accountId);
    if (!account || account.type !== 'investment') {
      throw new Error('El respaldo contiene una inversión sin su cuenta de inversión.');
    }
    if (investmentAccountIds.has(investment.accountId)) {
      throw new Error('El respaldo contiene varias inversiones para la misma cuenta.');
    }
    investmentAccountIds.add(investment.accountId);
  }
  if (accounts.some((account:any) => account.type === 'investment' && !investmentAccountIds.has(account.id))) {
    throw new Error('El respaldo contiene una cuenta de inversión sin metadatos de inversión.');
  }
  if (accounts.filter((account:any) => account.isDefaultCash).length > 1) {
    throw new Error('El respaldo contiene varias cuentas de efectivo predeterminadas.');
  }

  const normalizedDebtPayments = (d.debtPayments || []).map((payment:any) => ({
    ...payment,
    date: normalizeFinancialDate(payment.date),
  }));
  const preservedEntries = d.v >= 14 && 'preservedDebtPayments' in d
    ? d.preservedDebtPayments as Array<{ id:string; row:EncodedPreservedValue }>
    : [];
  const seenPaymentIds = new Set(normalizedDebtPayments.map((payment:any) => payment.id));
  for (const entry of preservedEntries) {
    if (seenPaymentIds.has(entry.id)) {
      throw new Error('La copia contiene IDs de pago duplicados entre registros válidos y preservados.');
    }
    seenPaymentIds.add(entry.id);
  }
  const restoredPreservedDebtPayments = preservedEntries.map(decodePreservedDebtPayment);

  for (const row of [...d.incomes, ...d.expenses, ...normalizedDebtPayments]) {
    const account = row.accountId ? accountMap.get(row.accountId) : undefined;
    if (row.accountId && (!account || row.date < account.startDate)) {
      throw new Error('El respaldo contiene una cuenta desconocida o un movimiento anterior a su saldo inicial.');
    }
    if (account?.type === 'investment') {
      throw new Error('El respaldo usa una inversión como cuenta operativa.');
    }
  }

  for (const rule of d.recurrents || []) {
    if (rule.defaultAccountId && !accountMap.has(rule.defaultAccountId)) {
      throw new Error('El respaldo contiene una regla recurrente con cuenta predeterminada desconocida.');
    }
  }

  for (const transfer of d.accountTransfers || []) {
    for (const id of [transfer.fromAccountId, transfer.toAccountId]) {
      const account = accountMap.get(id);
      if (!account || transfer.date < account.startDate) {
        throw new Error('El respaldo contiene una transferencia con cuentas o fechas inválidas.');
      }
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

  const goalIds = new Set(d.goals.map((goal:any) => goal.id));
  const debtIds = new Set((d.debts || []).map((debt:any) => debt.id));
  if (d.goalContributions.some((contribution:any) => !goalIds.has(contribution.goalId))) {
    throw new Error('El respaldo contiene aportes a metas inexistentes.');
  }
  if (normalizedDebtPayments.some((payment:any) => !debtIds.has(payment.debtId))) {
    throw new Error('El respaldo contiene pagos de tarjetas inexistentes.');
  }
  if (d.expenses.some((expense:any) => (
    expense.paymentMethod === 'credit' && (!expense.debtId || !debtIds.has(expense.debtId))
  ))) {
    throw new Error('El respaldo contiene gastos vinculados a tarjetas inexistentes.');
  }

  const periodIds = uniq([
    ...d.periods.map((period:any) => period.id),
    ...d.incomes.map((income:any) => income.date.slice(0, 7)),
    ...d.expenses.map((expense:any) => expense.date.slice(0, 7)),
    ...d.plans.map((plan:any) => plan.month).filter((id:string) => /^\d{4}-\d{2}$/.test(id)),
  ]);
  const periodsEnsured = periodIds.map(id => {
    const found = d.periods.find((period:any) => period.id === id);
    if (found) return found;
    const [year, month] = id.split('-').map((value:string) => parseInt(value, 10));
    return { id, year, month, createdAt: nowIsoZ() };
  });

  const settingsRow = {
    ...d.settings,
    id: 'general',
    currency: baseCurrency,
    locale: d.settings.locale ?? 'es-DO',
    theme: (d.settings.theme as ('light' | 'dark' | 'system' | 'serious')) ?? 'system',
    strictMode: d.settings.strictMode ?? false,
    ...normalizeFinancialPolicies(d.settings),
    rolloverStrategy: d.settings.rolloverStrategy ?? 'reset',
    baseIncome: {
      amount: Math.max(0, Number(d.settings.baseIncome?.amount ?? 0)),
      freq: d.settings.baseIncome?.freq ?? 'mensual',
    },
    incomeCategories: Array.isArray(d.settings.incomeCategories) ? d.settings.incomeCategories : [],
    expenseCategories: Array.isArray(d.settings.expenseCategories) ? d.settings.expenseCategories : [],
  };

  const incomes = d.incomes.map((income:any) => ({
    id: income.id,
    month: income.date.slice(0, 7),
    date: income.date,
    categoryId: income.categoryId,
    amount: income.amount,
    description: income.description,
    type: income.type,
    recurringRuleId: 'recurringRuleId' in income ? income.recurringRuleId : undefined,
    accountId: income.accountId,
    currency: income.accountId ? accountMap.get(income.accountId)!.currency : baseCurrency,
    fxRate: 1,
    amountBase: income.amount,
    labels: 'labels' in income && income.labels ? normalizeTransactionLabels(income.labels) : undefined,
  }));

  const expenses = d.expenses.map((expense:any) => ({
    id: expense.id,
    month: expense.date.slice(0, 7),
    date: expense.date,
    categoryId: expense.categoryId,
    amount: expense.amount,
    concept: expense.concept ?? '',
    nature: expense.nature,
    accountId: expense.accountId,
    currency: expense.accountId ? accountMap.get(expense.accountId)!.currency : baseCurrency,
    fxRate: 1,
    amountBase: expense.amount,
    paymentMethod: expense.paymentMethod,
    debtId: expense.debtId,
    recurringRuleId: expense.recurringRuleId,
    necessity: 'necessity' in expense ? expense.necessity : undefined,
    labels: 'labels' in expense && expense.labels ? normalizeTransactionLabels(expense.labels) : undefined,
  }));

  const plans = d.plans.map((plan:any) => ({
    month: plan.month,
    categoryId: plan.categoryId,
    limit: plan.limit,
    periodType: 'periodType' in plan ? plan.periodType : undefined,
    periodStart: 'periodStart' in plan ? plan.periodStart : undefined,
    periodEnd: 'periodEnd' in plan ? plan.periodEnd : undefined,
  }));

  const goalData = migrateGoalRecords(d.goals, d.goalContributions);
  const goals = goalData.goals;
  const goalContributions = goalData.contributions;
  const recurrents = d.recurrents ?? [];
  const plannedOccurrences = d.plannedOccurrences ?? [];
  validateOccurrenceLedgerLinks(plannedOccurrences, incomes, expenses, recurrents);

  const debts = d.debts ?? [];
  const strictDebtPayments = normalizedDebtPayments.map((payment:any) => ({
    ...payment,
    currency: payment.accountId ? accountMap.get(payment.accountId)!.currency : baseCurrency,
    fxRate: 1,
    amountBase: payment.amount,
  }));
  const debtPayments = [...strictDebtPayments, ...restoredPreservedDebtPayments];
  const fxRates = d.fxRates ?? [];

  const preview: BackupImportPreview = {
    formatVersion: d.v,
    schemaVersion: 'schemaVersion' in d ? d.schemaVersion : undefined,
    appVersion: 'appVersion' in d ? d.appVersion : undefined,
    exportedAt: d.exportedAt,
    accounts: accounts.length,
    transactions: d.incomes.length
      + d.expenses.length
      + (d.debtPayments?.length ?? 0)
      + preservedEntries.length
      + (d.accountTransfers?.length ?? 0),
    budgets: plans.length,
    goals: goals.length,
    cards: debts.length,
    investments: investments.length,
  };

  return {
    d,
    importedAutomation,
    categories,
    accounts,
    investments,
    periodsEnsured,
    settingsRow,
    incomes,
    expenses,
    plans,
    goals,
    goalContributions,
    recurrents,
    plannedOccurrences,
    debts,
    debtPayments,
    fxRates,
    preview,
  };
}

export function previewDataJSON(
  text: string,
  storage: LocalAutomationStorage | undefined = browserAutomationStorage(),
): BackupImportPreview {
  return prepareDataJSONImport(text, storage).preview;
}

export type BackupImportOptions = {
  beforeWrite?: () => Promise<void>;
};

export async function importDataJSON(
  text: string,
  storage: LocalAutomationStorage | undefined = browserAutomationStorage(),
  options: BackupImportOptions = {},
): Promise<{ counts: Record<string, number> }> {
  const prepared = prepareDataJSONImport(text, storage);
  if (options.beforeWrite) await options.beforeWrite();
  const {
    d,
    importedAutomation,
    categories,
    accounts,
    investments,
    periodsEnsured,
    settingsRow,
    incomes,
    expenses,
    plans,
    goals,
    goalContributions,
    recurrents,
    plannedOccurrences,
    debts,
    debtPayments,
    fxRates,
  } = prepared;

  const previousAutomation = importedAutomation && storage ? exportLocalAutomation(storage) : null;
  if (importedAutomation && storage) replaceLocalAutomation(storage, importedAutomation);

  try {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(
        BACKUP_TABLE_COVERAGE.map(entry => db.table(entry.table).clear()),
      );
      await db.settings.put(withoutLegacyCategories(settingsRow) as any);
      if (categories.length) await db.categories.bulkAdd(categories);
      if (accounts.length) await db.accounts.bulkAdd(accounts);
      if (d.accountTransfers?.length) await db.account_transfers.bulkAdd(d.accountTransfers);
      if (investments.length) await db.investments.bulkAdd(investments);
      if (periodsEnsured.length) await db.periods.bulkAdd(periodsEnsured as any);
      if (incomes.length) await db.incomes.bulkAdd(incomes as any);
      if (expenses.length) await db.expenses.bulkAdd(expenses as any);
      if (plans.length) await db.plans.bulkPut(plans as any);
      if (goals.length) await db.goals.bulkAdd(goals as any);
      if (goalContributions.length) await db.goal_contributions.bulkAdd(goalContributions as any);
      if (recurrents.length) await db.recurrents.bulkAdd(recurrents as any);
      if (plannedOccurrences.length) await db.planned_occurrences.bulkAdd(plannedOccurrences as any);
      if (debts.length) await db.debts.bulkAdd(debts as any);
      if (debtPayments.length) await db.debt_payments.bulkAdd(debtPayments as any);
      if (fxRates.length) await db.fxRates.bulkAdd(fxRates as any);
    });
  } catch (error) {
    if (previousAutomation && storage) replaceLocalAutomation(storage, previousAutomation);
    throw error;
  }

  const tableCounts = Object.fromEntries(await Promise.all(
    BACKUP_TABLE_COVERAGE.map(async entry => [entry.table, await db.table(entry.table).count()] as const),
  ));
  const automationCounts = storage ? exportLocalAutomation(storage) : EMPTY_LOCAL_AUTOMATION;

  return {
    counts: {
      ...tableCounts,
      templates: automationCounts.templates.length,
      savedFilters: automationCounts.savedFilters.length,
      rules: automationCounts.rules.length,
    },
  };
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


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
  // Backup v14 keeps valid payments strict and preserves quarantined rows separately.
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

type PreparedBackupImport = {
  d: any;
  importedAutomation: LocalAutomationBackup | null;
  categories: any[];
  accounts: any[];
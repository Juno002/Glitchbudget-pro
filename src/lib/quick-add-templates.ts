import { normalizeNecessity, normalizeTransactionLabels } from '../domain/transaction-metadata';
export type QuickAddTransactionType = 'expense' | 'income' | 'transfer';

export type QuickAddTemplate = {
  id: string;
  name: string;
  type: QuickAddTransactionType;
  amount: string;
  accountId?: string;
  toAccountId?: string;
  categoryId?: string;
  concept?: string;
  expenseSubtype?: 'Fijo' | 'Variable' | 'Ocasional';
  incomeSubtype?: 'extra' | 'gift';
  paymentMethod?: 'cash' | 'credit';
  debtId?: string;
  transferNote?: string;
  necessity?: 'must' | 'need' | 'want';
  labels?: string[];
};

type TemplateStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const QUICK_ADD_TEMPLATES_KEY = 'glitchbudget_quick_add_templates_v1';

function cleanString(value: unknown, max = 250) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function normalizeQuickAddTemplate(value: unknown): QuickAddTemplate | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<QuickAddTemplate>;
  if (!raw.id || !raw.name || !['expense','income','transfer'].includes(String(raw.type))) return null;
  const amount = String(raw.amount ?? '');
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return null;

  return {
    id: cleanString(raw.id, 100),
    name: cleanString(raw.name, 80),
    type: raw.type as QuickAddTransactionType,
    amount,
    accountId: cleanString(raw.accountId, 100) || undefined,
    toAccountId: cleanString(raw.toAccountId, 100) || undefined,
    categoryId: cleanString(raw.categoryId, 100) || undefined,
    concept: cleanString(raw.concept) || undefined,
    expenseSubtype: ['Fijo','Variable','Ocasional'].includes(String(raw.expenseSubtype))
      ? raw.expenseSubtype as QuickAddTemplate['expenseSubtype'] : undefined,
    incomeSubtype: ['extra','gift'].includes(String(raw.incomeSubtype))
      ? raw.incomeSubtype as QuickAddTemplate['incomeSubtype'] : undefined,
    paymentMethod: ['cash','credit'].includes(String(raw.paymentMethod))
      ? raw.paymentMethod as QuickAddTemplate['paymentMethod'] : undefined,
    debtId: cleanString(raw.debtId, 100) || undefined,
    transferNote: cleanString(raw.transferNote) || undefined,
    necessity: raw.type === 'expense' ? normalizeNecessity(raw.necessity) : undefined,
    labels: raw.type === 'transfer' ? undefined : normalizeTransactionLabels(raw.labels),
  };
}

export function loadQuickAddTemplates(storage: TemplateStorage): QuickAddTemplate[] {
  try {
    const parsed = JSON.parse(storage.getItem(QUICK_ADD_TEMPLATES_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeQuickAddTemplate).filter((item): item is QuickAddTemplate => !!item).slice(0, 30);
  } catch {
    return [];
  }
}

export function writeQuickAddTemplates(storage: TemplateStorage, templates: readonly QuickAddTemplate[]) {
  const ids = new Set<string>();
  const normalized: QuickAddTemplate[] = [];
  for (const candidate of templates) {
    const template = normalizeQuickAddTemplate(candidate);
    if (!template || ids.has(template.id)) continue;
    ids.add(template.id);
    normalized.push(template);
    if (normalized.length >= 30) break;
  }
  storage.setItem(QUICK_ADD_TEMPLATES_KEY, JSON.stringify(normalized));
  return normalized;
}

export function upsertQuickAddTemplate(storage: TemplateStorage, template: QuickAddTemplate): QuickAddTemplate[] {
  const normalized = normalizeQuickAddTemplate(template);
  if (!normalized) throw new Error('La plantilla no contiene un monto o nombre válido.');
  const next = [normalized, ...loadQuickAddTemplates(storage).filter(item => item.id !== normalized.id)].slice(0, 30);
  writeQuickAddTemplates(storage, next);
  return next;
}

export function removeQuickAddTemplate(storage: TemplateStorage, id: string): QuickAddTemplate[] {
  const next = loadQuickAddTemplates(storage).filter(item => item.id !== id);
  writeQuickAddTemplates(storage, next);
  return next;
}

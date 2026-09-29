import {
  QUICK_ADD_TEMPLATES_KEY,
  QUICK_ADD_TEMPLATES_MAX,
  loadQuickAddTemplates,
  normalizeQuickAddTemplate,
  writeQuickAddTemplates,
  type QuickAddTemplate,
} from './quick-add-templates';
import {
  SAVED_TRANSACTION_FILTERS_KEY,
  SAVED_TRANSACTION_FILTERS_MAX,
  loadSavedTransactionFilters,
  normalizeSavedTransactionFilter,
  writeSavedTransactionFilters,
  type SavedTransactionFilter,
} from './saved-transaction-filters';
import {
  TRANSACTION_RULES_KEY,
  TRANSACTION_RULES_MAX,
  loadTransactionRules,
  normalizeTransactionRules,
  writeTransactionRules,
} from './transaction-rules';
import type { TransactionRule } from '../domain/rules';

export type LocalAutomationStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const LOCAL_AUTOMATION_LAYERS = [
  {
    id: 'templates',
    title: 'Templates',
    location: 'Quick Add',
    description: 'Reutilizan datos de un movimiento frecuente sin crear movimientos por sí solas.',
  },
  {
    id: 'saved_filters',
    title: 'Saved filters',
    location: 'Movimientos',
    description: 'Recuperan vistas de búsqueda y filtros; nunca clasifican ni modifican movimientos.',
  },
  {
    id: 'rules',
    title: 'Rules',
    location: 'Ajustes → Automatización',
    description: 'Clasifican localmente; por defecto sugieren y solo autoaplican cuando una Rule lo habilita explícitamente.',
  },
] as const;

export type LocalAutomationSummary = {
  templates: number;
  savedFilters: number;
  rules: number;
};

export type LocalAutomationBackup = {
  templates: QuickAddTemplate[];
  savedFilters: SavedTransactionFilter[];
  rules: TransactionRule[];
};

const AUTOMATION_KEYS = [
  QUICK_ADD_TEMPLATES_KEY,
  SAVED_TRANSACTION_FILTERS_KEY,
  TRANSACTION_RULES_KEY,
] as const;

function requireArray(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value)) throw new Error(`El respaldo local de ${label} no es válido.`);
  if (value.length > max) throw new Error(`El respaldo local de ${label} supera el límite permitido.`);
  return value;
}

function requireUniqueIds(rows: Array<{ id: string }>, label: string): void {
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) throw new Error(`El respaldo local de ${label} contiene IDs duplicados.`);
    ids.add(row.id);
  }
}

export function normalizeLocalAutomationBackup(value: unknown): LocalAutomationBackup {
  if (!value || typeof value !== 'object') {
    throw new Error('El respaldo de automatización local no es válido.');
  }
  const raw = value as Partial<LocalAutomationBackup>;

  const templateRows = requireArray(raw.templates, 'Templates', QUICK_ADD_TEMPLATES_MAX);
  const templates = templateRows.map(normalizeQuickAddTemplate);
  if (templates.some(row => row === null)) {
    throw new Error('El respaldo local de Templates contiene datos inválidos.');
  }

  const savedFilterRows = requireArray(raw.savedFilters, 'Saved Filters', SAVED_TRANSACTION_FILTERS_MAX);
  const savedFilters = savedFilterRows.map(normalizeSavedTransactionFilter);
  if (savedFilters.some(row => row === null)) {
    throw new Error('El respaldo local de Saved Filters contiene datos inválidos.');
  }

  const ruleRows = requireArray(raw.rules, 'Rules', TRANSACTION_RULES_MAX);
  const rules = normalizeTransactionRules(ruleRows);
  if (rules.length !== ruleRows.length) {
    throw new Error('El respaldo local de Rules contiene datos inválidos o IDs duplicados.');
  }

  const normalizedTemplates = templates as QuickAddTemplate[];
  const normalizedFilters = savedFilters as SavedTransactionFilter[];
  requireUniqueIds(normalizedTemplates, 'Templates');
  requireUniqueIds(normalizedFilters, 'Saved Filters');
  requireUniqueIds(rules, 'Rules');

  return {
    templates: normalizedTemplates,
    savedFilters: normalizedFilters,
    rules,
  };
}

export function exportLocalAutomation(storage: LocalAutomationStorage): LocalAutomationBackup {
  return {
    templates: loadQuickAddTemplates(storage),
    savedFilters: loadSavedTransactionFilters(storage),
    rules: loadTransactionRules(storage),
  };
}

export function replaceLocalAutomation(
  storage: LocalAutomationStorage,
  value: unknown,
): LocalAutomationBackup {
  const normalized = normalizeLocalAutomationBackup(value);
  const previous = new Map<string, string | null>(
    AUTOMATION_KEYS.map(key => [key, storage.getItem(key)]),
  );

  try {
    writeQuickAddTemplates(storage, normalized.templates);
    writeSavedTransactionFilters(storage, normalized.savedFilters);
    writeTransactionRules(storage, normalized.rules);
    return normalized;
  } catch (error) {
    for (const key of AUTOMATION_KEYS) {
      const oldValue = previous.get(key) ?? null;
      if (oldValue === null) storage.removeItem(key);
      else storage.setItem(key, oldValue);
    }
    throw error;
  }
}

export function loadLocalAutomationSummary(storage: LocalAutomationStorage): LocalAutomationSummary {
  return {
    templates: loadQuickAddTemplates(storage).length,
    savedFilters: loadSavedTransactionFilters(storage).length,
    rules: loadTransactionRules(storage).length,
  };
}

export function clearLocalAutomation(storage: LocalAutomationStorage): void {
  storage.removeItem(QUICK_ADD_TEMPLATES_KEY);
  storage.removeItem(SAVED_TRANSACTION_FILTERS_KEY);
  storage.removeItem(TRANSACTION_RULES_KEY);
}

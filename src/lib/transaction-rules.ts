import { normalizeTransactionRule, type TransactionRule } from '../domain/rules';

type RuleStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const TRANSACTION_RULES_KEY = 'glitchbudget_transaction_rules_v1';
export const TRANSACTION_RULES_MAX = 50;

export function normalizeTransactionRules(value: unknown): TransactionRule[] {
  if (!Array.isArray(value)) return [];

  const ids = new Set<string>();
  const rules: TransactionRule[] = [];

  for (const candidate of value) {
    const rule = normalizeTransactionRule(candidate);
    if (!rule || ids.has(rule.id)) continue;
    ids.add(rule.id);
    rules.push(rule);
    if (rules.length >= TRANSACTION_RULES_MAX) break;
  }

  return rules;
}

export function loadTransactionRules(storage: RuleStorage): TransactionRule[] {
  try {
    return normalizeTransactionRules(JSON.parse(storage.getItem(TRANSACTION_RULES_KEY) || '[]'));
  } catch {
    return [];
  }
}

export function writeTransactionRules(storage: RuleStorage, rules: readonly TransactionRule[]): TransactionRule[] {
  const normalized = normalizeTransactionRules(rules);
  storage.setItem(TRANSACTION_RULES_KEY, JSON.stringify(normalized));
  return normalized;
}

export function upsertTransactionRule(storage: RuleStorage, value: TransactionRule): TransactionRule[] {
  const rule = normalizeTransactionRule(value);
  if (!rule) throw new Error('La regla necesita nombre, texto a buscar y al menos una sugerencia.');

  const current = loadTransactionRules(storage);
  const index = current.findIndex(item => item.id === rule.id);
  const next = [...current];

  if (index >= 0) next[index] = rule;
  else next.push(rule);

  return writeTransactionRules(storage, next);
}

export function setTransactionRuleEnabled(
  storage: RuleStorage,
  id: string,
  enabled: boolean,
): TransactionRule[] {
  const current = loadTransactionRules(storage);
  return writeTransactionRules(
    storage,
    current.map(rule => rule.id === id ? { ...rule, enabled } : rule),
  );
}

export function moveTransactionRule(
  storage: RuleStorage,
  id: string,
  direction: 'up' | 'down',
): TransactionRule[] {
  const current = loadTransactionRules(storage);
  const index = current.findIndex(rule => rule.id === id);
  if (index < 0) return current;

  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= current.length) return current;

  const next = [...current];
  [next[index], next[target]] = [next[target], next[index]];
  return writeTransactionRules(storage, next);
}

export function removeTransactionRule(storage: RuleStorage, id: string): TransactionRule[] {
  return writeTransactionRules(
    storage,
    loadTransactionRules(storage).filter(rule => rule.id !== id),
  );
}

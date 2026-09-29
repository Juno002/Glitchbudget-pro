import type { TransactionNecessity } from './models';
import { normalizeNecessity } from './transaction-metadata';

export type RuleCondition = {
  field: 'description';
  operator: 'contains';
  value: string;
};

export type RuleSuggestion = {
  categoryId?: string;
  necessity?: TransactionNecessity;
};

export type TransactionRule = {
  id: string;
  name: string;
  enabled: boolean;
  applyAutomatically?: boolean;
  condition: RuleCondition;
  suggestion: RuleSuggestion;
};

const MAX_RULE_NAME = 80;
const MAX_DESCRIPTION_MATCH = 120;
const MAX_CATEGORY_ID = 100;

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').slice(0, max)
    : '';
}

export function normalizeRuleCondition(value: unknown): RuleCondition | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<RuleCondition>;
  if (raw.field !== 'description' || raw.operator !== 'contains') return null;

  const match = cleanText(raw.value, MAX_DESCRIPTION_MATCH);
  if (!match) return null;

  return {
    field: 'description',
    operator: 'contains',
    value: match,
  };
}

export function normalizeRuleSuggestion(value: unknown): RuleSuggestion | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<RuleSuggestion>;

  const categoryId = cleanText(raw.categoryId, MAX_CATEGORY_ID) || undefined;
  const necessity = normalizeNecessity(raw.necessity);

  if (!categoryId && !necessity) return null;
  return { categoryId, necessity };
}

export function normalizeTransactionRule(value: unknown): TransactionRule | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<TransactionRule>;

  const id = cleanText(raw.id, 100);
  const name = cleanText(raw.name, MAX_RULE_NAME);
  const condition = normalizeRuleCondition(raw.condition);
  const suggestion = normalizeRuleSuggestion(raw.suggestion);

  if (!id || !name || !condition || !suggestion || typeof raw.enabled !== 'boolean') return null;

  return {
    id,
    name,
    enabled: raw.enabled,
    ...(raw.applyAutomatically === true ? { applyAutomatically: true } : {}),
    condition,
    suggestion,
  };
}

export function requireTransactionRule(value: unknown): TransactionRule {
  const rule = normalizeTransactionRule(value);
  if (!rule) {
    throw new Error('La regla local no cumple el contrato determinista de Fase 16.1.');
  }
  return rule;
}

import type { RuleSuggestion, TransactionRule } from './rules';

export type RuleMatch = {
  ruleId: string;
  ruleName: string;
  applyAutomatically?: boolean;
  suggestion: RuleSuggestion;
};

function normalizeComparableText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es');
}

export function evaluateTransactionRule(
  description: string,
  rule: TransactionRule,
): RuleMatch | null {
  if (!rule.enabled) return null;

  const candidate = normalizeComparableText(description);
  if (!candidate) return null;

  const needle = normalizeComparableText(rule.condition.value);
  if (!needle || !candidate.includes(needle)) return null;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    ...(rule.applyAutomatically === true ? { applyAutomatically: true } : {}),
    suggestion: {
      categoryId: rule.suggestion.categoryId,
      necessity: rule.suggestion.necessity,
    },
  };
}

export function evaluateTransactionRules(
  description: string,
  rules: readonly TransactionRule[],
): RuleMatch[] {
  const matches: RuleMatch[] = [];

  for (const rule of rules) {
    const match = evaluateTransactionRule(description, rule);
    if (match) matches.push(match);
  }

  return matches;
}

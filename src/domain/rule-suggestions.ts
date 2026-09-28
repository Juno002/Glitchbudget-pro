import type { QuickAddTransactionType } from '../lib/quick-add-templates';
import type { RuleMatch } from './rule-engine';

export function quickAddRuleSuggestions(
  matches: readonly RuleMatch[],
  transactionType: QuickAddTransactionType,
  allowedCategoryIds: readonly string[],
): RuleMatch[] {
  if (transactionType === 'transfer') return [];

  const allowed = new Set(allowedCategoryIds);

  return matches.flatMap(match => {
    const categoryId = match.suggestion.categoryId && allowed.has(match.suggestion.categoryId)
      ? match.suggestion.categoryId
      : undefined;
    const necessity = transactionType === 'expense'
      ? match.suggestion.necessity
      : undefined;

    if (!categoryId && !necessity) return [];

    return [{
      ruleId: match.ruleId,
      ruleName: match.ruleName,
      suggestion: { categoryId, necessity },
    }];
  });
}

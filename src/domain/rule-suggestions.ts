import type { RuleMatch } from './rule-engine';

export type RuleSuggestionTransactionType = 'expense' | 'income' | 'transfer';

export const RULE_PRECEDENCE_POLICY = 'stored-order-manual-on-automatic-conflict' as const;

export function quickAddRuleSuggestions(
  matches: readonly RuleMatch[],
  transactionType: RuleSuggestionTransactionType,
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
      ...(match.applyAutomatically === true ? { applyAutomatically: true } : {}),
      suggestion: { categoryId, necessity },
    }];
  });
}


export type AutomaticRuleResolution = {
  automatic: RuleMatch | null;
  manual: RuleMatch[];
  hasAutomaticConflict: boolean;
};

export function resolveAutomaticRuleSuggestion(matches: readonly RuleMatch[]): AutomaticRuleResolution {
  const automaticMatches = matches.filter(match => match.applyAutomatically === true);
  if (automaticMatches.length !== 1) {
    return {
      automatic: null,
      manual: matches.map(match => ({
        ...match,
        suggestion: { ...match.suggestion },
      })),
      hasAutomaticConflict: automaticMatches.length > 1,
    };
  }

  const automatic = automaticMatches[0];
  return {
    automatic: {
      ...automatic,
      suggestion: { ...automatic.suggestion },
    },
    manual: matches
      .filter(match => match.ruleId !== automatic.ruleId)
      .map(match => ({
        ...match,
        suggestion: { ...match.suggestion },
      })),
    hasAutomaticConflict: false,
  };
}

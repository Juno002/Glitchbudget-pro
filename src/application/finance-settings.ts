import type { Settings } from '@/domain/models';
import { normalizeFinancialPolicies } from '@/policies/settings';

export type ResolvedFinanceSettings = Omit<Settings, 'preventNegativeAccountBalance' | 'budgetOverspendingBehavior'> & {
  preventNegativeAccountBalance: boolean;
  budgetOverspendingBehavior: 'allow' | 'warn' | 'block';
};

export function resolveFinanceSettings(
  defaults: Settings,
  rawSettings: Settings | null,
): ResolvedFinanceSettings {
  const source: Partial<Settings> = rawSettings ?? {};
  return {
    ...defaults,
    ...source,
    ...normalizeFinancialPolicies(rawSettings ?? defaults),
    baseIncome: {
      amount: Math.max(0, Number(source.baseIncome?.amount ?? 0)),
      freq: source.baseIncome?.freq ?? 'mensual',
    },
    savePct: source.savePct ?? defaults.savePct,
  };
}

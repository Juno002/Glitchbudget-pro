import type { Settings } from '@/domain/models';
import { normalizeFinancialPolicies } from '@/policies/settings';

export const DEFAULT_SETTINGS: Settings = {
  id: 'general',
  theme: 'dark',
  preventNegativeAccountBalance: true,
  budgetOverspendingBehavior: 'block',
  rolloverStrategy: 'reset',
  periodStartDay: 1,
  baseIncome: { freq: 'mensual', amount: 0 },
  currency: 'DOP',
  locale: 'es-DO',
  savePct: 0,
};

export function resolveSettings(raw: Partial<Settings> | null | undefined): Settings {
  const settings = raw ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    ...normalizeFinancialPolicies(raw ?? DEFAULT_SETTINGS),
    baseIncome: {
      amount: Math.max(0, Number(settings.baseIncome?.amount ?? DEFAULT_SETTINGS.baseIncome.amount)),
      freq: settings.baseIncome?.freq ?? DEFAULT_SETTINGS.baseIncome.freq,
    },
    savePct: settings.savePct ?? DEFAULT_SETTINGS.savePct,
  };
}

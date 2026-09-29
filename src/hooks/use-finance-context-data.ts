'use client';

import { useRepositoryLiveQuery } from '@/adapters/dexie-live-query';
import {
  readCategories,
  readFinanceContextData,
  readGeneralSettings,
  readPlannedOccurrences,
  readRecurringRules,
} from '@/repositories/finance-repository';

export function useFinanceContextData(dataVersion: number) {
  const financialData = useRepositoryLiveQuery(readFinanceContextData, [dataVersion]);
  const rawSettings = useRepositoryLiveQuery(readGeneralSettings, [dataVersion]);
  const categories = useRepositoryLiveQuery(readCategories, [dataVersion]);
  const recurringRules = useRepositoryLiveQuery(readRecurringRules, [dataVersion]);
  const plannedOccurrences = useRepositoryLiveQuery(readPlannedOccurrences, [dataVersion]);

  return {
    financialData,
    rawSettings,
    categories,
    recurringRules,
    plannedOccurrences,
  };
}

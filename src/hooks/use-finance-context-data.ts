'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import {
  readCategories,
  readFinanceContextData,
  readGeneralSettings,
  readPlannedOccurrences,
  readRecurringRules,
} from '@/lib/finance-queries';

export function useFinanceContextData(dataVersion: number) {
  const financialData = useLiveQuery(readFinanceContextData, [dataVersion]);
  const rawSettings = useLiveQuery(readGeneralSettings, [dataVersion]);
  const categories = useLiveQuery(readCategories, [dataVersion]);
  const recurringRules = useLiveQuery(readRecurringRules, [dataVersion]);
  const plannedOccurrences = useLiveQuery(readPlannedOccurrences, [dataVersion]);

  return {
    financialData,
    rawSettings,
    categories,
    recurringRules,
    plannedOccurrences,
  };
}

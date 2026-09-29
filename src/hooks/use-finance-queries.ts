'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import {
  readAccountOverviewData,
  readAccounts,
  readCategories,
  readInvestmentManagerData,
  readMovementAccountData,
} from '@/lib/finance-queries';

export function useMovementAccountData() {
  return useLiveQuery(readMovementAccountData);
}

export function useAccountsData() {
  return useLiveQuery(readAccounts);
}

export function useAccountOverviewData() {
  return useLiveQuery(readAccountOverviewData);
}

export function useCategoriesData() {
  return useLiveQuery(readCategories);
}

export function useInvestmentManagerData() {
  return useLiveQuery(readInvestmentManagerData);
}

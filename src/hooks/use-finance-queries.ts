'use client';

import { useRepositoryLiveQuery } from '@/adapters/dexie-live-query';
import {
  readAccountOverviewData,
  readAccounts,
  readCategories,
  readInvestmentManagerData,
  readMovementAccountData,
} from '@/repositories/finance-repository';

export function useMovementAccountData() {
  return useRepositoryLiveQuery(readMovementAccountData);
}

export function useAccountsData() {
  return useRepositoryLiveQuery(readAccounts);
}

export function useAccountOverviewData() {
  return useRepositoryLiveQuery(readAccountOverviewData);
}

export function useCategoriesData() {
  return useRepositoryLiveQuery(readCategories);
}

export function useInvestmentManagerData() {
  return useRepositoryLiveQuery(readInvestmentManagerData);
}

'use client';

import { useCallback } from 'react';
import { useRepositoryLiveQuery } from '@/adapters/dexie-live-query';
import { resolveCategory } from '@/lib/categories';
import { readCategories } from '@/repositories/finance-repository';

export function useCategoryResolver() {
  const rows = useRepositoryLiveQuery(readCategories);
  return useCallback((id: string | undefined) => resolveCategory(rows || [], id), [rows]);
}

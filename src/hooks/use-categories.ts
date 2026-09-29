'use client';

import { useCallback } from 'react';
import { resolveCategory } from '@/lib/categories';
import { useCategoriesData } from '@/hooks/use-finance-queries';

export function useCategoryResolver() {
  const rows = useCategoriesData();
  return useCallback((id: string | undefined) => resolveCategory(rows || [], id), [rows]);
}

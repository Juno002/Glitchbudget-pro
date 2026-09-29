'use client';

import { useLiveQuery } from 'dexie-react-hooks';

export function useRepositoryLiveQuery<T>(
  query: () => Promise<T>,
  dependencies: readonly unknown[] = [],
): T | undefined {
  return useLiveQuery(query, dependencies);
}

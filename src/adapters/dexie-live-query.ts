'use client';

import { useLiveQuery } from 'dexie-react-hooks';

export function useRepositoryLiveQuery<T>(
  query: () => Promise<T>,
  dependencies: any[] = [],
): T | undefined {
  return useLiveQuery(query, dependencies);
}

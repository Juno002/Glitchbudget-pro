import { reconstructCategories } from '@/domain/categories';
import { db } from '@/lib/db';

/**
 * Explicit user-requested destructive reset.
 *
 * This is an application service, not a Dexie migration strategy.
 * Migrations remain incremental and must never use this function.
 */
export async function clearPersistedFinanceData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();

    // Clearing tables does not trigger Dexie's populate hook. Restore the same
    // category state as a brand-new database so transaction entry remains usable.
    const defaultCategories = reconstructCategories({});
    if (defaultCategories.length) await db.categories.bulkAdd(defaultCategories);
  });
}

import { withoutLegacyCategories } from '@/domain/categories';
import type { Settings } from '@/domain/models';
import { db } from '@/lib/db';
import { readFinancialPolicies } from '@/lib/policy-settings';

export async function initializeSettings(
  defaults: Settings,
  rawSettings: Settings | null,
): Promise<'seeded' | 'normalized'> {
  if (rawSettings !== null) {
    await db.transaction('rw', db.settings, readFinancialPolicies);
    return 'normalized';
  }

  await db.settings.put(defaults);
  return 'seeded';
}

export async function updatePersistedSetting(
  key: keyof Settings,
  value: unknown,
): Promise<void> {
  await db.settings.update('general', { [key]: value } as Partial<Settings>);
}

export async function updatePersistedSettings(
  settings: Partial<Settings>,
): Promise<void> {
  await db.settings.update('general', withoutLegacyCategories(settings));
}

export async function resetPersistedSettings(defaults: Settings): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    await db.settings.clear();
    await db.settings.put(defaults);
  });
}

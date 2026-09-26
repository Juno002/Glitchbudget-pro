import { db } from './db';
import { normalizeFinancialPolicies } from '../policies/settings';
/** Call inside a read/write transaction including settings. Conversion is idempotent. */
export async function readFinancialPolicies() {
  const settings = await db.settings.get('general');
  const policies = normalizeFinancialPolicies(settings);
  if (settings && (settings.preventNegativeAccountBalance === undefined || settings.budgetOverspendingBehavior === undefined)) await db.settings.update('general', { ...policies });
  return policies;
}

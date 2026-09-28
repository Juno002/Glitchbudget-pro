import { normalizeCurrencyCode, requireCurrencyCode } from '../domain/currency';
import { db } from './db';

export async function setBaseCurrency(input: string): Promise<string> {
  const next = requireCurrencyCode(input);

  await db.transaction('rw', [
    db.settings, db.accounts, db.incomes, db.expenses, db.account_transfers,
    db.debt_payments, db.debts, db.plans, db.goals, db.goal_contributions,
    db.recurrents, db.investments,
  ], async () => {
    const settings = await db.settings.get('general');
    if (!settings) throw new Error('No se encontraron los ajustes financieros.');

    const current = normalizeCurrencyCode(settings.currency);
    if (current === next) {
      if (settings.currency !== next) await db.settings.update('general', { currency: next });
      return;
    }

    const accounts = await db.accounts.toArray();
    const hasMoney =
      accounts.some(account => account.openingBalance !== 0) ||
      (settings.baseIncome?.amount ?? 0) !== 0 ||
      await db.incomes.count() > 0 ||
      await db.expenses.count() > 0 ||
      await db.account_transfers.count() > 0 ||
      await db.debt_payments.count() > 0 ||
      await db.debts.count() > 0 ||
      await db.plans.count() > 0 ||
      await db.goals.count() > 0 ||
      await db.goal_contributions.count() > 0 ||
      await db.recurrents.count() > 0 ||
      await db.investments.count() > 0;

    if (hasMoney) {
      throw new Error('No se puede cambiar la moneda base después de registrar importes. Fase 11 no convierte datos existentes automáticamente.');
    }

    await db.settings.update('general', { currency: next });
    if (accounts.length) {
      await db.accounts.bulkPut(accounts.map(account => ({ ...account, currency: next })));
    }
  });

  return next;
}

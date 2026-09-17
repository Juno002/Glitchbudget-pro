import { db } from './db';
import { expenseForMonth, isValidDate, localDate } from './finance-calculations';

export async function rollBudgetsIntoMonth(month: string): Promise<boolean> {
  if (!isValidDate(month + '-01')) throw new Error('Selecciona un mes válido.');
  return db.transaction('rw', db.settings, db.plans, db.expenses, async () => {
    const strategy = (await db.settings.get('general'))?.rolloverStrategy;
    if (!strategy || strategy === 'reset' || await db.plans.where('month').equals(month).count()) return false;
    const previous = new Date(month + '-01T12:00:00');
    previous.setMonth(previous.getMonth() - 1);
    const previousMonth = localDate(previous).slice(0, 7);
    const plans = await db.plans.where('month').equals(previousMonth).toArray();
    if (!plans.length) return false;
    const expenses = await db.expenses.toArray();
    const next = plans.map(plan => {
      const spent = expenses.filter(e => e.categoryId === plan.categoryId).reduce((sum, e) => sum + expenseForMonth(e, previousMonth), 0);
      const remaining = plan.limit - spent;
      const adjustment = strategy === 'accumulate_surplus' ? Math.max(0, remaining) : Math.min(0, remaining);
      const limit = Math.max(0, plan.limit + adjustment);
      if (!Number.isSafeInteger(limit)) throw new Error('El presupuesto supera el monto admitido.');
      return { ...plan, month, limit };
    });
    await db.plans.bulkAdd(next);
    return true;
  });
}

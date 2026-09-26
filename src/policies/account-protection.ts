import { selectAccountEntries, selectAccountBalance, type AccountSnapshot } from '../domain/ledger';
import type { Account } from '../domain/models';
export function accountFundsWorsen(beforeAccount: Account, afterAccount: Account, before: AccountSnapshot, after: AccountSnapshot, today: string): boolean {
  const dates = new Set([today, beforeAccount.startDate, afterAccount.startDate, ...selectAccountEntries(beforeAccount, before, '9999-12-31').map(r => r.date), ...selectAccountEntries(afterAccount, after, '9999-12-31').map(r => r.date)]);
  return [...dates].some(d => selectAccountBalance(afterAccount, after, d) < Math.min(0, selectAccountBalance(beforeAccount, before, d)));
}

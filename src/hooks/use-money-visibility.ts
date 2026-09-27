'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { formatCurrency } from '@/lib/utils';

const KEY = 'glitchbudget_balances_hidden';
const EVENT = 'glitchbudget:money-visibility';
let sessionValue: boolean | undefined;
function snapshot() {
  if (sessionValue !== undefined) return sessionValue;
  try { return localStorage.getItem(KEY) === 'true'; }
  catch { return sessionValue ?? false; }
}
function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', listener);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', listener); };
}
export function useMoneyVisibility() {
  // Mask the server render too: a saved privacy preference must never flash amounts.
  const balancesHidden = useSyncExternalStore(subscribe, snapshot, () => true);
  const setBalancesHidden = useCallback((hidden: boolean) => {
    sessionValue = hidden;
    try { localStorage.setItem(KEY, String(hidden)); sessionValue = undefined; } catch { /* Session-only preference when storage is unavailable. */ }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { balancesHidden, setBalancesHidden };
}
export function useMoneyFormatter() {
  const { balancesHidden } = useMoneyVisibility();
  return useCallback((amount: number) => balancesHidden ? '••••••' : formatCurrency(amount), [balancesHidden]);
}

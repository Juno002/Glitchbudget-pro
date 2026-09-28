'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useFinances } from '@/contexts/finance-context';

const STORAGE_KEY = 'glitchbudget_balances_hidden_v1';

type BalanceVisibilityContextValue = {
  balancesHidden: boolean;
  setBalancesHidden: (value: boolean) => void;
  toggleBalancesHidden: () => void;
};

const BalanceVisibilityContext = createContext<BalanceVisibilityContextValue | undefined>(undefined);

export function BalanceVisibilityProvider({ children }: { children: ReactNode }) {
  const [balancesHidden, setHiddenState] = useState(false);

  const apply = useCallback((value: boolean) => {
    setHiddenState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {}
    document.documentElement.dataset.balancesHidden = value ? 'true' : 'false';
    document.documentElement.dataset.balancesReady = 'true';
  }, []);

  useEffect(() => {
    let hidden = false;
    try { hidden = localStorage.getItem(STORAGE_KEY) === '1'; } catch {}
    apply(hidden);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) apply(event.newValue === '1');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [apply]);

  const value = useMemo(() => ({
    balancesHidden,
    setBalancesHidden: apply,
    toggleBalancesHidden: () => apply(!balancesHidden),
  }), [apply, balancesHidden]);

  return <BalanceVisibilityContext.Provider value={value}>{children}</BalanceVisibilityContext.Provider>;
}

export function useBalanceVisibility() {
  const value = useContext(BalanceVisibilityContext);
  if (!value) throw new Error('useBalanceVisibility must be used inside BalanceVisibilityProvider.');
  return value;
}

export function usePrivateCurrency() {
  const { balancesHidden } = useBalanceVisibility();
  const { currency } = useFinances();
  return useCallback((amount: number, amountCurrency = currency) => balancesHidden ? '••••••' : formatCurrency(amount, amountCurrency, 'es-DO'), [balancesHidden, currency]);
}

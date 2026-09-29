'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { APP_LOCK_STORAGE_KEY } from '@/domain/local-security';
import {
  disableAppLock,
  enableAppLock,
  loadAppLockRecord,
  replaceAppLockPin,
  verifyAppLockPin,
} from '@/lib/app-lock';

type AppLockContextValue = {
  ready: boolean;
  enabled: boolean;
  locked: boolean;
  enable: (pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
  disable: (currentPin: string) => Promise<boolean>;
  lockNow: () => void;
};

const AppLockContext = createContext<AppLockContextValue | undefined>(undefined);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);

  const load = useCallback(() => {
    const record = loadAppLockRecord(localStorage);
    const nextEnabled = Boolean(record);
    setEnabled(nextEnabled);
    setLocked(nextEnabled);
    setReady(true);
  }, []);

  useEffect(() => {
    load();
    const onStorage = (event: StorageEvent) => {
      if (event.key !== APP_LOCK_STORAGE_KEY) return;
      const record = loadAppLockRecord(localStorage);
      const nextEnabled = Boolean(record);
      setEnabled(nextEnabled);
      setLocked(nextEnabled);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [load]);

  const enable = useCallback(async (pin: string) => {
    await enableAppLock(localStorage, pin);
    setEnabled(true);
    setLocked(false);
  }, []);

  const unlock = useCallback(async (pin: string) => {
    const record = loadAppLockRecord(localStorage);
    if (!record) {
      setEnabled(false);
      setLocked(false);
      return true;
    }
    const valid = await verifyAppLockPin(record, pin);
    if (valid) setLocked(false);
    return valid;
  }, []);

  const changePin = useCallback(async (currentPin: string, newPin: string) => {
    const changed = await replaceAppLockPin(localStorage, currentPin, newPin);
    if (changed) {
      setEnabled(true);
      setLocked(false);
    }
    return changed;
  }, []);

  const disable = useCallback(async (currentPin: string) => {
    const disabled = await disableAppLock(localStorage, currentPin);
    if (disabled) {
      setEnabled(false);
      setLocked(false);
    }
    return disabled;
  }, []);

  const lockNow = useCallback(() => {
    if (enabled) setLocked(true);
  }, [enabled]);

  const value = useMemo<AppLockContextValue>(() => ({
    ready,
    enabled,
    locked,
    enable,
    unlock,
    changePin,
    disable,
    lockNow,
  }), [ready, enabled, locked, enable, unlock, changePin, disable, lockNow]);

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock() {
  const value = useContext(AppLockContext);
  if (!value) throw new Error('useAppLock must be used inside AppLockProvider.');
  return value;
}

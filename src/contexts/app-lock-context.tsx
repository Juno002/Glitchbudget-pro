'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  APP_LOCK_STORAGE_KEY,
  AUTO_LOCK_STORAGE_KEY,
  type AutoLockTimeoutMinutes,
} from '@/domain/local-security';
import {
  disableAppLock,
  enableAppLock,
  loadAppLockRecord,
  replaceAppLockPin,
  verifyAppLockPin,
} from '@/lib/app-lock';
import {
  autoLockTimeoutMs,
  clearAutoLock,
  loadAutoLockRecord,
  remainingAutoLockMs,
  saveAutoLockRecord,
  shouldAutoLock,
} from '@/lib/auto-lock';

type AppLockContextValue = {
  ready: boolean;
  enabled: boolean;
  locked: boolean;
  autoLockMinutes: AutoLockTimeoutMinutes | null;
  enable: (pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
  disable: (currentPin: string) => Promise<boolean>;
  lockNow: () => void;
  configureAutoLock: (timeoutMinutes: AutoLockTimeoutMinutes | null) => boolean;
};

const AppLockContext = createContext<AppLockContextValue | undefined>(undefined);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState<AutoLockTimeoutMinutes | null>(null);
  const lastActivityAt = useRef(Date.now());

  const load = useCallback(() => {
    const record = loadAppLockRecord(localStorage);
    const nextEnabled = Boolean(record);
    if (!nextEnabled) clearAutoLock(localStorage);
    const autoLock = nextEnabled ? loadAutoLockRecord(localStorage) : null;

    setEnabled(nextEnabled);
    setLocked(nextEnabled);
    setAutoLockMinutes(autoLock?.timeoutMinutes ?? null);
    lastActivityAt.current = Date.now();
    setReady(true);
  }, []);

  useEffect(() => {
    load();

    const onStorage = (event: StorageEvent) => {
      if (event.key !== APP_LOCK_STORAGE_KEY && event.key !== AUTO_LOCK_STORAGE_KEY) return;

      const record = loadAppLockRecord(localStorage);
      const nextEnabled = Boolean(record);
      if (!nextEnabled) clearAutoLock(localStorage);
      const autoLock = nextEnabled ? loadAutoLockRecord(localStorage) : null;

      setEnabled(nextEnabled);
      setAutoLockMinutes(autoLock?.timeoutMinutes ?? null);
      lastActivityAt.current = Date.now();

      if (event.key === APP_LOCK_STORAGE_KEY) setLocked(nextEnabled);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [load]);

  useEffect(() => {
    if (!ready || !enabled || locked || autoLockMinutes === null) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const lockIfDue = () => {
      const now = Date.now();
      if (shouldAutoLock(lastActivityAt.current, now, autoLockMinutes)) {
        setLocked(true);
        return;
      }
      clearTimer();
      timer = setTimeout(lockIfDue, remainingAutoLockMs(lastActivityAt.current, now, autoLockMinutes));
    };

    const recordActivity = () => {
      lastActivityAt.current = Date.now();
      clearTimer();
      timer = setTimeout(lockIfDue, autoLockTimeoutMs(autoLockMinutes));
    };

    const checkForeground = () => {
      if (document.visibilityState !== 'visible') {
        clearTimer();
        return;
      }
      lockIfDue();
    };

    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
    for (const eventName of activityEvents) window.addEventListener(eventName, recordActivity, { passive: true });
    document.addEventListener('visibilitychange', checkForeground);
    window.addEventListener('pageshow', checkForeground);

    timer = setTimeout(lockIfDue, remainingAutoLockMs(lastActivityAt.current, Date.now(), autoLockMinutes));

    return () => {
      clearTimer();
      for (const eventName of activityEvents) window.removeEventListener(eventName, recordActivity);
      document.removeEventListener('visibilitychange', checkForeground);
      window.removeEventListener('pageshow', checkForeground);
    };
  }, [ready, enabled, locked, autoLockMinutes]);

  const enable = useCallback(async (pin: string) => {
    await enableAppLock(localStorage, pin);
    setEnabled(true);
    setLocked(false);
    setAutoLockMinutes(null);
    lastActivityAt.current = Date.now();
  }, []);

  const unlock = useCallback(async (pin: string) => {
    const record = loadAppLockRecord(localStorage);
    if (!record) {
      clearAutoLock(localStorage);
      setEnabled(false);
      setLocked(false);
      setAutoLockMinutes(null);
      return true;
    }
    const valid = await verifyAppLockPin(record, pin);
    if (valid) {
      setLocked(false);
      lastActivityAt.current = Date.now();
    }
    return valid;
  }, []);

  const changePin = useCallback(async (currentPin: string, newPin: string) => {
    const changed = await replaceAppLockPin(localStorage, currentPin, newPin);
    if (changed) {
      setEnabled(true);
      setLocked(false);
      lastActivityAt.current = Date.now();
    }
    return changed;
  }, []);

  const disable = useCallback(async (currentPin: string) => {
    const disabled = await disableAppLock(localStorage, currentPin);
    if (disabled) {
      clearAutoLock(localStorage);
      setEnabled(false);
      setLocked(false);
      setAutoLockMinutes(null);
    }
    return disabled;
  }, []);

  const lockNow = useCallback(() => {
    if (enabled) setLocked(true);
  }, [enabled]);

  const configureAutoLock = useCallback((timeoutMinutes: AutoLockTimeoutMinutes | null) => {
    if (!enabled) {
      clearAutoLock(localStorage);
      setAutoLockMinutes(null);
      return false;
    }

    try {
      if (timeoutMinutes === null) {
        clearAutoLock(localStorage);
        setAutoLockMinutes(null);
        return true;
      }
      saveAutoLockRecord(localStorage, timeoutMinutes);
      setAutoLockMinutes(timeoutMinutes);
      lastActivityAt.current = Date.now();
      return true;
    } catch {
      return false;
    }
  }, [enabled]);

  const value = useMemo<AppLockContextValue>(() => ({
    ready,
    enabled,
    locked,
    autoLockMinutes,
    enable,
    unlock,
    changePin,
    disable,
    lockNow,
    configureAutoLock,
  }), [
    ready,
    enabled,
    locked,
    autoLockMinutes,
    enable,
    unlock,
    changePin,
    disable,
    lockNow,
    configureAutoLock,
  ]);

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock() {
  const value = useContext(AppLockContext);
  if (!value) throw new Error('useAppLock must be used inside AppLockProvider.');
  return value;
}

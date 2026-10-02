    await enableAppLock(localStorage, pin);
    setEnabled(true);
    setLocked(false);
    setAutoLockMinutes(null);
    failedUnlockAttempts.current = 0;
    setUnlockBlockedUntil(null);
    lastActivityAt.current = Date.now();
  }, []);

  const unlock = useCallback(async (pin: string) => {
    const now = Date.now();
    if (appLockRetryRemainingMs(unlockBlockedUntil, now) > 0) return false;

    const record = loadAppLockRecord(localStorage);
    if (!record) {
      clearAutoLock(localStorage);
      setEnabled(false);
      setLocked(false);
      setAutoLockMinutes(null);
      failedUnlockAttempts.current = 0;
      setUnlockBlockedUntil(null);
      return true;
    }

    const valid = await verifyAppLockPin(record, pin);
    if (valid) {
      failedUnlockAttempts.current = 0;
      setUnlockBlockedUntil(null);
      setLocked(false);
      lastActivityAt.current = now;
      return true;
    }

    failedUnlockAttempts.current += 1;
    const delay = appLockRetryDelayMs(failedUnlockAttempts.current);
    const failedAt = Date.now();
    setUnlockBlockedUntil(delay > 0 ? failedAt + delay : null);
    return false;
  }, [unlockBlockedUntil]);

  const changePin = useCallback(async (currentPin: string, newPin: string) => {
    const changed = await replaceAppLockPin(localStorage, currentPin, newPin);
    if (changed) {
      setEnabled(true);
      setLocked(false);
      failedUnlockAttempts.current = 0;
      setUnlockBlockedUntil(null);
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
      failedUnlockAttempts.current = 0;
      setUnlockBlockedUntil(null);
    }
    return disabled;
  }, []);

  const lockNow = useCallback(() => {
    if (enabled) setLocked(true);
  }, [enabled]);

  const configureAutoLock = useCallback((timeoutMinutes: AutoLockTimeoutMinutes | null) => {
    if (!enabled) {
      clearAutoLock(localStorage);
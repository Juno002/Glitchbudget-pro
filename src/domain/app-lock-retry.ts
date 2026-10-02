export const APP_LOCK_BACKOFF_START_ATTEMPT = 3;
export const APP_LOCK_BACKOFF_MAX_MS = 30_000;

/**
 * Session-only UI retry delay. This slows repeated attempts through Prisma's
 * lock screen without claiming to protect Dexie or the verifier at rest.
 *
 * Attempts 1-2: no delay.
 * Attempt 3: 1s, then doubles until capped at 30s.
 */
export function appLockRetryDelayMs(failedAttempts: number): number {
  if (!Number.isFinite(failedAttempts)) return APP_LOCK_BACKOFF_MAX_MS;
  const attempts = Math.max(0, Math.trunc(failedAttempts));
  if (attempts < APP_LOCK_BACKOFF_START_ATTEMPT) return 0;
  const exponent = Math.min(5, attempts - APP_LOCK_BACKOFF_START_ATTEMPT);
  return Math.min(APP_LOCK_BACKOFF_MAX_MS, 1_000 * (2 ** exponent));
}

export function appLockRetryRemainingMs(blockedUntil: number | null, now: number): number {
  if (blockedUntil === null || !Number.isFinite(blockedUntil) || !Number.isFinite(now)) return 0;
  return Math.max(0, blockedUntil - now);
}

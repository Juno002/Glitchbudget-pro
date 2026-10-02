import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  APP_LOCK_BACKOFF_MAX_MS,
  APP_LOCK_BACKOFF_START_ATTEMPT,
  appLockRetryDelayMs,
  appLockRetryRemainingMs,
} from '../src/domain/app-lock-retry';
import { LOCAL_SECURITY_CONTRACT } from '../src/domain/local-security';

test('App Lock retry policy starts after repeated failures and stays bounded', () => {
  assert.equal(APP_LOCK_BACKOFF_START_ATTEMPT, 3);
  assert.equal(APP_LOCK_BACKOFF_MAX_MS, 30_000);
  assert.equal(appLockRetryDelayMs(0), 0);
  assert.equal(appLockRetryDelayMs(1), 0);
  assert.equal(appLockRetryDelayMs(2), 0);
  assert.equal(appLockRetryDelayMs(3), 1_000);
  assert.equal(appLockRetryDelayMs(4), 2_000);
  assert.equal(appLockRetryDelayMs(5), 4_000);
  assert.equal(appLockRetryDelayMs(6), 8_000);
  assert.equal(appLockRetryDelayMs(7), 16_000);
  assert.equal(appLockRetryDelayMs(8), 30_000);
  assert.equal(appLockRetryDelayMs(100), 30_000);
});

test('App Lock remaining retry time is deterministic and expires without permanent lockout', () => {
  assert.equal(appLockRetryRemainingMs(null, 1_000), 0);
  assert.equal(appLockRetryRemainingMs(5_000, 1_000), 4_000);
  assert.equal(appLockRetryRemainingMs(5_000, 5_000), 0);
  assert.equal(appLockRetryRemainingMs(5_000, 6_000), 0);
});

test('App Lock runtime throttles before PBKDF2 and resets retry state after success', () => {
  const context = readFileSync(new URL('../src/contexts/app-lock-context.tsx', import.meta.url), 'utf8');

  const backoffCheck = context.indexOf('appLockRetryRemainingMs(unlockBlockedUntil, now)');
  const verifier = context.indexOf('verifyAppLockPin(record, pin)');
  assert.ok(backoffCheck >= 0 && verifier >= 0 && backoffCheck < verifier);
  assert.match(context, /failedUnlockAttempts\.current \+= 1/);
  assert.match(context, /appLockRetryDelayMs\(failedUnlockAttempts\.current\)/);
  assert.match(context, /failedUnlockAttempts\.current = 0;[\s\S]*setUnlockBlockedUntil\(null\);[\s\S]*setLocked\(false\)/);
});

test('App Lock backoff is session memory only and keeps the UI-lock security boundary explicit', () => {
  const context = readFileSync(new URL('../src/contexts/app-lock-context.tsx', import.meta.url), 'utf8');
  const gate = readFileSync(new URL('../src/components/security/app-lock-gate.tsx', import.meta.url), 'utf8');

  assert.equal(LOCAL_SECURITY_CONTRACT.appLock.retryBackoff, 'session-memory-progressive');
  assert.equal(LOCAL_SECURITY_CONTRACT.appLock.retryBackoffMaxMs, APP_LOCK_BACKOFF_MAX_MS);
  assert.doesNotMatch(context, /unlock_attempt|retry_attempt|failed_attempt/i);
  assert.doesNotMatch(context, /sessionStorage/);
  assert.match(gate, /Espera \{retrySeconds\}/);
  assert.match(gate, /No cifra la base de datos Dexie/i);
});

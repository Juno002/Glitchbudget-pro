import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  AUTO_LOCK_STORAGE_KEY,
  AUTO_LOCK_TIMEOUT_OPTIONS,
  LOCAL_SECURITY_CONTRACT,
} from '../src/domain/local-security';
import {
  autoLockTimeoutMs,
  clearAutoLock,
  loadAutoLockRecord,
  parseAutoLockRecord,
  remainingAutoLockMs,
  saveAutoLockRecord,
  shouldAutoLock,
} from '../src/lib/auto-lock';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test('17.3 exposes explicit comprehensible timeout options and local storage contract', () => {
  assert.deepEqual(AUTO_LOCK_TIMEOUT_OPTIONS, [1, 5, 15, 30]);
  assert.equal(LOCAL_SECURITY_CONTRACT.autoLock.status, 'implemented-17.3');
  assert.equal(LOCAL_SECURITY_CONTRACT.autoLock.requires, 'app-lock');
  assert.equal(LOCAL_SECURITY_CONTRACT.autoLock.storage, 'localStorage');
  assert.equal(LOCAL_SECURITY_CONTRACT.autoLock.storageKey, AUTO_LOCK_STORAGE_KEY);
  assert.deepEqual(LOCAL_SECURITY_CONTRACT.autoLock.timeoutOptionsMinutes, AUTO_LOCK_TIMEOUT_OPTIONS);
});

test('17.3 persists only valid explicit opt-in records and legacy absence stays disabled', () => {
  const storage = new MemoryStorage();
  assert.equal(loadAutoLockRecord(storage), null);

  const saved = saveAutoLockRecord(storage, 5);
  assert.deepEqual(saved, { v: 1, enabled: true, timeoutMinutes: 5 });
  assert.deepEqual(loadAutoLockRecord(storage), saved);

  assert.throws(() => saveAutoLockRecord(storage, 2 as never), /no válido/i);
  clearAutoLock(storage);
  assert.equal(loadAutoLockRecord(storage), null);
});

test('17.3 rejects malformed auto-lock records instead of inventing settings', () => {
  assert.equal(parseAutoLockRecord(null), null);
  assert.equal(parseAutoLockRecord({ v: 1, enabled: false, timeoutMinutes: 5 }), null);
  assert.equal(parseAutoLockRecord({ v: 1, enabled: true, timeoutMinutes: 2 }), null);
  assert.equal(parseAutoLockRecord({ v: 2, enabled: true, timeoutMinutes: 5 }), null);
  assert.deepEqual(parseAutoLockRecord({ v: 1, enabled: true, timeoutMinutes: 15 }), {
    v: 1,
    enabled: true,
    timeoutMinutes: 15,
  });
});

test('17.3 inactivity boundary is deterministic', () => {
  const start = 1_000_000;
  assert.equal(autoLockTimeoutMs(1), 60_000);
  assert.equal(shouldAutoLock(start, start + 59_999, 1), false);
  assert.equal(shouldAutoLock(start, start + 60_000, 1), true);
  assert.equal(remainingAutoLockMs(start, start + 45_000, 1), 15_000);
  assert.equal(remainingAutoLockMs(start, start + 70_000, 1), 0);
  assert.equal(shouldAutoLock(start, start - 1, 1), false);
});

test('17.3 runtime resets inactivity on local activity and checks real elapsed time on foreground return', () => {
  const context = readFileSync(new URL('../src/contexts/app-lock-context.tsx', import.meta.url), 'utf8');

  for (const eventName of ['pointerdown', 'keydown', 'touchstart', 'wheel']) {
    assert.match(context, new RegExp(eventName));
  }
  assert.match(context, /visibilitychange/);
  assert.match(context, /pageshow/);
  assert.match(context, /document\.visibilityState !== 'visible'/);
  assert.match(context, /lastActivityAt\.current = Date\.now\(\)/);
  assert.match(context, /shouldAutoLock\(lastActivityAt\.current, now, autoLockMinutes\)/);
  assert.match(context, /remainingAutoLockMs/);
});

test('17.3 cannot operate without App lock and disabling App lock clears Auto-lock', () => {
  const context = readFileSync(new URL('../src/contexts/app-lock-context.tsx', import.meta.url), 'utf8');

  assert.match(context, /if \(!enabled\) \{[\s\S]*clearAutoLock\(localStorage\);[\s\S]*setAutoLockMinutes\(null\);[\s\S]*return false;/);
  assert.match(context, /const disabled = await disableAppLock/);
  assert.match(context, /if \(disabled\) \{[\s\S]*clearAutoLock\(localStorage\)/);
  assert.match(context, /if \(!nextEnabled\) clearAutoLock\(localStorage\)/);
});

test('17.3 UI is explicit opt-in and exposes only the canonical timeout options', () => {
  const settings = readFileSync(new URL('../src/components/settings/auto-lock-settings.tsx', import.meta.url), 'utf8');

  assert.match(settings, /Activar Auto-lock/);
  assert.match(settings, /checked=\{active\}/);
  assert.match(settings, /event\.target\.checked \? 5 : null/);
  assert.match(settings, /AUTO_LOCK_TIMEOUT_OPTIONS\.map/);
  assert.match(settings, /1 minuto/);
  assert.match(settings, /5 minutos/);
  assert.match(settings, /15 minutos/);
  assert.match(settings, /30 minutos/);
  assert.match(settings, /Activa App lock primero/i);
  assert.match(settings, /segundo plano/i);
});

test('17.3 remains device-local, outside Dexie and outside financial backup', () => {
  const db = readFileSync(new URL('../src/lib/db.ts', import.meta.url), 'utf8');
  const backup = readFileSync(new URL('../src/lib/backup-json.ts', import.meta.url), 'utf8');
  const autoLock = readFileSync(new URL('../src/lib/auto-lock.ts', import.meta.url), 'utf8');
  const dialog = readFileSync(new URL('../src/components/layout/settings-dialog.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(db, /glitchbudget_auto_lock_v1|AUTO_LOCK_STORAGE_KEY/);
  assert.doesNotMatch(backup, /glitchbudget_auto_lock_v1|AUTO_LOCK_STORAGE_KEY/);
  assert.doesNotMatch(autoLock, /fetch\s*\(|axios|XMLHttpRequest|WebSocket|EventSource|sendBeacon|https?:\/\//i);
  assert.match(dialog, /localStorage\.removeItem\(AUTO_LOCK_STORAGE_KEY\)/);
});

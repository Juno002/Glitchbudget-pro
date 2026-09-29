import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  APP_LOCK_PIN_MAX_LENGTH,
  APP_LOCK_PIN_MIN_LENGTH,
  APP_LOCK_STORAGE_KEY,
  LOCAL_SECURITY_CONTRACT,
} from '../src/domain/local-security';
import {
  APP_LOCK_ITERATIONS,
  APP_LOCK_KDF,
  createAppLockRecord,
  disableAppLock,
  enableAppLock,
  isValidAppLockPin,
  loadAppLockRecord,
  replaceAppLockPin,
  verifyAppLockPin,
} from '../src/lib/app-lock';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test('17.2 validates numeric PIN length without storing plaintext', async () => {
  assert.equal(APP_LOCK_PIN_MIN_LENGTH, 6);
  assert.equal(APP_LOCK_PIN_MAX_LENGTH, 12);
  assert.equal(isValidAppLockPin('123456'), true);
  assert.equal(isValidAppLockPin('12345'), false);
  assert.equal(isValidAppLockPin('1234567890123'), false);
  assert.equal(isValidAppLockPin('12ab56'), false);

  const record = await createAppLockRecord('654321');
  assert.equal(record.v, 1);
  assert.equal(record.kdf, APP_LOCK_KDF);
  assert.equal(record.iterations, APP_LOCK_ITERATIONS);
  assert.equal(JSON.stringify(record).includes('654321'), false);
  assert.notEqual(record.salt, '');
  assert.notEqual(record.verifier, '');
});

test('17.2 verifies PIN locally and rejects incorrect PIN', async () => {
  const record = await createAppLockRecord('123456');
  assert.equal(await verifyAppLockPin(record, '123456'), true);
  assert.equal(await verifyAppLockPin(record, '654321'), false);
  assert.equal(await verifyAppLockPin(record, '12345'), false);
});

test('17.2 persists only verifier material and loads no lock for legacy users', async () => {
  const storage = new MemoryStorage();
  assert.equal(loadAppLockRecord(storage), null);

  await enableAppLock(storage, '123456');
  const raw = storage.getItem(APP_LOCK_STORAGE_KEY);
  assert.ok(raw);
  assert.equal(raw.includes('123456'), false);

  const loaded = loadAppLockRecord(storage);
  assert.ok(loaded);
  assert.equal(await verifyAppLockPin(loaded, '123456'), true);
});

test('17.2 change and disable require the current PIN', async () => {
  const storage = new MemoryStorage();
  await enableAppLock(storage, '123456');

  assert.equal(await replaceAppLockPin(storage, '000000', '654321'), false);
  let loaded = loadAppLockRecord(storage);
  assert.ok(loaded);
  assert.equal(await verifyAppLockPin(loaded, '123456'), true);

  assert.equal(await replaceAppLockPin(storage, '123456', '654321'), true);
  loaded = loadAppLockRecord(storage);
  assert.ok(loaded);
  assert.equal(await verifyAppLockPin(loaded, '123456'), false);
  assert.equal(await verifyAppLockPin(loaded, '654321'), true);

  assert.equal(await disableAppLock(storage, '000000'), false);
  assert.ok(loadAppLockRecord(storage));
  assert.equal(await disableAppLock(storage, '654321'), true);
  assert.equal(loadAppLockRecord(storage), null);
});

test('17.2 contract explicitly remains a UI lock and not Dexie encryption', () => {
  const appLock = LOCAL_SECURITY_CONTRACT.appLock;
  assert.equal(appLock.status, 'implemented-17.2');
  assert.equal(appLock.protects, 'ui-access');
  assert.equal(appLock.storage, 'localStorage');
  assert.equal(appLock.storageKey, APP_LOCK_STORAGE_KEY);
  assert.equal(appLock.verifier, 'PBKDF2-SHA-256');
  assert.equal(appLock.plaintextPinStored, false);
  assert.ok(appLock.doesNotProtect.includes('dexie-at-rest'));
});

test('17.2 mounts lock gate before FinanceProvider so financial UI is not rendered while locked', () => {
  const layout = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
  const providerIndex = layout.indexOf('<AppLockProvider>');
  const gateIndex = layout.indexOf('<AppLockGate>');
  const financeIndex = layout.indexOf('<FinanceProvider>');
  assert.ok(providerIndex >= 0 && gateIndex >= 0 && financeIndex >= 0);
  assert.ok(providerIndex < gateIndex);
  assert.ok(gateIndex < financeIndex);

  const gate = readFileSync(new URL('../src/components/security/app-lock-gate.tsx', import.meta.url), 'utf8');
  assert.match(gate, /GlitchBudget bloqueado/);
  assert.match(gate, /PIN incorrecto/);
  assert.match(gate, /No cifra la base de datos Dexie/i);
});

test('17.2 settings still supports enable, change, manual lock and disable with Auto-lock layered separately', () => {
  const settings = readFileSync(new URL('../src/components/settings/app-lock-settings.tsx', import.meta.url), 'utf8');
  assert.match(settings, /Activar App lock/);
  assert.match(settings, /Bloquear ahora/);
  assert.match(settings, /Cambiar PIN/);
  assert.match(settings, /Desactivar bloqueo/);
  assert.match(settings, /PIN actual/);
  assert.match(settings, /No cifra Dexie/i);

  const dialog = readFileSync(new URL('../src/components/layout/settings-dialog.tsx', import.meta.url), 'utf8');
  assert.match(dialog, /<AppLockSettings \/>/);
  assert.match(dialog, /<AutoLockSettings \/>/);
  assert.match(dialog, /localStorage\.removeItem\(APP_LOCK_STORAGE_KEY\)/);
});

test('17.2 keeps App lock device-local and outside Dexie and backup JSON', () => {
  const db = readFileSync(new URL('../src/lib/db.ts', import.meta.url), 'utf8');
  const backup = readFileSync(new URL('../src/lib/backup-json.ts', import.meta.url), 'utf8');
  const lock = readFileSync(new URL('../src/lib/app-lock.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(db, /glitchbudget_app_lock_v1|pin[_-]?verifier|pin[_-]?hash/i);
  assert.doesNotMatch(backup, /glitchbudget_app_lock_v1|APP_LOCK_STORAGE_KEY/);
  assert.doesNotMatch(lock, /fetch\s*\(|axios|XMLHttpRequest|WebSocket|EventSource|sendBeacon|https?:\/\//i);
  assert.doesNotMatch(lock, /localStorage/);
});

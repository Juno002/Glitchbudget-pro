import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  BALANCE_VISIBILITY_STORAGE_KEY,
  LOCAL_SECURITY_CONTRACT,
  LOCAL_SECURITY_LEGACY_DEFAULTS,
} from '../src/domain/local-security';

test('17.1 separates server privacy from device-user privacy', () => {
  assert.deepEqual(LOCAL_SECURITY_CONTRACT.privacyFromServers, {
    boundary: 'architecture',
    status: 'guaranteed-local-only',
    description: 'La privacidad frente a servidores depende de la arquitectura local-only y no de App lock.',
  });
  assert.equal(LOCAL_SECURITY_CONTRACT.appLock.protects, 'ui-access');
  assert.equal(LOCAL_SECURITY_CONTRACT.autoLock.protects, 'ui-session-after-inactivity');
});

test('17.1 defines Hide amounts as presentation privacy, not encryption', () => {
  assert.equal(LOCAL_SECURITY_CONTRACT.hideAmounts.status, 'implemented');
  assert.equal(LOCAL_SECURITY_CONTRACT.hideAmounts.protects, 'visual-disclosure');
  assert.equal(LOCAL_SECURITY_CONTRACT.hideAmounts.storage, 'localStorage');
  assert.equal(LOCAL_SECURITY_CONTRACT.hideAmounts.storageKey, 'glitchbudget_balances_hidden_v1');
  assert.equal(LOCAL_SECURITY_CONTRACT.hideAmounts.legacyDefault, false);
  assert.ok(LOCAL_SECURITY_CONTRACT.hideAmounts.doesNotProtect.includes('dexie-at-rest'));
  assert.ok(LOCAL_SECURITY_CONTRACT.hideAmounts.doesNotProtect.includes('exports'));
});

test('17.1 legacy security defaults remain frozen after App lock and Auto-lock implementation', () => {
  assert.equal(LOCAL_SECURITY_CONTRACT.appLock.status, 'implemented-17.2');
  assert.equal(LOCAL_SECURITY_CONTRACT.appLock.legacyDefault, 'disabled');
  assert.ok(LOCAL_SECURITY_CONTRACT.appLock.doesNotProtect.includes('dexie-at-rest'));

  assert.equal(LOCAL_SECURITY_CONTRACT.autoLock.status, 'implemented-17.3');
  assert.equal(LOCAL_SECURITY_CONTRACT.autoLock.requires, 'app-lock');
  assert.equal(LOCAL_SECURITY_CONTRACT.autoLock.legacyDefault, 'disabled');

  assert.deepEqual(LOCAL_SECURITY_LEGACY_DEFAULTS, {
    hideAmounts: false,
    appLockEnabled: false,
    autoLockEnabled: false,
  });
});

test('17.1 keeps encrypted backup separate, optional and local', () => {
  const backup = LOCAL_SECURITY_CONTRACT.encryptedBackup;
  assert.equal(backup.status, 'implemented-17.5');
  assert.equal(backup.restoreStatus, 'implemented-17.5');
  assert.equal(backup.optional, true);
  assert.equal(backup.crypto, 'web-crypto-authenticated');
  assert.equal(backup.normalJsonRemainsAvailable, true);
  assert.equal(backup.passwordStoredRemotely, false);
  assert.equal(backup.passwordTransmitted, false);
});

test('17.1 binds existing Hide amounts runtime to the canonical storage key and safe legacy default', () => {
  const context = readFileSync(new URL('../src/contexts/balance-visibility-context.tsx', import.meta.url), 'utf8');
  const layout = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');

  assert.match(context, /BALANCE_VISIBILITY_STORAGE_KEY/);
  assert.match(context, /localStorage\.getItem\(BALANCE_VISIBILITY_STORAGE_KEY\) === '1'/);
  assert.match(context, /let hidden = false/);
  assert.match(layout, /BALANCE_VISIBILITY_STORAGE_KEY/);
  assert.equal(BALANCE_VISIBILITY_STORAGE_KEY, 'glitchbudget_balances_hidden_v1');
});

test('17.1 boundaries remain explicit after App lock and Auto-lock implementation', () => {
  const settings = readFileSync(new URL('../src/components/layout/settings-dialog.tsx', import.meta.url), 'utf8');

  assert.match(settings, /no cifra los datos almacenados ni los backups/i);
  assert.match(settings, /AppLockSettings/);
  assert.match(settings, /AutoLockSettings/);

  const privacyBlock = settings.slice(
    settings.indexOf('<TabsContent value="privacy"'),
    settings.indexOf('<TabsContent value="data"'),
  );
  assert.equal((privacyBlock.match(/type="checkbox"/g) || []).length, 1, 'Hide amounts sigue siendo el checkbox directo; Auto-lock vive en su componente');
});

test('17.1 does not introduce lock persistence in Dexie or encrypted-backup behavior early', () => {
  const db = readFileSync(new URL('../src/lib/db.ts', import.meta.url), 'utf8');
  const backup = readFileSync(new URL('../src/lib/backup-json.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(db, /app[_-]?lock|auto[_-]?lock|pin[_-]?hash|security[_-]?credential/i);
  assert.match(backup, /v:\s*12|v:z\.literal\(12\)/);
  assert.doesNotMatch(backup, /AES-GCM|PBKDF2|deriveKey|crypto\.subtle/i);
});

test('17.1 preserves local-only architecture and CSP boundary', () => {
  const layout = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
  const guard = readFileSync(new URL('../scripts/check-local-only.mjs', import.meta.url), 'utf8');

  assert.match(layout, /connect-src 'none'/);
  assert.match(guard, /Local-only source guard passed/);
  assert.match(guard, /Remote SDK/);
});

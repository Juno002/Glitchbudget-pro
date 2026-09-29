import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { db } from '../src/lib/db';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import {
  decryptEncryptedBackupText,
  encryptBackupJSON,
  exportEncryptedBackupText,
  parseEncryptedBackupEnvelopeText,
} from '../src/lib/encrypted-backup';
import { restoreEncryptedBackupText } from '../src/lib/encrypted-backup-restore';
import {
  APP_LOCK_STORAGE_KEY,
  AUTO_LOCK_STORAGE_KEY,
  BALANCE_VISIBILITY_STORAGE_KEY,
  ENCRYPTED_BACKUP_FORMAT,
  LOCAL_SECURITY_CONTRACT,
} from '../src/domain/local-security';
import { enableAppLock, loadAppLockRecord, verifyAppLockPin } from '../src/lib/app-lock';
import { loadAutoLockRecord, saveAutoLockRecord } from '../src/lib/auto-lock';
import {
  clearLocalAutomation,
  exportLocalAutomation,
} from '../src/lib/local-automation';
import { upsertQuickAddTemplate } from '../src/lib/quick-add-templates';
import { upsertSavedTransactionFilter } from '../src/lib/saved-transaction-filters';
import { upsertTransactionRule } from '../src/lib/transaction-rules';

const fixture = (name: string) => JSON.parse(
  readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'),
);

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const clean = (value: unknown) => JSON.parse(JSON.stringify(value));

async function databaseSnapshot() {
  return clean(await db.transaction('r', db.tables, async () => {
    const entries = await Promise.all(db.tables.map(async table => {
      const rows = clean(await table.toArray()) as unknown[];
      rows.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
      return [table.name, rows] as const;
    }));
    return Object.fromEntries(entries);
  }));
}

async function clearDatabase() {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
}

function asLegacyVersion(current: any, version: number) {
  const value = structuredClone(current);
  value.v = version;

  if (version < 13) {
    delete value.schemaVersion;
    delete value.appVersion;
  }
  if (version < 12) delete value.localAutomation;
  if (version < 11) {
    value.incomes = value.incomes.map(({ labels, ...row }: any) => row);
    value.expenses = value.expenses.map(({ necessity, labels, ...row }: any) => row);
  }
  if (version < 10) delete value.investments;
  if (version < 7) delete value.plannedOccurrences;

  if (version <= 5) {
    value.recurrents = [];
    value.settings.incomeCategories = Array.from(new Set(value.incomes.map((row: any) => row.categoryId)));
    value.settings.expenseCategories = Array.from(new Set([
      ...value.expenses.map((row: any) => row.categoryId),
      ...value.plans.map((row: any) => row.categoryId),
    ]));
  }

  return value;
}

after(() => db.close());

test('17.5 closes the security contract without claiming App lock encrypts Dexie', () => {
  assert.equal(LOCAL_SECURITY_CONTRACT.encryptedBackup.status, 'implemented-17.5');
  assert.equal(LOCAL_SECURITY_CONTRACT.encryptedBackup.restoreStatus, 'implemented-17.5');
  assert.ok(LOCAL_SECURITY_CONTRACT.appLock.doesNotProtect.includes('dexie-at-rest'));
  assert.notEqual(APP_LOCK_STORAGE_KEY, AUTO_LOCK_STORAGE_KEY);
  assert.notEqual(APP_LOCK_STORAGE_KEY, BALANCE_VISIBILITY_STORAGE_KEY);
  assert.notEqual(AUTO_LOCK_STORAGE_KEY, BALANCE_VISIBILITY_STORAGE_KEY);
});

test('17.5 validates encrypted envelope metadata before attempting decryption', async () => {
  const encrypted = await exportEncryptedBackupText('{"v":12}', 'backup-password');
  const parsed = JSON.parse(encrypted);

  assert.equal(parseEncryptedBackupEnvelopeText(encrypted).format, ENCRYPTED_BACKUP_FORMAT);

  for (const mutate of [
    (row: any) => { row.format = 'Other backup'; },
    (row: any) => { row.version = 2; },
    (row: any) => { row.kdf.iterations += 1; },
    (row: any) => { row.cipher.keyLength = 128; },
    (row: any) => { row.salt = 'not base64 ***'; },
    (row: any) => { row.nonce = ''; },
    (row: any) => { row.ciphertext = ''; },
  ]) {
    const candidate = structuredClone(parsed);
    mutate(candidate);
    assert.throws(() => parseEncryptedBackupEnvelopeText(JSON.stringify(candidate)));
  }
});

test('17.5 wrong password and tampered ciphertext leave Dexie and local automation unchanged', async () => {
  const storage = new MemoryStorage();
  await importDataJSON(JSON.stringify(fixture('backup-v4')), storage);
  upsertQuickAddTemplate(storage, { id:'before', name:'Before', type:'expense', amount:'10' });

  const canonical = await exportDataJSON(storage);
  const encrypted = await exportEncryptedBackupText(canonical, 'correct-password');

  await clearDatabase();
  clearLocalAutomation(storage);
  const beforeDb = await databaseSnapshot();
  const beforeAutomation = exportLocalAutomation(storage);

  await assert.rejects(
    restoreEncryptedBackupText(encrypted, 'wrong-password', storage),
    /contraseña puede ser incorrecta|archivo puede estar dañado/i,
  );
  assert.deepEqual(await databaseSnapshot(), beforeDb);
  assert.deepEqual(exportLocalAutomation(storage), beforeAutomation);

  const tampered = JSON.parse(encrypted);
  const ciphertext = Buffer.from(tampered.ciphertext, 'base64');
  ciphertext[0] ^= 1;
  tampered.ciphertext = ciphertext.toString('base64');

  await assert.rejects(
    restoreEncryptedBackupText(JSON.stringify(tampered), 'correct-password', storage),
    /contraseña puede ser incorrecta|archivo puede estar dañado/i,
  );
  assert.deepEqual(await databaseSnapshot(), beforeDb);
  assert.deepEqual(exportLocalAutomation(storage), beforeAutomation);
});

test('17.5 round-trip encrypt -> decrypt -> canonical import restores Dexie and local automation', async () => {
  const storage = new MemoryStorage();
  await importDataJSON(JSON.stringify(fixture('backup-v4')), storage);
  upsertQuickAddTemplate(storage, { id:'bus', name:'Bus', type:'expense', amount:'35', categoryId:'food' });
  upsertSavedTransactionFilter(storage, { id:'expenses', name:'Gastos', filters:{type:'expense'} });
  upsertTransactionRule(storage, {
    id:'spotify',
    name:'Spotify',
    enabled:true,
    applyAutomatically:true,
    condition:{field:'description',operator:'contains',value:'Spotify'},
    suggestion:{categoryId:'food',necessity:'want'},
  });

  const expectedDb = await databaseSnapshot();
  const expectedAutomation = exportLocalAutomation(storage);
  const canonical = await exportDataJSON(storage);
  const encrypted = await exportEncryptedBackupText(canonical, 'roundtrip-password');

  assert.equal(await decryptEncryptedBackupText(encrypted, 'roundtrip-password'), canonical);

  await clearDatabase();
  clearLocalAutomation(storage);
  await restoreEncryptedBackupText(encrypted, 'roundtrip-password', storage);

  assert.deepEqual(await databaseSnapshot(), expectedDb);
  assert.deepEqual(clean(exportLocalAutomation(storage)), clean(expectedAutomation));
});

test('17.5 normal JSON importer still accepts version contracts v3 through v12', async () => {
  const storage = new MemoryStorage();
  await importDataJSON(JSON.stringify(fixture('backup-v4')), storage);
  const current = JSON.parse(await exportDataJSON(storage));

  for (let version = 3; version <= 12; version += 1) {
    const candidate = asLegacyVersion(current, version);
    await assert.doesNotReject(
      importDataJSON(JSON.stringify(candidate), storage),
      `JSON v${version} debe seguir dentro del contrato del importador`,
    );
  }
});

test('17.5 App lock legacy/wrong PIN and Auto-lock dependency remain intact', async () => {
  const storage = new MemoryStorage();
  assert.equal(loadAppLockRecord(storage), null);
  assert.equal(loadAutoLockRecord(storage), null);

  const record = await enableAppLock(storage, '123456');
  assert.equal(await verifyAppLockPin(record, '000000'), false);
  assert.equal(await verifyAppLockPin(record, '123456'), true);

  saveAutoLockRecord(storage, 5);
  assert.equal(loadAutoLockRecord(storage)?.timeoutMinutes, 5);
});

test('17.5 Hide amounts coexists outside the App lock gate and remains presentation-only', () => {
  const layout = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
  const gate = readFileSync(new URL('../src/components/security/app-lock-gate.tsx', import.meta.url), 'utf8');

  const balanceProvider = layout.indexOf('<BalanceVisibilityProvider>');
  const lockProvider = layout.indexOf('<AppLockProvider>');
  const lockGate = layout.indexOf('<AppLockGate>');
  const finance = layout.indexOf('<FinanceProvider>');

  assert.ok(balanceProvider >= 0 && lockProvider >= 0 && lockGate >= 0 && finance >= 0);
  assert.ok(balanceProvider < lockProvider);
  assert.ok(lockProvider < lockGate);
  assert.ok(lockGate < finance);
  assert.doesNotMatch(gate, /BALANCE_VISIBILITY_STORAGE_KEY|glitchbudget_balances_hidden_v1/);
});

test('17.5 encrypted restore UI asks for password locally and uses the canonical restore helper', () => {
  const dialog = readFileSync(new URL('../src/components/backup/opfs-backup-dialog.tsx', import.meta.url), 'utf8');
  const restore = readFileSync(new URL('../src/components/backup/encrypted-backup-restore.tsx', import.meta.url), 'utf8');
  const context = readFileSync(new URL('../src/contexts/finance-context.tsx', import.meta.url), 'utf8');
  const helper = readFileSync(new URL('../src/lib/encrypted-backup-restore.ts', import.meta.url), 'utf8');

  assert.match(dialog, /EncryptedBackupRestore/);
  assert.match(restore, /Restaurar cifrado/);
  assert.match(restore, /Contraseña del backup/);
  assert.match(restore, /Tus datos actuales no se reemplazarán hasta que revises el resumen y confirmes/);
  assert.match(restore, /previewEncryptedBackupText/);
  assert.match(context, /restoreEncryptedBackupText\(encryptedText, password\)/);
  assert.match(helper, /decryptEncryptedBackupText/);
  assert.match(helper, /importDataJSON/);
  assert.ok(helper.indexOf('decryptEncryptedBackupText') < helper.indexOf('importDataJSON(json'));
});

test('17.5 entire security path stays local-only and never stores or transmits backup passwords', () => {
  const paths = [
    '../src/lib/encrypted-backup.ts',
    '../src/lib/encrypted-backup-restore.ts',
    '../src/components/backup/encrypted-backup-export.tsx',
    '../src/components/backup/encrypted-backup-restore.tsx',
    '../src/lib/app-lock.ts',
    '../src/lib/auto-lock.ts',
  ];
  const combined = paths.map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

  assert.doesNotMatch(combined, /fetch\s*\(|axios|XMLHttpRequest|WebSocket|EventSource|sendBeacon|https?:\/\//i);
  assert.doesNotMatch(combined, /password[^\n]*(localStorage|sessionStorage|indexedDB)|(?:localStorage|sessionStorage|indexedDB)[^\n]*password/i);
});

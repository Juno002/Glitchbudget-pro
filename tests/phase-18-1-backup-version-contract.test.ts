import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import {
  CURRENT_APP_VERSION,
  CURRENT_BACKUP_FORMAT_VERSION,
  exportDataJSON,
  importDataJSON,
} from '../src/lib/backup-json';
import {
  CURRENT_DB_SCHEMA_VERSION,
  GlitchBudgetDB,
  db,
} from '../src/lib/db';
import { exportEncryptedBackupText, decryptEncryptedBackupText } from '../src/lib/encrypted-backup';

const fixture = (name: string) => JSON.parse(
  readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'),
);
const clean = (value: unknown) => JSON.parse(JSON.stringify(value));

async function snapshot() {
  return clean(await db.transaction('r', db.tables, async () =>
    Object.fromEntries(await Promise.all(db.tables.map(async table => [table.name, await table.toArray()]))),
  ));
}

after(() => db.close());

test('18.1 separates backup format, Dexie schema and app version', async () => {
  const packageInfo = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  );
  const isolated = new GlitchBudgetDB('phase18-version-contract');
  try {
    assert.equal(CURRENT_BACKUP_FORMAT_VERSION, 14);
    assert.equal(CURRENT_DB_SCHEMA_VERSION, 15);
    assert.equal(isolated.verno, CURRENT_DB_SCHEMA_VERSION);
    assert.equal(CURRENT_APP_VERSION, packageInfo.version);
  } finally {
    await isolated.delete();
  }
});

test('18.1 current export carries mandatory schemaVersion appVersion and exportedAt metadata', async () => {
  await importDataJSON(JSON.stringify(fixture('backup-v4')));
  const exported = JSON.parse(await exportDataJSON());

  assert.equal(exported.v, CURRENT_BACKUP_FORMAT_VERSION);
  assert.equal(exported.schemaVersion, CURRENT_DB_SCHEMA_VERSION);
  assert.equal(exported.appVersion, CURRENT_APP_VERSION);
  assert.equal(typeof exported.exportedAt, 'string');
  assert.ok(Number.isFinite(Date.parse(exported.exportedAt)));
  assert.match(exported.exportedAt, /Z$/);
});

test('18.1 v14 rejects missing mandatory metadata before destructive import', async () => {
  await importDataJSON(JSON.stringify(fixture('backup-v4')));
  const before = await snapshot();
  const exported = JSON.parse(await exportDataJSON());

  for (const field of ['schemaVersion', 'appVersion', 'exportedAt']) {
    const invalid = structuredClone(exported);
    delete invalid[field];
    await assert.rejects(importDataJSON(JSON.stringify(invalid)));
    assert.deepEqual(await snapshot(), before, field);
  }
});

test('18.1 rejects backups from a future persistent schema without modifying current data', async () => {
  await importDataJSON(JSON.stringify(fixture('backup-v4')));
  const before = await snapshot();
  const future = JSON.parse(await exportDataJSON());
  future.schemaVersion = CURRENT_DB_SCHEMA_VERSION + 1;

  await assert.rejects(
    importDataJSON(JSON.stringify(future)),
    /versión más reciente del esquema/i,
  );
  assert.deepEqual(await snapshot(), before);
});

test('18.1 preserves legacy JSON v12 import compatibility', async () => {
  await importDataJSON(JSON.stringify(fixture('backup-v4')));
  const current = JSON.parse(await exportDataJSON());
  const legacyV12 = structuredClone(current);
  legacyV12.v = 12;
  delete legacyV12.schemaVersion;
  delete legacyV12.appVersion;

  await assert.doesNotReject(importDataJSON(JSON.stringify(legacyV12)));
  const roundTrip = JSON.parse(await exportDataJSON());
  assert.equal(roundTrip.v, 14);
  assert.equal(roundTrip.schemaVersion, 15);
  assert.equal(roundTrip.appVersion, CURRENT_APP_VERSION);
});

test('18.1 preserves legacy JSON v13 import compatibility after v14', async () => {
  await importDataJSON(JSON.stringify(fixture('backup-v4')));
  const current = JSON.parse(await exportDataJSON());
  const legacyV13 = structuredClone(current);
  legacyV13.v = 13;
  delete legacyV13.preservedDebtPayments;

  await assert.doesNotReject(importDataJSON(JSON.stringify(legacyV13)));
  const roundTrip = JSON.parse(await exportDataJSON());
  assert.equal(roundTrip.v, 14);
});

test('18.1 rejects future backup formats with an explicit newer-version message before writing', async () => {
  await importDataJSON(JSON.stringify(fixture('backup-v4')));
  const before = await snapshot();
  const future = JSON.parse(await exportDataJSON());
  future.v = CURRENT_BACKUP_FORMAT_VERSION + 1;

  await assert.rejects(
    importDataJSON(JSON.stringify(future)),
    /versión más reciente de Prisma/i,
  );
  assert.deepEqual(await snapshot(), before);
});

test('18.1 encrypted backup automatically inherits the new internal JSON metadata', async () => {
  await importDataJSON(JSON.stringify(fixture('backup-v4')));
  const normal = await exportDataJSON();
  const encrypted = await exportEncryptedBackupText(normal, 'phase18-password');
  const decrypted = await decryptEncryptedBackupText(encrypted, 'phase18-password');
  const payload = JSON.parse(decrypted);

  assert.equal(payload.v, 14);
  assert.equal(payload.schemaVersion, 15);
  assert.equal(payload.appVersion, CURRENT_APP_VERSION);
  assert.ok(payload.exportedAt);
});

test('18.1 does not introduce preview, OPFS pre-import or automatic table coverage early', () => {
  const plan = readFileSync(new URL('../docs/roadmap/phase-18.md', import.meta.url), 'utf8');
  const backup = readFileSync(new URL('../src/lib/backup-json.ts', import.meta.url), 'utf8');

  assert.match(plan, /18\.2 — Cobertura automática de tablas/);
  assert.match(plan, /18\.3 — Preview y confirmación de import/);
  assert.match(plan, /18\.4 — Backup OPFS automático pre-import/);
  assert.doesNotMatch(backup, /backupPreview|preImportBackup|AUTO_BACKUP_TABLES/);
});

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { db } from '../src/lib/db';
import {
  exportDataJSON,
  importDataJSON,
  previewDataJSON,
} from '../src/lib/backup-json';
import {
  exportEncryptedBackupText,
} from '../src/lib/encrypted-backup';
import {
  previewEncryptedBackupText,
} from '../src/lib/encrypted-backup-restore';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/backup-v4.json', import.meta.url), 'utf8'),
);

const clean = (value: unknown) => JSON.parse(JSON.stringify(value));

async function snapshot() {
  return clean(await db.transaction('r', db.tables, async () =>
    Object.fromEntries(await Promise.all(db.tables.map(async table => [
      table.name,
      (await table.toArray()).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    ]))),
  ));
}

after(() => db.close());

test('18.3 preview validates without mutating Dexie', async () => {
  await importDataJSON(JSON.stringify(fixture));
  const before = await snapshot();
  const current = await exportDataJSON();

  const preview = previewDataJSON(current);

  assert.deepEqual(await snapshot(), before);
  assert.equal(preview.formatVersion, 13);
  assert.equal(preview.schemaVersion, 14);
  assert.equal(preview.appVersion, '0.1.0');
  assert.ok(preview.exportedAt);
});

test('18.3 preview reports the roadmap summary dimensions from validated content', async () => {
  await importDataJSON(JSON.stringify(fixture));
  const dump = JSON.parse(await exportDataJSON());
  const preview = previewDataJSON(JSON.stringify(dump));

  assert.equal(preview.accounts, dump.accounts.length);
  assert.equal(
    preview.transactions,
    dump.incomes.length
      + dump.expenses.length
      + dump.debtPayments.length
      + dump.accountTransfers.length,
  );
  assert.equal(preview.budgets, dump.plans.length);
  assert.equal(preview.goals, dump.goals.length);
  assert.equal(preview.cards, dump.debts.length);
  assert.equal(preview.investments, dump.investments.length);
});

test('18.3 invalid preview fails before any destructive write', async () => {
  await importDataJSON(JSON.stringify(fixture));
  const before = await snapshot();
  const invalid = JSON.parse(await exportDataJSON());
  delete invalid.accounts;

  assert.throws(() => previewDataJSON(JSON.stringify(invalid)));
  assert.deepEqual(await snapshot(), before);
});

test('18.3 encrypted preview authenticates decrypts and returns the same validated summary without restore', async () => {
  await importDataJSON(JSON.stringify(fixture));
  const before = await snapshot();
  const json = await exportDataJSON();
  const normalPreview = previewDataJSON(json);
  const encrypted = await exportEncryptedBackupText(json, 'phase18-preview-password');

  const encryptedPreview = await previewEncryptedBackupText(
    encrypted,
    'phase18-preview-password',
  );

  assert.deepEqual(encryptedPreview, normalPreview);
  assert.deepEqual(await snapshot(), before);

  await assert.rejects(
    previewEncryptedBackupText(encrypted, 'wrong-password'),
    /contraseña puede ser incorrecta|archivo puede estar dañado/i,
  );
  assert.deepEqual(await snapshot(), before);
});

test('18.3 preview and destructive import share one preparation/validation path', () => {
  const backup = readFileSync(new URL('../src/lib/backup-json.ts', import.meta.url), 'utf8');

  assert.match(
    backup,
    /export function previewDataJSON[\s\S]*return prepareDataJSONImport\(text, storage\)\.preview;/,
  );
  assert.match(
    backup,
    /export async function importDataJSON[\s\S]*const prepared = prepareDataJSONImport\(text, storage\);/,
  );
  assert.equal((backup.match(/function prepareDataJSONImport\(/g) || []).length, 1);
});

test('18.3 JSON and OPFS restore UI require a validated preview before confirmation', () => {
  const dialog = readFileSync(new URL('../src/components/backup/opfs-backup-dialog.tsx', import.meta.url), 'utf8');
  const confirmation = readFileSync(new URL('../src/components/backup/import-confirmation.tsx', import.meta.url), 'utf8');

  assert.match(dialog, /previewDataJSON\(await file\.text\(\)\)/);
  assert.match(dialog, /prepareLocalRestore/);
  assert.match(dialog, /pendingPreview/);
  assert.match(dialog, /<ImportConfirmation[\s\S]*preview=\{pendingPreview\}/);
  assert.match(confirmation, /BackupPreviewSummary/);
  assert.match(confirmation, /Confirmar y restaurar/);
  assert.match(confirmation, /open=\{!!file && !!preview\}/);
});

test('18.3 encrypted UI is explicitly two-step: review then confirm', () => {
  const encrypted = readFileSync(new URL('../src/components/backup/encrypted-backup-restore.tsx', import.meta.url), 'utf8');

  assert.match(encrypted, /previewEncryptedBackupText/);
  assert.match(encrypted, /Revisar backup/);
  assert.match(encrypted, /BackupPreviewSummary/);
  assert.match(encrypted, /Confirmar y restaurar/);
  assert.match(encrypted, /setPreview\(null\)/);
});

test('18.3 does not implement the 18.4 automatic OPFS pre-import backup early', () => {
  const dialog = readFileSync(new URL('../src/components/backup/opfs-backup-dialog.tsx', import.meta.url), 'utf8');
  const context = readFileSync(new URL('../src/contexts/finance-context.tsx', import.meta.url), 'utf8');

  const confirmStart = dialog.indexOf('const confirmPendingRestore');
  const confirmEnd = dialog.indexOf('const handleDelete', confirmStart);
  const confirmBlock = dialog.slice(confirmStart, confirmEnd);

  assert.doesNotMatch(confirmBlock, /createBackup/);
  assert.doesNotMatch(context, /preImportBackup|automatic pre-import|backupBeforeImport/i);
});

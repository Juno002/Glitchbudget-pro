import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { db } from '../src/lib/db';
import {
  exportDataJSON,
  importDataJSON,
} from '../src/lib/backup-json';
import { createPreImportSafetyBackup } from '../src/lib/pre-import-backup';
import { exportEncryptedBackupText } from '../src/lib/encrypted-backup';
import { restoreEncryptedBackupText } from '../src/lib/encrypted-backup-restore';
import { importPlansCSV, serializeTableCSV } from '../src/lib/csv-backup';

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

test('18.4 OPFS unavailable returns an explicit unavailable result without inventing a backup', async () => {
  let exported = 0;
  let written = 0;

  const result = await createPreImportSafetyBackup({
    hasOPFS: async () => false,
    exportDataJSON: async () => {
      exported += 1;
      return '{}';
    },
    write: async () => {
      written += 1;
    },
  });

  assert.deepEqual(result, { status: 'unavailable' });
  assert.equal(exported, 0);
  assert.equal(written, 0);
});

test('18.4 available OPFS writes the current canonical JSON under an automatic pre-import name', async () => {
  const writes: Array<{ name: string; text: string }> = [];

  const result = await createPreImportSafetyBackup({
    hasOPFS: async () => true,
    exportDataJSON: async () => '{"v":13,"current":"state"}',
    write: async (name, text) => {
      writes.push({ name, text });
    },
    now: () => new Date('2026-09-29T12:34:56.789Z'),
    id: () => 'abc12345',
  });

  assert.deepEqual(result, {
    status: 'created',
    name: 'glitchbudget-pre-import-2026-09-29T12-34-56-789Z-abc12345.json',
  });
  assert.deepEqual(writes, [{
    name: 'glitchbudget-pre-import-2026-09-29T12-34-56-789Z-abc12345.json',
    text: '{"v":13,"current":"state"}',
  }]);
});

test('18.4 OPFS write failure becomes a protective import-cancellation error', async () => {
  await assert.rejects(
    createPreImportSafetyBackup({
      hasOPFS: async () => true,
      exportDataJSON: async () => '{"v":13}',
      write: async () => {
        throw new Error('disk full');
      },
      now: () => new Date('2026-09-29T12:34:56.789Z'),
      id: () => 'failure1',
    }),
    /copia local automática previa.*importación fue cancelada.*disk full/i,
  );
});

test('18.4 validates incoming JSON before invoking the pre-write safety backup', async () => {
  await importDataJSON(JSON.stringify(fixture));
  const before = await snapshot();
  const invalid = JSON.parse(await exportDataJSON());
  delete invalid.accounts;

  let hookCalls = 0;
  await assert.rejects(
    importDataJSON(JSON.stringify(invalid), undefined, {
      beforeWrite: async () => {
        hookCalls += 1;
      },
    }),
  );

  assert.equal(hookCalls, 0);
  assert.deepEqual(await snapshot(), before);
});

test('18.4 a failed safety backup aborts a valid destructive import before Dexie changes', async () => {
  await importDataJSON(JSON.stringify(fixture));
  const before = await snapshot();
  const incoming = await exportDataJSON();
  let hookCalls = 0;

  await assert.rejects(
    importDataJSON(incoming, undefined, {
      beforeWrite: async () => {
        hookCalls += 1;
        throw new Error('pre-import backup failed');
      },
    }),
    /pre-import backup failed/,
  );

  assert.equal(hookCalls, 1);
  assert.deepEqual(await snapshot(), before);
});

test('18.4 successful pre-write hook runs exactly once before a valid import', async () => {
  await importDataJSON(JSON.stringify(fixture));
  const incoming = JSON.parse(await exportDataJSON());
  incoming.settings.savePct = 0.37;

  let hookCalls = 0;
  let snapshotAtHook: unknown = null;
  const before = await snapshot();

  await importDataJSON(JSON.stringify(incoming), undefined, {
    beforeWrite: async () => {
      hookCalls += 1;
      snapshotAtHook = await snapshot();
    },
  });

  assert.equal(hookCalls, 1);
  assert.deepEqual(snapshotAtHook, before);
  assert.equal((await db.settings.get('general'))?.savePct, 0.37);
});

test('18.4 encrypted restore authenticates and validates before invoking the same pre-write hook', async () => {
  await importDataJSON(JSON.stringify(fixture));
  const before = await snapshot();
  const json = await exportDataJSON();
  const encrypted = await exportEncryptedBackupText(json, 'phase18-4-password');

  let hookCalls = 0;
  await assert.rejects(
    restoreEncryptedBackupText(
      encrypted,
      'wrong-password',
      undefined,
      { beforeWrite: async () => { hookCalls += 1; } },
    ),
    /contraseña puede ser incorrecta|archivo puede estar dañado/i,
  );
  assert.equal(hookCalls, 0);
  assert.deepEqual(await snapshot(), before);

  await restoreEncryptedBackupText(
    encrypted,
    'phase18-4-password',
    undefined,
    { beforeWrite: async () => { hookCalls += 1; } },
  );
  assert.equal(hookCalls, 1);
});

test('18.4 destructive CSV import validates before the same pre-write safety hook', async () => {
  await importDataJSON(JSON.stringify(fixture));
  const before = await snapshot();
  let hookCalls = 0;

  const invalid = new File(['wrong\nvalue'], 'plans.csv', { type: 'text/csv' });
  await assert.rejects(
    importPlansCSV(invalid, {
      beforeWrite: async () => { hookCalls += 1; },
    }),
  );
  assert.equal(hookCalls, 0);
  assert.deepEqual(await snapshot(), before);

  const csv = await serializeTableCSV('plans');
  const valid = new File([csv], 'plans.csv', { type: 'text/csv' });
  await assert.rejects(
    importPlansCSV(valid, {
      beforeWrite: async () => {
        hookCalls += 1;
        throw new Error('csv pre-import backup failed');
      },
    }),
    /csv pre-import backup failed/,
  );
  assert.equal(hookCalls, 1);
  assert.deepEqual(await snapshot(), before);
});

test('18.4 all destructive full-backup routes use the automatic pre-import safety hook', () => {
  const backupHook = readFileSync(new URL('../src/hooks/use-backup-management.ts', import.meta.url), 'utf8');

  assert.match(backupHook, /const backupBeforeDestructiveImport = useCallback/);
  assert.match(backupHook, /createPreImportSafetyBackup\(\)/);
  assert.match(
    backupHook,
    /importDataJSON\(fileContent, undefined, \{ beforeWrite: backupBeforeDestructiveImport \}\)/,
  );
  assert.match(
    backupHook,
    /importDataJSON\(text, undefined, \{ beforeWrite: backupBeforeDestructiveImport \}\)/,
  );
  assert.match(
    backupHook,
    /restoreEncryptedBackupText\([\s\S]*\{ beforeWrite: backupBeforeDestructiveImport \}/,
  );

  const csv = readFileSync(new URL('../src/components/backup/csv-backup-dialog.tsx', import.meta.url), 'utf8');
  assert.match(csv, /beforeWrite: backupBeforeDestructiveImport/);
});

test('18.4 UI messaging distinguishes created backup from unavailable OPFS', () => {
  const backupHook = readFileSync(new URL('../src/hooks/use-backup-management.ts', import.meta.url), 'utf8');

  assert.match(backupHook, /Copia de seguridad automática creada/);
  assert.match(backupHook, /Sin copia automática previa/);
  assert.match(
    backupHook,
    /OPFS no está disponible en este navegador\. La restauración continuará sin una copia local previa\./,
  );
});

test('18.4 remains local-only and does not advance the permanent migration gate early', () => {
  const helper = readFileSync(new URL('../src/lib/pre-import-backup.ts', import.meta.url), 'utf8');
  const roadmap = readFileSync(new URL('../docs/roadmap/phase-18.md', import.meta.url), 'utf8');

  assert.doesNotMatch(helper, /fetch\s*\(|axios|XMLHttpRequest|WebSocket|EventSource|sendBeacon|https?:\/\//i);
  assert.match(roadmap, /18\.5 — Migraciones permanentes \+ hardening \+ gate final/);
});

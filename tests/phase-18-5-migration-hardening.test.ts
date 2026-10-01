import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import Dexie from 'dexie';
import {
  CURRENT_BACKUP_FORMAT_VERSION,
  exportDataJSON,
  importDataJSON,
  previewDataJSON,
} from '../src/lib/backup-json';
import {
  BACKUP_TABLE_COVERAGE,
  BACKUP_TABLE_NAMES,
  REQUIRED_BACKUP_COVERAGE_ROUTES,
  assertBackupTableCoverage,
} from '../src/lib/backup-table-coverage';
import {
  CURRENT_DB_SCHEMA_VERSION,
  GlitchBudgetDB,
  db,
} from '../src/lib/db';
import { exportEncryptedBackupText } from '../src/lib/encrypted-backup';
import { restoreEncryptedBackupText } from '../src/lib/encrypted-backup-restore';
import { createPreImportSafetyBackup } from '../src/lib/pre-import-backup';

const fixture = (name: string) => JSON.parse(
  readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'),
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

function historicalIdentity(row: Record<string, unknown>): string {
  if (typeof row.id === 'string') return `id:${row.id}`;
  if (typeof row.month === 'string' && typeof row.categoryId === 'string') {
    return `plan:${row.month}:${row.categoryId}`;
  }
  return JSON.stringify(row);
}

after(() => db.close());

test('18.5 persistent Dexie schema history is contiguous and production migrations contain no destructive reset strategy', () => {
  const source = readFileSync(new URL('../src/lib/db.ts', import.meta.url), 'utf8');
  const versions = [...source.matchAll(/this\.version\((CURRENT_DB_SCHEMA_VERSION|\d+)\)/g)]
    .map(match => match[1] === 'CURRENT_DB_SCHEMA_VERSION'
      ? CURRENT_DB_SCHEMA_VERSION
      : Number(match[1]));

  const unique = [...new Set(versions)].sort((a, b) => a - b);
  const expected = Array.from(
    { length: CURRENT_DB_SCHEMA_VERSION - 5 },
    (_, index) => index + 6,
  );

  assert.deepEqual(unique, expected);
  assert.equal(unique.at(-1), CURRENT_DB_SCHEMA_VERSION);

  assert.doesNotMatch(source, /\.clear\s*\(/);
  assert.doesNotMatch(source, /\.delete\s*\(/);
  assert.doesNotMatch(source, /deleteDatabase|indexedDB\.deleteDatabase/);
});

for (const version of [6, 7]) {
  test(`18.5 frozen Dexie v${version} fixture preserves every historical record identity through current migrations`, async () => {
    const source = fixture(`dexie-v${version}`);
    const name = `phase18-5-migration-v${version}`;
    const old = new Dexie(name);
    old.version(version).stores(source.schema);

    for (const [table, rows] of Object.entries(source.tables)) {
      await old.table(table).bulkAdd(rows as object[]);
    }
    old.close();

    const current = new GlitchBudgetDB(name);
    try {
      await current.open();
      assert.equal(current.verno, CURRENT_DB_SCHEMA_VERSION);

      for (const [table, rows] of Object.entries(source.tables)) {
        const migrated = clean(await current.table(table).toArray()) as Record<string, unknown>[];
        const expectedIds = (rows as Record<string, unknown>[])
          .map(historicalIdentity)
          .sort();
        const actualIds = migrated.map(historicalIdentity).sort();

        assert.equal(migrated.length, (rows as unknown[]).length, table);
        assert.deepEqual(actualIds, expectedIds, table);
      }
    } finally {
      await current.delete();
    }
  });
}

test('18.5 backup coverage remains fail-closed for every live Dexie table and any future unregistered table', () => {
  const live = db.tables.map(table => table.name);
  assert.deepEqual([...BACKUP_TABLE_NAMES].sort(), [...live].sort());
  assert.doesNotThrow(() => assertBackupTableCoverage(live));

  for (const entry of BACKUP_TABLE_COVERAGE) {
    assert.deepEqual([...entry.routes], [...REQUIRED_BACKUP_COVERAGE_ROUTES], entry.table);
    assert.ok(entry.migrationTest.trim(), entry.table);
  }

  assert.throws(
    () => assertBackupTableCoverage([...live, 'future_phase18_table']),
    /future_phase18_table.*export\/import\/restore\/validation\/migration tests/i,
  );
});

test('18.5 legacy backup compatibility keeps real v4 and synthetic v12 readable while current exports stay v13', async () => {
  await assert.doesNotReject(importDataJSON(JSON.stringify(fixture('backup-v4'))));

  const current = JSON.parse(await exportDataJSON());
  assert.equal(current.v, CURRENT_BACKUP_FORMAT_VERSION);
  assert.equal(current.schemaVersion, CURRENT_DB_SCHEMA_VERSION);
  assert.equal(typeof current.appVersion, 'string');
  assert.ok(current.appVersion.length > 0);
  assert.ok(Number.isFinite(Date.parse(current.exportedAt)));

  const legacyV12 = structuredClone(current);
  legacyV12.v = 12;
  delete legacyV12.schemaVersion;
  delete legacyV12.appVersion;

  await assert.doesNotReject(importDataJSON(JSON.stringify(legacyV12)));
  const upgraded = JSON.parse(await exportDataJSON());
  assert.equal(upgraded.v, CURRENT_BACKUP_FORMAT_VERSION);
  assert.equal(upgraded.schemaVersion, CURRENT_DB_SCHEMA_VERSION);

  const source = readFileSync(new URL('../src/lib/backup-json.ts', import.meta.url), 'utf8');
  assert.match(source, /z\.union\(\[z\.literal\(3\), z\.literal\(4\), z\.literal\(5\)\]\)/);
  for (const version of [6, 7, 8, 9, 10, 11, 12]) {
    assert.match(source, new RegExp(`version===${version}`));
  }
});

test('18.5 current metadata and preview reject an incompatible future schema before any write', async () => {
  await importDataJSON(JSON.stringify(fixture('backup-v4')));
  const before = await snapshot();
  const current = JSON.parse(await exportDataJSON());

  const preview = previewDataJSON(JSON.stringify(current));
  assert.equal(preview.formatVersion, CURRENT_BACKUP_FORMAT_VERSION);
  assert.equal(preview.schemaVersion, CURRENT_DB_SCHEMA_VERSION);
  assert.equal(preview.accounts, current.accounts.length);
  assert.equal(preview.budgets, current.plans.length);
  assert.equal(preview.goals, current.goals.length);
  assert.equal(preview.investments, current.investments.length);

  const future = structuredClone(current);
  future.schemaVersion = CURRENT_DB_SCHEMA_VERSION + 1;

  let hookCalls = 0;
  await assert.rejects(
    importDataJSON(JSON.stringify(future), undefined, {
      beforeWrite: async () => { hookCalls += 1; },
    }),
    /versión más reciente del esquema/i,
  );

  assert.equal(hookCalls, 0);
  assert.deepEqual(await snapshot(), before);
});

test('18.5 JSON restore and encrypted restore keep the validated pre-write safety hook and preserve round-trip data', async () => {
  await importDataJSON(JSON.stringify(fixture('backup-v4')));
  const exported = await exportDataJSON();
  const before = await snapshot();

  let jsonHooks = 0;
  await importDataJSON(exported, undefined, {
    beforeWrite: async () => {
      jsonHooks += 1;
      assert.deepEqual(await snapshot(), before);
    },
  });
  assert.equal(jsonHooks, 1);
  assert.deepEqual(await snapshot(), before);

  const encrypted = await exportEncryptedBackupText(exported, 'phase18-5-password');
  let encryptedHooks = 0;
  await restoreEncryptedBackupText(
    encrypted,
    'phase18-5-password',
    undefined,
    {
      beforeWrite: async () => {
        encryptedHooks += 1;
        assert.deepEqual(await snapshot(), before);
      },
    },
  );

  assert.equal(encryptedHooks, 1);
  assert.deepEqual(await snapshot(), before);
});

test('18.5 OPFS pre-import safety copy still uses the canonical current JSON and fails closed on write errors', async () => {
  await importDataJSON(JSON.stringify(fixture('backup-v4')));
  const current = await exportDataJSON();
  const writes: Array<{ name: string; text: string }> = [];

  const result = await createPreImportSafetyBackup({
    hasOPFS: async () => true,
    exportDataJSON: async () => current,
    write: async (name, text) => {
      writes.push({ name, text });
    },
    now: () => new Date('2026-09-29T15:00:00.000Z'),
    id: () => 'gate185',
  });

  assert.equal(result.status, 'created');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].text, current);
  assert.match(writes[0].name, /^prisma-pre-import-/);

  await assert.rejects(
    createPreImportSafetyBackup({
      hasOPFS: async () => true,
      exportDataJSON: async () => current,
      write: async () => { throw new Error('storage failure'); },
      now: () => new Date('2026-09-29T15:00:00.000Z'),
      id: () => 'gate185-fail',
    }),
    /importación fue cancelada.*storage failure/i,
  );
});

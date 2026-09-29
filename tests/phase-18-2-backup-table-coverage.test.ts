import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import {
  BACKUP_TABLE_COVERAGE,
  BACKUP_TABLE_KEYS,
  BACKUP_TABLE_NAMES,
  REQUIRED_BACKUP_COVERAGE_ROUTES,
  assertBackupTableCoverage,
} from '../src/lib/backup-table-coverage';
import { db } from '../src/lib/db';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';

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

async function seedCoverageOnlyTables() {
  await db.planned_occurrences.put({
    id:'phase18-coverage-occurrence',
    ruleId:'rule',
    scheduledDate:'2026-10-15',
    status:'pending',
  });

  await db.accounts.put({
    id:'phase18-investment-account',
    name:'Coverage investment',
    type:'investment',
    currency:'DOP',
    openingBalance:5_000,
    startDate:'2026-01-01',
  });
  await db.investments.put({
    id:'phase18-investment',
    accountId:'phase18-investment-account',
    type:'certificate',
    name:'Coverage investment',
    openedAt:'2026-01-01',
    principal:5_000,
    status:'active',
  });
}

after(() => db.close());

test('18.2 canonical inventory exactly matches every live Dexie table', () => {
  const live = db.tables.map(table => table.name).sort();
  const covered = [...BACKUP_TABLE_NAMES].sort();

  assert.equal(live.length, 16);
  assert.deepEqual(covered, live);
  assert.doesNotThrow(() => assertBackupTableCoverage(live));
});

test('18.2 every covered table declares all five roadmap routes', () => {
  for (const entry of BACKUP_TABLE_COVERAGE) {
    assert.deepEqual([...entry.routes], [...REQUIRED_BACKUP_COVERAGE_ROUTES], entry.table);
    assert.ok(entry.backupKey.length > 0, entry.table);
    assert.match(entry.migrationTest, /phase-18-2 full-table round-trip/);
  }
  assert.equal(new Set(BACKUP_TABLE_KEYS).size, BACKUP_TABLE_KEYS.length);
});

test('18.2 a newly discovered Dexie table fails coverage immediately', () => {
  assert.throws(
    () => assertBackupTableCoverage([...db.tables.map(table => table.name), 'future_table']),
    /future_table.*export\/import\/restore\/validation\/migration tests/i,
  );
});

test('18.2 current export contains a key for every table, including empty stores', async () => {
  await importDataJSON(JSON.stringify(fixture));
  const dump = JSON.parse(await exportDataJSON());

  for (const entry of BACKUP_TABLE_COVERAGE) {
    assert.ok(Object.prototype.hasOwnProperty.call(dump, entry.backupKey), entry.table);
  }
  assert.deepEqual(dump.plannedOccurrences, []);
  assert.deepEqual(dump.investments, []);
});

test('18.2 current v13 validation rejects omission of any table-backed backup key atomically', async () => {
  await importDataJSON(JSON.stringify(fixture));
  const before = await snapshot();
  const dump = JSON.parse(await exportDataJSON());

  for (const entry of BACKUP_TABLE_COVERAGE) {
    const invalid = structuredClone(dump);
    delete invalid[entry.backupKey];
    await assert.rejects(importDataJSON(JSON.stringify(invalid)), undefined, entry.table);
    assert.deepEqual(await snapshot(), before, entry.table);
  }
});

test('18.2 full-table round-trip preserves every current Dexie table', async () => {
  await importDataJSON(JSON.stringify(fixture));
  await seedCoverageOnlyTables();

  const before = await snapshot();
  for (const tableName of BACKUP_TABLE_NAMES) {
    assert.ok((before[tableName] as unknown[]).length > 0, tableName + ' must be non-empty for the coverage gate');
  }

  const exported = await exportDataJSON();

  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
  for (const table of db.tables) assert.equal(await table.count(), 0, table.name);

  const result = await importDataJSON(exported);
  const after = await snapshot();

  assert.deepEqual(after, before);
  for (const tableName of BACKUP_TABLE_NAMES) {
    assert.equal(result.counts[tableName], (after[tableName] as unknown[]).length, tableName);
  }
});

test('18.2 restore clear/count paths are registry-driven rather than duplicated table lists', () => {
  const backup = readFileSync(new URL('../src/lib/backup-json.ts', import.meta.url), 'utf8');

  assert.match(backup, /assertBackupTableCoverage\(db\.tables\.map/);
  assert.match(backup, /BACKUP_TABLE_COVERAGE\.map\(entry => db\.table\(entry\.table\)\.clear\(\)\)/);
  assert.match(backup, /BACKUP_TABLE_COVERAGE\.map\(async entry => \[entry\.table, await db\.table\(entry\.table\)\.count\(\)\]/);
});

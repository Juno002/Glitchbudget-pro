import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('20.7.5.9 freezes the final persistence, debt, date, currency and crypto contracts', () => {
  const db = source('src/lib/db.ts');
  const backup = source('src/lib/backup-json.ts');
  const security = source('src/domain/local-security.ts');
  const encrypted = source('src/lib/encrypted-backup.ts');
  const debt = source('src/domain/debt-semantics.ts');
  const dates = source('src/domain/financial-date.ts');
  const legacyDates = source('src/lib/financial-date.ts');
  const ledger = source('src/domain/ledger.ts');

  assert.match(db, /CURRENT_DB_SCHEMA_VERSION = 15/);
  assert.match(backup, /CURRENT_BACKUP_FORMAT_VERSION = 14/);
  assert.match(security, /ENCRYPTED_BACKUP_VERSION = 1/);
  assert.match(encrypted, /name: 'PBKDF2'/);
  assert.match(encrypted, /hash: 'SHA-256'/);
  assert.match(encrypted, /iterations: 310_000/);
  assert.match(encrypted, /name: 'AES-GCM'/);
  assert.match(encrypted, /keyLength: 256/);
  assert.match(encrypted, /tagLength: 128/);

  assert.match(debt, /role: 'historical_compatibility'/);
  assert.match(debt, /principalMeaning: 'original_principal'/);
  assert.match(debt, /principal_plus_opening_adjustment_minus_payments_clamped_at_zero/);
  assert.match(debt, /view_read_only_history/);

  assert.match(dates, /Canonical accounting date/);
  assert.match(dates, /FINANCIAL_DATE/);
  assert.match(legacyDates, /normalizeFinancialDate/);
  assert.match(ledger, /requireSinglePositionCurrency/);
  assert.match(ledger, /monedas diferentes sin conversión explícita/);
});

test('20.7.5.9 keeps migration, backup and encrypted-v1 compatibility evidence in the executable suite', () => {
  const baseline = source('tests/roadmap-baseline.test.ts');
  const dateGate = source('tests/phase-20-7-5-4-canonical-financial-dates.test.ts');
  const encryptedGate = source('tests/phase-20-7-5-6-encrypted-backup-assessment.test.ts');

  assert.match(baseline, /for \(const version of \[6, 7\]\)/);
  assert.match(baseline, /backup-v4/);
  assert.match(baseline, /export, empty test DB, import preserves all tables/);
  assert.match(dateGate, /v14 debt-payment datetimes migrate to canonical local dates in v15/);
  assert.match(encryptedGate, /preserves v1 encrypted export\/import round-trip/);
  assert.match(encryptedGate, /wrong-password and tamper failures on the same user-facing boundary/);
});

test('20.7.5.9 keeps performance and independent golden reconciliation as durable gate evidence', () => {
  const workflow = source('.github/workflows/checks.yml');
  const ledgerBenchmark = source('scripts/benchmark-ledger.mjs');
  const performanceEvidence = source('docs/roadmap/phase-20-7-5-7.md');
  const goldenTest = source('tests/phase-20-7-5-8-financial-reconciliation.test.ts');
  const goldenFixture = JSON.parse(source('tests/fixtures/phase-20-7-5-8-golden.json'));

  assert.match(workflow, /npm run check/);
  assert.match(workflow, /npm run benchmark:ledger/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npm run test:e2e/);
  assert.match(ledgerBenchmark, /1_000, 10_000, 50_000/);
  assert.match(performanceEvidence, /50,000 \| 32\.22 ms \| 23\.68 ms/);

  assert.equal(goldenFixture.expected.position.netWorth, 1_205_000);
  assert.equal(goldenFixture.expected.reports.spending, 90_000);
  assert.equal(goldenFixture.expected.reports.cashFlow.netCashFlow, 340_000);
  assert.match(goldenTest, /Home reconciles the same golden position/);
  assert.match(goldenTest, /planning remains financially neutral/);
  assert.match(goldenTest, /financial-period boundary/);
});

test('20.7.5.9 preserves local-only output and UI/domain architecture guards', () => {
  const localOnly = source('scripts/check-local-only.mjs');
  const staticOutput = source('scripts/check-static-output.mjs');
  const forensic = source('tests/phase-19-5-5-forensic-scan.test.ts');

  assert.match(localOnly, /fetch/);
  assert.match(localOnly, /XMLHttpRequest/);
  assert.match(localOnly, /WebSocket/);
  assert.match(staticOutput, /connect-src must be exclusively 'none'/);
  assert.match(forensic, /React surfaces have no direct financial persistence access/);
  assert.match(forensic, /Dexie React subscriptions remain limited to query adapters/);
  assert.match(forensic, /final audit residues stay outside React/);
  assert.match(forensic, /domain, policies, services and query layer stay React-free/);
});

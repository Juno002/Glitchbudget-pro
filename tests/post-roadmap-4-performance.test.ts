import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Post-roadmap 4 reuses FinanceContext data for accounts and investments', () => {
  const accounts = source('src/components/dashboard/accounts-overview.tsx');
  const investments = source('src/components/dashboard/investments-manager.tsx');
  assert.doesNotMatch(accounts, /useAccountOverviewData/);
  assert.doesNotMatch(investments, /useInvestmentManagerData/);
  assert.match(accounts, /accountTransfers/);
  assert.match(investments, /accountTransfers/);
});

test('Post-roadmap 4 caps initial movement DOM and expands progressively', () => {
  const movements = source('src/components/dashboard/MovementsView.tsx');
  assert.match(movements, /MOVEMENT_PAGE_SIZE = 100/);
  assert.match(movements, /items\.slice\(0,visibleCount\)/);
  assert.match(movements, /data-movement-show-more="true"/);
  assert.match(movements, /Math\.min\(items\.length,count\+MOVEMENT_PAGE_SIZE\)/);
});

test('Post-roadmap 4 preserves measured browser benchmark instrumentation', () => {
  const queries = source('src/lib/finance-queries.ts');
  const e2e = source('scripts/e2e-smoke.mjs');
  assert.match(queries, /__prismaPerfCounters/);
  assert.match(e2e, /5_000, 25_000, 50_000/);
  assert.match(e2e, /POST_ROADMAP_4_BENCHMARK/);
  assert.match(e2e, /POST_ROADMAP_4_AMBIENT/);
  assert.match(e2e, /setCPUThrottlingRate/);
  assert.match(e2e, /data-movement-filter-panel="advanced"/);
  assert.match(e2e, /financeCounter\.calls !== 1/);
  assert.match(e2e, /reaparecieron lecturas duplicadas/);
  assert.match(e2e, /html\.classList\.add\('dark'\)/);
  assert.doesNotMatch(e2e, /date: '2026-10-01'/);
  assert.doesNotMatch(e2e, /catch \{\s*ready = false;/);
});


test('Post-roadmap 4 Plan subsection navigation updates state and URL atomically', () => {
  const planning = source('src/components/dashboard/planning-tab.tsx');
  assert.match(planning, /navigate\(\{ area:'planning', planningTab:value as typeof planningTab \}\)/);
  assert.doesNotMatch(planning, /setPlanningTab\(/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  activeCategories,
  appliesTo,
  categorySeeds,
  reconstructCategories,
} from '../src/domain/categories';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('20.10.4 fresh database defaults match the canonical category seeds exactly', () => {
  const rows = reconstructCategories({});

  assert.equal(rows.length, categorySeeds.length);

  for (const seed of categorySeeds) {
    const row = rows.find(candidate => candidate.id === seed.id);
    assert.ok(row, seed.id);
    assert.equal(row.name, seed.name, seed.id);
    assert.equal(row.iconName, seed.iconName, seed.id);
    assert.equal(row.type, seed.type, seed.id);
    assert.equal(row.archived, false, seed.id);
  }

  assert.deepEqual(
    activeCategories(rows, 'expense').map(category => category.id),
    categorySeeds.filter(category => appliesTo(category, 'expense')).map(category => category.id),
  );
  assert.deepEqual(
    activeCategories(rows, 'income').map(category => category.id),
    categorySeeds.filter(category => appliesTo(category, 'income')).map(category => category.id),
  );

  const db = source('src/lib/db.ts');
  assert.match(
    db,
    /this\.on\('populate', tx => tx\.table\('categories'\)\.bulkAdd\(reconstructCategories\(\{\}\)\)/,
  );
});

test('20.10.4 main gate keeps the complete local-only validation chain wired', () => {
  const pkg = JSON.parse(source('package.json'));
  const workflow = source('.github/workflows/checks.yml');
  const staticOutput = source('scripts/check-static-output.mjs');

  assert.equal(pkg.scripts.check, 'npm run check:local && npm run typecheck && npm run lint && npm test');
  assert.equal(pkg.scripts.build, 'cross-env NODE_ENV=production next build && node scripts/generate-precache.mjs && node scripts/check-static-output.mjs');
  assert.equal(pkg.scripts['test:e2e'], 'node scripts/e2e-smoke.mjs');

  for (const command of [
    'npm run check',
    'npm run benchmark:ledger',
    'npm run build',
    'npm run test:e2e',
  ]) {
    assert.ok(workflow.includes(command), command);
  }

  assert.match(staticOutput, /connect-src must be exclusively 'none'/);
  assert.match(staticOutput, /directives\.length === 1/);
  assert.match(staticOutput, /directives\[0\]\[1\] === "'none'"/);
});

test('20.10.4 production E2E covers every required visible surface plus offline reload', () => {
  const e2e = source('scripts/e2e-smoke.mjs');

  for (const required of [
    "document.body.innerText.includes('Resumen')",
    "clickButtonExpression('Movimientos')",
    "clickButtonExpression('Plan')",
    "clickButtonExpression('Reportes')",
    "'quick-read'",
    "#theme-dark",
    "#theme-light",
    'data-app-lock-settings="prisma"',
    "clickButtonExpression('Copias de seguridad')",
    'data-category-manager="prisma"',
    'data-achievements-prisma="true"',
    'externalRequests.length',
    'offline: true',
    'recarga offline desde service worker',
  ]) {
    assert.ok(e2e.includes(required), required);
  }
});
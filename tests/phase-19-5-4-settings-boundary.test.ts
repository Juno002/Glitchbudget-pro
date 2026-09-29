import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('finance-context delegates settings interpretation to a reusable read model', () => {
  const context = readFileSync(path.join(root, 'src', 'contexts', 'finance-context.tsx'), 'utf8');
  assert.match(context, /resolveSettings/);
  assert.doesNotMatch(context, /normalizeFinancialPolicies/);
  assert.doesNotMatch(context, /baseIncome[\s\S]{0,160}Math\.max/);
});

test('settings read model is React-free and owns settings normalization', () => {
  const source = readFileSync(path.join(root, 'src', 'lib', 'settings-read-model.ts'), 'utf8');
  assert.match(source, /DEFAULT_SETTINGS/);
  assert.match(source, /resolveSettings/);
  assert.match(source, /normalizeFinancialPolicies/);
  assert.match(source, /Math\.max/);
  assert.doesNotMatch(source, /from\s+['"]react/);
  assert.doesNotMatch(source, /['"]use client['"]/);
});

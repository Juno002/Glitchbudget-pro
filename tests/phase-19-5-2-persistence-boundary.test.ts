import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const reactRoots = [
  path.join(root, 'src', 'components'),
  path.join(root, 'src', 'app'),
  path.join(root, 'src', 'hooks'),
  path.join(root, 'src', 'contexts'),
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const target = path.join(directory, entry);
    if (statSync(target).isDirectory()) return sourceFiles(target);
    return /\.(ts|tsx)$/.test(entry) ? [target] : [];
  });
}

test('React surfaces cannot import or access the finance Dexie database directly', () => {
  const violations: string[] = [];
  for (const file of reactRoots.flatMap(sourceFiles)) {
    const source = readFileSync(file, 'utf8');
    if (
      /from\s+['"]@\/lib\/db['"]/.test(source)
      || /from\s+['"]dexie['"]/.test(source)
      || /\bdb\./.test(source)
    ) {
      violations.push(path.relative(root, file));
    }
  }
  assert.deepEqual(violations, []);
});

test('Dexie React subscriptions are limited to dedicated query adapter hooks', () => {
  const allowed = new Set([
    path.join(root, 'src', 'hooks', 'use-finance-context-data.ts'),
    path.join(root, 'src', 'hooks', 'use-finance-queries.ts'),
  ]);
  const violations: string[] = [];

  for (const file of reactRoots.flatMap(sourceFiles)) {
    const source = readFileSync(file, 'utf8');
    if (/from\s+['"]dexie-react-hooks['"]/.test(source) && !allowed.has(file)) {
      violations.push(path.relative(root, file));
    }
  }

  assert.deepEqual(violations, []);
});

test('finance persistence queries are React-free and own the Dexie reads', () => {
  const queryPath = path.join(root, 'src', 'lib', 'finance-queries.ts');
  const source = readFileSync(queryPath, 'utf8');

  assert.match(source, /from\s+['"]@\/lib\/db['"]/);
  assert.match(source, /readFinanceContextData/);
  assert.match(source, /readAccountOverviewData/);
  assert.doesNotMatch(source, /['"]use client['"]/);
  assert.doesNotMatch(source, /from\s+['"]react['"]/);
  assert.doesNotMatch(source, /from\s+['"]dexie-react-hooks['"]/);
});

test('finance hooks subscribe through the non-React query layer', () => {
  const contextHook = readFileSync(path.join(root, 'src', 'hooks', 'use-finance-context-data.ts'), 'utf8');
  const queryHook = readFileSync(path.join(root, 'src', 'hooks', 'use-finance-queries.ts'), 'utf8');
  const categoryHook = readFileSync(path.join(root, 'src', 'hooks', 'use-categories.ts'), 'utf8');

  assert.match(contextHook, /@\/lib\/finance-queries/);
  assert.match(queryHook, /@\/lib\/finance-queries/);
  assert.match(categoryHook, /useCategoriesData/);

  for (const source of [contextHook, queryHook, categoryHook]) {
    assert.doesNotMatch(source, /@\/lib\/db/);
    assert.doesNotMatch(source, /\bdb\./);
  }
});

test('ESLint guards direct persistence imports across React surfaces', () => {
  const config = JSON.parse(readFileSync(path.join(root, '.eslintrc.json'), 'utf8'));
  const serialized = JSON.stringify(config);

  assert.match(serialized, /src\/components/);
  assert.match(serialized, /src\/app/);
  assert.match(serialized, /src\/hooks/);
  assert.match(serialized, /src\/contexts/);
  assert.match(serialized, /@\/lib\/db/);
  assert.match(serialized, /dexie/);
});

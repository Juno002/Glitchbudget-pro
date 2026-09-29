import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const target = path.join(directory, entry);
    if (statSync(target).isDirectory()) return sourceFiles(target);
    return /\.(ts|tsx)$/.test(entry) ? [target] : [];
  });
}

test('domain and policy modules are React-free and cannot depend on UI layers', () => {
  const roots = [
    path.join(root, 'src', 'domain'),
    path.join(root, 'src', 'policies'),
  ];
  const violations: string[] = [];

  for (const file of roots.flatMap(sourceFiles)) {
    const source = readFileSync(file, 'utf8');
    if (
      /['"]use client['"]/.test(source)
      || /from\s+['"]react(?:\/[^'"]*)?['"]/.test(source)
      || /from\s+['"]react-dom(?:\/[^'"]*)?['"]/.test(source)
      || /from\s+['"]dexie-react-hooks['"]/.test(source)
      || /@\/(?:components|hooks|contexts|app)\//.test(source)
    ) {
      violations.push(path.relative(root, file));
    }
  }

  assert.deepEqual(violations, []);
});

test('finance application services and finance query layer remain React-free', () => {
  const lib = path.join(root, 'src', 'lib');
  const files = sourceFiles(lib).filter(file => (
    /-service\.ts$/.test(file)
    || file.endsWith(path.join('lib', 'finance-queries.ts'))
  ));
  const violations: string[] = [];

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    if (
      /['"]use client['"]/.test(source)
      || /from\s+['"]react(?:\/[^'"]*)?['"]/.test(source)
      || /from\s+['"]dexie-react-hooks['"]/.test(source)
      || /@\/(?:components|hooks|contexts|app)\//.test(source)
    ) {
      violations.push(path.relative(root, file));
    }
  }

  assert.deepEqual(violations, []);
});

test('finance-context is a facade without canonical financial validation or formulas', () => {
  const source = readFileSync(path.join(root, 'src', 'contexts', 'finance-context.tsx'), 'utf8');

  assert.match(source, /savePeriodStartDay/);
  assert.match(source, /saveBaseIncomeInput/);
  assert.match(source, /selectBudgetStatusDetails/);
  assert.match(source, /selectReportsSnapshot/);
  assert.match(source, /selectPeriodMetrics/);

  assert.doesNotMatch(source, /Number\.isSafeInteger/);
  assert.doesNotMatch(source, /Number\.isInteger/);
  assert.doesNotMatch(source, /\.reduce\s*\(/);
  assert.doesNotMatch(source, /\bdb\./);
  assert.doesNotMatch(source, /@\/lib\/db/);
  assert.doesNotMatch(source, /selectBudgetRemaining/);
  assert.doesNotMatch(source, /goal\.target\s*-\s*goal\.saved/);
  assert.doesNotMatch(source, /limit\s*-\s*spent/);
});

test('settings input validation belongs to the non-React settings service', () => {
  const source = readFileSync(path.join(root, 'src', 'lib', 'settings-service.ts'), 'utf8');

  assert.match(source, /savePeriodStartDay/);
  assert.match(source, /Number\.isInteger/);
  assert.match(source, /saveBaseIncomeInput/);
  assert.match(source, /Number\.isSafeInteger/);
  assert.doesNotMatch(source, /from\s+['"]react/);
});

test('ESLint permanently guards the React-free domain boundary', () => {
  const config = JSON.parse(readFileSync(path.join(root, '.eslintrc.json'), 'utf8'));
  const serialized = JSON.stringify(config);

  assert.match(serialized, /src\/domain/);
  assert.match(serialized, /src\/policies/);
  assert.match(serialized, /Domain and policy modules must remain React-free/);
  assert.match(serialized, /@\/components\/\*/);
  assert.match(serialized, /@\/hooks\/\*/);
  assert.match(serialized, /@\/contexts\/\*/);
});

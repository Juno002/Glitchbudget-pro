import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const reactRoots = [
  path.join(root, 'src', 'components'),
  path.join(root, 'src', 'hooks'),
  path.join(root, 'src', 'contexts'),
  path.join(root, 'src', 'app'),
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const target = path.join(directory, entry);
    if (statSync(target).isDirectory()) return sourceFiles(target);
    return /\.(ts|tsx)$/.test(entry) ? [target] : [];
  });
}

const relative = (file: string) => path.relative(root, file).replaceAll('\\', '/');

test('Prisma Engine Gate: React surfaces have no direct financial persistence access', () => {
  const violations: string[] = [];
  for (const file of reactRoots.flatMap(sourceFiles)) {
    const source = readFileSync(file, 'utf8');
    if (
      /from\s+['"]@\/lib\/db['"]/.test(source)
      || /from\s+['"]dexie['"]/.test(source)
      || /\bdb\./.test(source)
    ) violations.push(relative(file));
  }
  assert.deepEqual(violations, []);
});

test('Prisma Engine Gate: Dexie React subscriptions remain limited to query adapters', () => {
  const allowed = new Set([
    'src/hooks/use-finance-context-data.ts',
    'src/hooks/use-finance-queries.ts',
  ]);
  const violations: string[] = [];
  for (const file of reactRoots.flatMap(sourceFiles)) {
    const source = readFileSync(file, 'utf8');
    if (/from\s+['"]dexie-react-hooks['"]/.test(source) && !allowed.has(relative(file))) {
      violations.push(relative(file));
    }
  }
  assert.deepEqual(violations, []);
});

test('Prisma Engine Gate: amount reductions do not reappear outside reviewed visual-only code', () => {
  const allowedReduceFiles = new Set([
    'src/components/dashboard/charts/monthly-result-chart.tsx',
  ]);
  const violations: string[] = [];
  for (const file of reactRoots.flatMap(sourceFiles)) {
    const source = readFileSync(file, 'utf8');
    if (/\.reduce\s*\(/.test(source) && !allowedReduceFiles.has(relative(file))) {
      violations.push(relative(file));
    }
  }
  assert.deepEqual(violations, []);
});

test('Prisma Engine Gate: final audit residues stay outside React', () => {
  const source = (file: string) => readFileSync(path.join(root, file), 'utf8');

  const investments = source('src/components/dashboard/investments-manager.tsx');
  assert.match(investments, /selectInvestmentManagerRows/);
  assert.doesNotMatch(investments, /accountBalance|investmentProjection|data\.accounts\.find/);

  const planned = source('src/components/dashboard/subscriptions-manager.tsx');
  assert.match(planned, /selectPlannedPaymentsManagerReadModel/);
  assert.doesNotMatch(planned, /groupUpcomingOccurrences|Object\.values\(grouped\)\.reduce|row\.status === ['"]confirmed/);

  const debts = source('src/components/dashboard/debts-tab.tsx');
  assert.match(debts, /selectActiveCreditCards/);
  assert.doesNotMatch(debts, /debts\?\.filter\([^\n]*status === ['"]active/);

  const transactionModal = source('src/components/dashboard/TransactionModal.tsx');
  assert.match(transactionModal, /selectActiveCreditCards/);
  assert.doesNotMatch(transactionModal, /allDebts\?\.filter/);
  assert.doesNotMatch(transactionModal, /Math\.round\(numAmount \* 100\)/);
});

test('Prisma Engine Gate: domain, policies, services and query layer stay React-free', () => {
  const roots = [
    path.join(root, 'src', 'domain'),
    path.join(root, 'src', 'policies'),
  ];
  const serviceFiles = sourceFiles(path.join(root, 'src', 'lib')).filter(file =>
    /-service\.ts$/.test(file)
    || file.endsWith(path.join('lib', 'finance-queries.ts'))
    || file.endsWith(path.join('lib', 'settings-read-model.ts')),
  );
  const violations: string[] = [];
  for (const file of [...roots.flatMap(sourceFiles), ...serviceFiles]) {
    const source = readFileSync(file, 'utf8');
    if (
      /['"]use client['"]/.test(source)
      || /from\s+['"]react(?:\/[^'"]*)?['"]/.test(source)
      || /from\s+['"]react-dom(?:\/[^'"]*)?['"]/.test(source)
      || /from\s+['"]dexie-react-hooks['"]/.test(source)
      || /@\/(?:components|hooks|contexts|app)\//.test(source)
    ) violations.push(relative(file));
  }
  assert.deepEqual(violations, []);
});

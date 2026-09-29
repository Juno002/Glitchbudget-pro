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

test('19.5.5 forensic scan enumerates every residual financial candidate in React surfaces', () => {
  const candidates: string[] = [];
  const patterns: Array<[string, RegExp]> = [
    ['direct-db-import', /from\s+['"]@\/lib\/db['"]/],
    ['direct-db-access', /\bdb\./],
    ['direct-live-query', /useLiveQuery/],
    ['reduce', /\.reduce\s*\(/],
    ['integer-financial-validation', /Number\.is(?:Safe)?Integer/],
    ['money-unit-adaptation', /\btoCents\s*\(/],
    ['financial-arithmetic', /\b(?:spent|remaining|balance|debt|credit|income|expense|budget|goal|investment|cashFlow|netWorth|principal|saved|target|limit|amount)\b[^\n;]{0,120}(?:\+|\-|\*|\/|>|<|===|!==)/i],
    ['financial-filter', /\.filter\s*\([^)]*(?:status|type|paymentMethod|remaining|balance|debt|credit)/i],
    ['financial-minmax', /Math\.(?:min|max)\s*\([^\n]{0,120}(?:spent|remaining|balance|debt|credit|income|expense|budget|goal|principal|saved|target|limit|amount)/i],
  ];

  for (const file of reactRoots.flatMap(sourceFiles)) {
    const source = readFileSync(file, 'utf8');
    source.split(/\r?\n/).forEach((line, index) => {
      for (const [name, pattern] of patterns) {
        if (pattern.test(line)) {
          candidates.push(`${path.relative(root, file)}:${index + 1} [${name}] ${line.trim()}`);
        }
      }
    });
  }

  assert.deepEqual(candidates, []);
});

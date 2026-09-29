import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const uiRoots = [
  path.join(root, 'src', 'components'),
  path.join(root, 'src', 'app'),
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const target = path.join(directory, entry);
    if (statSync(target).isDirectory()) return sourceFiles(target);
    return /\.(ts|tsx)$/.test(entry) ? [target] : [];
  });
}

test('UI cannot import Dexie database or Dexie React hooks directly', () => {
  const violations: string[] = [];
  for (const file of uiRoots.flatMap(sourceFiles)) {
    const source = readFileSync(file, 'utf8');
    if (/from\s+['"]@\/lib\/db['"]/.test(source) || /from\s+['"]dexie-react-hooks['"]/.test(source)) {
      violations.push(path.relative(root, file));
    }
  }
  assert.deepEqual(violations, []);
});

test('ESLint permanently guards the UI persistence boundary', () => {
  const config = JSON.parse(readFileSync(path.join(root, '.eslintrc.json'), 'utf8'));
  const serialized = JSON.stringify(config);
  assert.match(serialized, /no-restricted-imports/);
  assert.match(serialized, /@\/lib\/db/);
  assert.match(serialized, /dexie-react-hooks/);
});

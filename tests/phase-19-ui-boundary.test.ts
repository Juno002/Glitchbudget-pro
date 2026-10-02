import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
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

test('ESLint permanently guards the UI persistence boundary', async () => {
  const eslint = new ESLint({ cwd: root });
  const source = [
    "import { db } from '@/lib/db';",
    "import { useLiveQuery } from 'dexie-react-hooks';",
    'void db;',
    'void useLiveQuery;',
  ].join('\n');
  const [result] = await eslint.lintText(source, {
    filePath: path.join(root, 'src/components/__eslint-boundary__.tsx'),
  });
  const restricted = result.messages.filter(message => message.ruleId === 'no-restricted-imports');

  assert.equal(
    restricted.length,
    2,
    'UI flat-config boundary must reject both direct DB and Dexie React hook imports',
  );
});

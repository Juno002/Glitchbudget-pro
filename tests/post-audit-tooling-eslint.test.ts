import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('post-audit tooling uses ESLint 9 flat config without widening the Next.js scope', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const config = readFileSync(path.join(root, 'eslint.config.mjs'), 'utf8');

  assert.equal(pkg.devDependencies.eslint, '^9.39.5');
  assert.equal(pkg.devDependencies['@eslint/eslintrc'], '^3.3.7');
  assert.equal(pkg.devDependencies['eslint-config-next'], '^15.5.24');
  assert.equal(pkg.scripts.lint, 'eslint src --max-warnings 0');

  assert.equal(existsSync(path.join(root, '.eslintrc.json')), false);
  assert.match(config, /FlatCompat/);
  assert.match(config, /next\/core-web-vitals/);
  assert.match(config, /src\/\*\*\/\*\.\{ts,tsx\}/);

  assert.equal(lock.packages['node_modules/eslint'].version, '9.39.5');
  assert.equal(lock.packages['node_modules/eslint-config-next'].version, '15.5.25');
  assert.match(lock.packages['node_modules/eslint-config-next'].peerDependencies.eslint, /\^9\.0\.0/);
  assert.doesNotMatch(lock.packages['node_modules/eslint-config-next'].peerDependencies.eslint, /\^10\.0\.0/);
});

test('post-audit tooling keeps the architectural import boundaries in flat config', () => {
  const config = readFileSync(path.join(root, 'eslint.config.mjs'), 'utf8');

  for (const required of [
    'src/components/**/*.{ts,tsx}',
    'src/app/**/*.{ts,tsx}',
    'src/contexts/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    'src/domain/**/*.{ts,tsx}',
    'src/policies/**/*.{ts,tsx}',
    '@/lib/db',
    'dexie',
    'dexie-react-hooks',
    'Domain and policy modules must remain React-free.',
  ]) {
    assert.ok(config.includes(required), required);
  }
});


test('post-audit tooling discovers TypeScript across every src layer', async () => {
  const { ESLint } = await import('eslint');
  const eslint = new ESLint({ cwd: root });
  const results = await eslint.lintFiles(['src']);
  const relativePaths = results.map(result => path.relative(root, result.filePath));

  assert.ok(
    relativePaths.includes(path.join('src', 'lib', 'db.ts')),
    'flat config must keep src/lib TypeScript inside the same lint scope as before',
  );
});

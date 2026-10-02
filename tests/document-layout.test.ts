import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('repository documentation lives under docs except the GitHub README entrypoint', () => {
  const rootDocuments = readdirSync(root)
    .filter(name => /\.(md|txt)$/i.test(name))
    .filter(name => statSync(path.join(root, name)).isFile())
    .filter(name => name !== 'README.md');

  assert.deepEqual(
    rootDocuments,
    [],
    'Root documentation must move under docs/; README.md is the only root exception.',
  );
});

test('canonical roadmap lives under docs/roadmap and not repository root', () => {
  assert.equal(
    existsSync(path.join(root, 'docs', 'roadmap', 'Roadmap septiembre 2026.txt')),
    true,
  );
  assert.equal(
    existsSync(path.join(root, 'Roadmap septiembre 2026.txt')),
    false,
  );
});

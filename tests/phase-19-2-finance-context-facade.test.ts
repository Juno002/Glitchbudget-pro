import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const contextPath = path.join(root, 'src', 'contexts', 'finance-context.tsx');

test('finance context does not access Dexie or OPFS directly', () => {
  const source = readFileSync(contextPath, 'utf8');

  assert.doesNotMatch(source, /from\s+['"]@\/lib\/db['"]/);
  assert.doesNotMatch(source, /from\s+['"]dexie-react-hooks['"]/);
  assert.doesNotMatch(source, /\bdb\./);
  assert.doesNotMatch(source, /from\s+['"]@\/lib\/opfs['"]/);
  assert.doesNotMatch(source, /importDataJSON|exportDataJSON|restoreEncryptedBackupText|createPreImportSafetyBackup/);
});

test('finance context composes dedicated persistence hooks and services', () => {
  const source = readFileSync(contextPath, 'utf8');

  assert.match(source, /useFinanceContextData/);
  assert.match(source, /useBackupManagement/);
  assert.match(source, /initializeSettings/);
  assert.match(source, /updatePersistedSetting/);
  assert.match(source, /resetPersistedSettings/);
  assert.match(source, /createCreditCard/);
  assert.match(source, /removeDebt/);
});

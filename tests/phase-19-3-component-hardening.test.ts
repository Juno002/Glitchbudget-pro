import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function source(path: string) {
  return readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}

test('19.3 large dashboard surfaces delegate independent responsibilities', () => {
  const transactionModal = source('src/components/dashboard/TransactionModal.tsx');
  const reports = source('src/components/dashboard/reports-tab.tsx');
  const accounts = source('src/components/dashboard/accounts-overview.tsx');
  const goals = source('src/components/dashboard/goals-manager.tsx');

  assert.match(transactionModal, /transaction-modal-automation/);
  assert.match(transactionModal, /QuickAddTemplateSelector/);
  assert.match(transactionModal, /TransactionRuleSuggestions/);
  assert.match(transactionModal, /QuickAddTemplateSave/);

  assert.match(reports, /ReportRangeControls/);
  assert.doesNotMatch(reports, /<Input type="date"/);

  assert.match(accounts, /useAccountManagement/);
  assert.doesNotMatch(accounts, /addAccount/);
  assert.doesNotMatch(accounts, /saveTransfer/);
  assert.doesNotMatch(accounts, /reconcileDebt/);

  assert.doesNotMatch(goals, /@\/lib\/db|dexie-react-hooks|db[.]/);
  assert.ok(goals.split('\n').length < 200, 'GoalsManager is already cohesive and should not be fragmented by size alone.');
});

test('19.3 preserves the architectural boundaries established by 19.1 and 19.2', () => {
  const financeContext = source('src/contexts/finance-context.tsx');
  const accountController = source('src/hooks/use-account-management.ts');
  const transactionAutomation = source('src/components/dashboard/transaction-modal-automation.tsx');

  assert.doesNotMatch(financeContext, /@\/lib\/db|dexie-react-hooks|db[.]|@\/lib\/opfs/);
  assert.doesNotMatch(accountController, /@\/lib\/db|dexie-react-hooks|db[.]/);
  assert.doesNotMatch(transactionAutomation, /@\/lib\/db|dexie-react-hooks|db[.]/);
});

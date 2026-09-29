import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const target = path.join(directory, entry);
    if (statSync(target).isDirectory()) return sourceFiles(target);
    return /\.(ts|tsx)$/.test(entry) ? [target] : [];
  });
}

test('19.5 React surfaces have zero direct financial Dexie access', () => {
  const roots = ['components', 'hooks', 'contexts', 'app']
    .map(name => path.join(root, 'src', name));
  const violations: string[] = [];

  for (const file of roots.flatMap(sourceFiles)) {
    const text = readFileSync(file, 'utf8');
    if (
      /from\s+['"]@\/lib\/db['"]/.test(text)
      || /from\s+['"]dexie-react-hooks['"]/.test(text)
      || /\bdb\./.test(text)
    ) {
      violations.push(path.relative(root, file));
    }
  }

  assert.deepEqual(violations, []);
});

test('19.5 domain and application remain reusable without React UI', () => {
  const roots = ['domain', 'application', 'repositories']
    .map(name => path.join(root, 'src', name));
  const violations: string[] = [];

  for (const file of roots.flatMap(sourceFiles)) {
    const text = readFileSync(file, 'utf8');
    if (
      /['"]use client['"]/.test(text)
      || /from\s+['"]react(?:\/[^'"]*)?['"]/.test(text)
      || /@\/(?:components|hooks|contexts|app)\//.test(text)
    ) {
      violations.push(path.relative(root, file));
    }
  }

  assert.deepEqual(violations, []);
});

test('19.5 finance context is composition/facade rather than financial engine', () => {
  const context = source('src/contexts/finance-context.tsx');

  assert.match(context, /createFinanceReadModels/);
  assert.match(context, /application\/finance-commands/);
  assert.doesNotMatch(context, /selectPeriodMetrics|selectReportsSnapshot|recordedExpenseForPeriod/);
  assert.doesNotMatch(context, /\.reduce\(/);
  assert.doesNotMatch(context, /toCents\(/);
  assert.doesNotMatch(context, /@\/lib\/db|dexie-react-hooks|\bdb\./);
});

test('19.5 financial UI hotspots consume read models instead of rebuilding canonical meaning', () => {
  const transactionModal = source('src/components/dashboard/TransactionModal.tsx');
  const goals = source('src/components/dashboard/goals-manager.tsx');
  const budgets = source('src/components/dashboard/budget-status.tsx');
  const accounts = source('src/components/dashboard/accounts-overview.tsx');
  const debts = source('src/components/dashboard/debts-tab.tsx');
  const investments = source('src/components/dashboard/investments-manager.tsx');
  const achievements = source('src/hooks/use-achievements.ts');
  const transfer = source('src/components/dashboard/transfer-dialog.tsx');

  assert.match(goals, /selectGoalManagerRows/);
  assert.doesNotMatch(goals, /goalMetrics\(|goalFundingSchedule\(|\.reduce\(/);

  assert.match(budgets, /selectBudgetStatusCardModel/);
  assert.doesNotMatch(budgets, /budgetStatusForRange|budget\.limit\s*-\s*budget\.spent|\.reduce\(/);

  assert.match(accounts, /selectAccountsOverviewModel/);
  assert.doesNotMatch(accounts, /selectPosition|accountBalance|accountEntries/);

  assert.match(debts, /selectCreditCardView/);
  assert.doesNotMatch(debts, /selectCardSignedBalance|selectCardAvailableLimit|currentDebt\s*\/\s*debt\.principal/);

  assert.match(investments, /selectInvestmentManagerRows/);
  assert.doesNotMatch(investments, /accountBalance|investmentProjection/);

  assert.match(achievements, /evaluateFinancialAchievements/);
  assert.doesNotMatch(achievements, /\.reduce\(|remaining\s*<=\s*.*limit\s*\*/);

  assert.match(transfer, /selectBudgetsWithAvailableFunds/);
  assert.doesNotMatch(transfer, /\.filter\([^\n]*remaining\s*>\s*0/);

  assert.doesNotMatch(transactionModal, /Math\.round\(numAmount\s*\*\s*100\)/);
  assert.doesNotMatch(transactionModal, /from\s+['"]@\/lib\/accounts['"]/);
});

test('19.5 create-expense flow traces UI -> command -> domain/service -> persistence', () => {
  const ui = source('src/components/dashboard/TransactionModal.tsx');
  const facade = source('src/contexts/finance-context.tsx');
  const commands = source('src/application/finance-commands.ts');
  const service = source('src/lib/transaction-service.ts');

  assert.match(ui, /addExpense\(fields\)/);
  assert.match(facade, /createExpenseCommand/);
  assert.match(commands, /createExpenseCommand[\s\S]*saveExpense/);
  assert.match(service, /evaluateBudgetOverspendingSet/);
  assert.match(service, /db\.transaction/);
  assert.doesNotMatch(ui, /@\/lib\/db|\bdb\./);
});

test('19.5 Summary flow traces UI -> query facade -> domain read model', () => {
  const ui = source('src/components/dashboard/summary-tab.tsx');
  const facade = source('src/contexts/finance-context.tsx');
  const readModels = source('src/domain/finance-read-models.ts');
  const reports = source('src/domain/reports.ts');

  assert.match(ui, /getReportSnapshot\(currentPeriod, today\)/);
  assert.match(facade, /createFinanceReadModels/);
  assert.match(readModels, /selectReportsSnapshot/);
  assert.doesNotMatch(reports, /from\s+['"]react|@\/lib\/db|\bdb\./);
});

test('19.5 Reports flow traces UI -> query facade -> canonical report domain', () => {
  const ui = source('src/components/dashboard/reports-tab.tsx');
  const facade = source('src/contexts/finance-context.tsx');
  const readModels = source('src/domain/finance-read-models.ts');
  const reports = source('src/domain/reports.ts');

  assert.match(ui, /getReportSnapshot\(range,range\.end\)/);
  assert.match(facade, /getReportSnapshot/);
  assert.match(readModels, /selectReportsSnapshot/);
  assert.match(reports, /export function selectReportsSnapshot/);
  assert.doesNotMatch(ui, /@\/lib\/db|\bdb\./);
});

test('19.5 components do not import the mixed account persistence module for read calculations', () => {
  const componentRoot = path.join(root, 'src', 'components');
  const violations = sourceFiles(componentRoot)
    .filter(file => /from\s+['"]@\/lib\/accounts['"]/.test(readFileSync(file, 'utf8')))
    .map(file => path.relative(root, file));

  assert.deepEqual(violations, []);
});

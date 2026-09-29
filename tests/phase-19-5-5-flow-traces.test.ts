import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), 'utf8');

test('Prisma Engine Gate trace: create expense goes UI -> facade -> service/policy/domain -> Dexie', () => {
  const modal = source('src/components/dashboard/TransactionModal.tsx');
  const context = source('src/contexts/finance-context.tsx');
  const service = source('src/lib/transaction-service.ts');

  assert.match(modal, /await addExpense\(fields\)/);
  assert.doesNotMatch(modal, /@\/lib\/db|\bdb\./);

  assert.match(context, /withBudgetConfirmation\(token => saveExpense\(input, false, token\)/);
  assert.doesNotMatch(context, /@\/lib\/db|\bdb\./);

  assert.match(service, /evaluateBudgetOverspendingSet/);
  assert.match(service, /budgetPlansForDate/);
  assert.match(service, /requirePreservedAccountFunds/);
  assert.match(service, /await db\.expenses\.add\(row\)/);
});

test('Prisma Engine Gate trace: Summary consumes reusable domain read models backed by non-React queries', () => {
  const summary = source('src/components/dashboard/summary-tab.tsx');
  const context = source('src/contexts/finance-context.tsx');
  const home = source('src/domain/home.ts');
  const reports = source('src/domain/reports.ts');
  const queries = source('src/lib/finance-queries.ts');

  assert.match(summary, /selectHomeReadModel/);
  assert.match(summary, /getReportSnapshot\(currentPeriod, today\)/);
  assert.match(summary, /getBudgetStatusDetails\(currentMonth\)/);
  assert.doesNotMatch(summary, /@\/lib\/db|\bdb\./);

  assert.match(context, /selectReportsSnapshot/);
  assert.match(context, /selectBudgetStatusDetails/);
  assert.match(home, /export function selectHomeReadModel/);
  assert.match(reports, /export function selectReportsSnapshot/);

  assert.match(queries, /export function readFinanceContextData/);
  assert.match(queries, /db\.transaction\('r', db\.tables/);
  assert.doesNotMatch(queries, /from\s+['"]react/);
});

test('Prisma Engine Gate trace: Reports uses shared selectors and the same query boundary', () => {
  const reportsUi = source('src/components/dashboard/reports-tab.tsx');
  const context = source('src/contexts/finance-context.tsx');
  const reportsDomain = source('src/domain/reports.ts');
  const queries = source('src/lib/finance-queries.ts');

  assert.match(reportsUi, /getReportSnapshot\(range,range\.end\)/);
  assert.doesNotMatch(reportsUi, /@\/lib\/db|\bdb\./);

  assert.match(context, /selectReportsSnapshot/);
  assert.match(reportsDomain, /selectSpendingReport/);
  assert.match(reportsDomain, /selectCashFlowReport/);
  assert.match(reportsDomain, /selectNetWorthReport/);
  assert.match(queries, /expenses: await db\.expenses\.toArray\(\)/);
  assert.match(queries, /accounts: await db\.accounts\.toArray\(\)/);
});

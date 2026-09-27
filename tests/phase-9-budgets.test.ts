import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { db, type Settings } from '../src/lib/db';
import { seedTestCategories } from './category-fixture';
import {
  budgetPeriodContaining,
  nextBudgetPeriod,
  previousBudgetPeriod,
} from '../src/domain/periods';
import {
  budgetPlanForRange,
  budgetRangeForPlan,
  budgetPlansForDate,
} from '../src/domain/budgets';
import { rollBudgetsIntoPeriod } from '../src/lib/budget-rollover';
import { reassignBudgetLimit } from '../src/lib/budget-service';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { readAccountSnapshot } from '../src/lib/accounts';
import { selectPosition } from '../src/domain/ledger';
import { saveExpense } from '../src/lib/transaction-service';

const settings: Settings = {
  id: 'general',
  theme: 'dark',
  preventNegativeAccountBalance: true,
  budgetOverspendingBehavior: 'block',
  rolloverStrategy: 'reset',
  periodStartDay: 25,
  baseIncome: { freq: 'mensual', amount: 0 },
  savePct: 0,
  currency: 'DOP',
  locale: 'es-DO',
};

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
  await db.settings.put(settings);
  await seedTestCategories();
});

after(() => db.close());

test('Period Engine resolves weekly monthly yearly and one-time budgets through one DateRange contract', () => {
  const weekly = budgetPeriodContaining('2026-09-23', 'weekly', settings);
  assert.deepEqual(weekly, { id:'weekly:2026-09-21', start:'2026-09-21', end:'2026-09-27', kind:'weekly' });

  const monthly = budgetPeriodContaining('2026-09-23', 'monthly', settings);
  assert.deepEqual(monthly, { id:'2026-09', start:'2026-08-25', end:'2026-09-24', kind:'monthly' });

  const yearly = budgetPeriodContaining('2026-09-23', 'yearly', settings);
  assert.deepEqual(yearly, { id:'yearly:2026', start:'2026-01-01', end:'2026-12-31', kind:'yearly' });

  const oneTime = budgetPeriodContaining('2026-09-23', 'one_time', settings, { start:'2026-09-20', end:'2026-10-05' });
  assert.deepEqual(oneTime, { id:'one-time:2026-09-20:2026-10-05', start:'2026-09-20', end:'2026-10-05', kind:'one_time' });

  assert.equal(previousBudgetPeriod(oneTime, settings), undefined);
  assert.equal(nextBudgetPeriod(oneTime, settings), undefined);
  assert.equal(previousBudgetPeriod(weekly, settings)?.start, '2026-09-14');
  assert.equal(nextBudgetPeriod(yearly, settings)?.id, 'yearly:2027');
});

test('legacy plans remain monthly while Phase 9 plans carry explicit ranges', () => {
  const legacy = { month:'2026-09', categoryId:'food', limit:5000 };
  assert.deepEqual(budgetRangeForPlan(legacy, settings), { id:'2026-09', start:'2026-08-25', end:'2026-09-24', kind:'monthly' });

  const weekly = budgetPeriodContaining('2026-09-23', 'weekly', settings);
  const plan = budgetPlanForRange(weekly, 'food', 5000);
  assert.equal(plan.month, weekly.id);
  assert.equal(plan.periodType, 'weekly');
  assert.equal(plan.periodStart, weekly.start);
  assert.equal(plan.periodEnd, weekly.end);
});

test('rollover uses the same engine for weekly and yearly budgets and skips one-time ranges', async () => {
  await db.settings.update('general', { rolloverStrategy:'accumulate_surplus' });
  const targetWeek = budgetPeriodContaining('2026-09-23', 'weekly', settings);
  const previousWeek = previousBudgetPeriod(targetWeek, settings)!;
  await db.plans.add(budgetPlanForRange(previousWeek, 'food', 10_000));
  await db.expenses.add({ id:'week-spend', month:'2026-09', date:'2026-09-15', categoryId:'food', amount:3_000, concept:'', nature:'Variable' });

  assert.equal(await rollBudgetsIntoPeriod(targetWeek), true);
  assert.equal((await db.plans.get([targetWeek.id,'food']))?.limit, 17_000);

  await db.settings.update('general', { rolloverStrategy:'accumulate_debt' });
  const targetYear = budgetPeriodContaining('2027-06-01', 'yearly', settings);
  const previousYear = previousBudgetPeriod(targetYear, settings)!;
  await db.plans.add(budgetPlanForRange(previousYear, 'transport', 10_000));
  await db.expenses.add({ id:'year-spend', month:'2026-05', date:'2026-05-20', categoryId:'transport', amount:15_000, concept:'', nature:'Variable' });

  assert.equal(await rollBudgetsIntoPeriod(targetYear), true);
  assert.equal((await db.plans.get([targetYear.id,'transport']))?.limit, 5_000);

  const oneTime = budgetPeriodContaining('2026-09-23', 'one_time', settings, { start:'2026-09-20', end:'2026-10-05' });
  assert.equal(await rollBudgetsIntoPeriod(oneTime), false);
});

test('budget reassignment changes planned limits only and never moves real money', async () => {
  const weekly = budgetPeriodContaining('2026-09-23', 'weekly', settings);
  await db.accounts.bulkAdd([
    { id:'cash', name:'Efectivo', type:'cash', openingBalance:50_000, startDate:'2026-09-01', isDefaultCash:true },
    { id:'bank', name:'Banco', type:'bank', openingBalance:80_000, startDate:'2026-09-01' },
  ]);
  await db.plans.bulkAdd([
    budgetPlanForRange(weekly, 'food', 20_000),
    budgetPlanForRange(weekly, 'transport', 5_000),
  ]);

  const before = selectPosition(await db.accounts.toArray(), [], await readAccountSnapshot(), '2026-09-23');
  await reassignBudgetLimit(weekly, 'food', 'transport', 4_000);
  const after = selectPosition(await db.accounts.toArray(), [], await readAccountSnapshot(), '2026-09-23');

  assert.deepEqual(after, before);
  assert.equal((await db.plans.get([weekly.id,'food']))?.limit, 16_000);
  assert.equal((await db.plans.get([weekly.id,'transport']))?.limit, 9_000);
  assert.equal(await db.account_transfers.count(), 0);
  assert.equal(await db.expenses.count(), 0);
  assert.equal(await db.incomes.count(), 0);
});

test('weekly and yearly budgets participate in the existing overspending policy', async () => {
  await db.accounts.add({ id:'cash', name:'Efectivo', type:'cash', openingBalance:2_000_000, startDate:'2026-09-01', isDefaultCash:true });
  const weekly = budgetPeriodContaining('2026-09-23', 'weekly', settings);
  const yearly = budgetPeriodContaining('2026-09-23', 'yearly', settings);
  await db.plans.bulkAdd([
    budgetPlanForRange(weekly, 'food', 500_000),
    budgetPlanForRange(yearly, 'food', 2_000_000),
  ]);
  await db.expenses.add({ id:'old', accountId:'cash', month:'2026-09', date:'2026-09-22', categoryId:'food', amount:450_000, concept:'', nature:'Variable' });

  const active = budgetPlansForDate(await db.plans.toArray(), 'food', '2026-09-23', settings);
  assert.deepEqual(active.map(item => item.range.kind), ['weekly','yearly']);

  await assert.rejects(
    saveExpense({ id:'new', accountId:'cash', date:'2026-09-23', categoryId:'food', amount:1000, concept:'', nature:'Variable' }),
    /presupuesto activo/,
  );
  assert.equal(await db.expenses.count(), 1);
});

test('backup v7 round-trips Phase 9 budget period metadata without changing schema version', async () => {
  const weekly = budgetPeriodContaining('2026-09-23', 'weekly', settings);
  await db.plans.add(budgetPlanForRange(weekly, 'food', 12_345));

  const text = await exportDataJSON();
  const backup = JSON.parse(text);
  assert.equal(backup.v, 7);
  assert.equal(backup.plans[0].periodType, 'weekly');
  assert.equal(backup.plans[0].periodStart, '2026-09-21');

  await importDataJSON(text);
  assert.deepEqual(await db.plans.get([weekly.id,'food']), budgetPlanForRange(weekly, 'food', 12_345));
});

test('Budgets 2.0 UI exposes mandatory metrics and all four period types', () => {
  const planning = readFileSync(new URL('../src/components/dashboard/planning-tab.tsx', import.meta.url), 'utf8');
  for (const label of ['Límite','Gastado','Restante','Porcentaje','Estado']) assert.ok(planning.includes(label), label);
  for (const label of ['Semanal','Mensual','Anual','Único']) assert.ok(planning.includes(label), label);
  assert.match(planning, /TransferDialog budgetPeriod=/);

  const progress = readFileSync(new URL('../src/components/finance-ui/progress-metric.tsx', import.meta.url), 'utf8');
  for (const label of ['Gastado:','Límite:','Restante:','Porcentaje:']) assert.ok(progress.includes(label), label);
});

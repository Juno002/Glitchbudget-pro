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
  budgetPlansForRange,
  budgetStatusForRange,
  savedBudgetRanges,
} from '../src/domain/budgets';
import { rollBudgetsIntoPeriod } from '../src/lib/budget-rollover';
import { reassignBudgetLimit, saveBudgetLimits } from '../src/lib/budget-service';
import { exportDataJSON, importDataJSON } from '../src/lib/backup-json';
import { readAccountSnapshot } from '../src/lib/accounts';
import { selectPosition } from '../src/domain/ledger';
import { saveExpense } from './helpers/major-unit-transaction-writes';
import { savePlans } from '../src/lib/category-service';
import { BudgetWarning } from '../src/policies/budget-overspending';
import { selectPeriodMetrics } from '../src/domain/metrics';

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
    { id:'cash', name:'Efectivo', type:'cash', currency:'DOP', openingBalance:50_000, startDate:'2026-09-01', isDefaultCash:true },
    { id:'bank', name:'Banco', type:'bank', currency:'DOP', openingBalance:80_000, startDate:'2026-09-01' },
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
  await db.accounts.add({ id:'cash', name:'Efectivo', type:'cash', currency:'DOP', openingBalance:2_000_000, startDate:'2026-09-01', isDefaultCash:true });
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

test('current backup round-trips Phase 9 metadata and still imports v7', async () => {
  const weekly = budgetPeriodContaining('2026-09-23', 'weekly', settings);
  await db.plans.add(budgetPlanForRange(weekly, 'food', 12_345));

  const text = await exportDataJSON();
  const backup = JSON.parse(text);
  assert.equal(backup.v, 14);
  await importDataJSON(JSON.stringify({...backup, v:7}));
  assert.equal(backup.plans[0].periodType, 'weekly');
  assert.equal(backup.plans[0].periodStart, '2026-09-21');

  await importDataJSON(text);
  assert.deepEqual(await db.plans.get([weekly.id,'food']), budgetPlanForRange(weekly, 'food', 12_345));
});

test('Budgets 2.0 UI exposes mandatory metrics and all four period types', () => {
  const planning = readFileSync(new URL('../src/components/dashboard/planning-tab.tsx', import.meta.url), 'utf8');
  for (const label of ['Límite','Gastado','Restante','Porcentaje','Estado']) assert.ok(planning.includes(label), label);
  const controls = readFileSync(new URL('../src/components/dashboard/budget-period-controls.tsx', import.meta.url), 'utf8');
  for (const label of ['Semanal','Mensual','Anual','Único']) assert.ok(controls.includes(label), label);
  assert.match(planning, /TransferDialog .*budgetPeriod=/);

  const progress = readFileSync(new URL('../src/components/finance-ui/progress-metric.tsx', import.meta.url), 'utf8');
  for (const label of ['currentLabel','totalLabel','Restante:','Porcentaje:']) assert.ok(progress.includes(label), label);
});

test('monthly budget ranges follow the financial calendar after changing the start day', async () => {
  const range = budgetPeriodContaining('2026-09-23', 'monthly', settings);
  const plan = budgetPlanForRange(range, 'food', 5_000);
  const changedSettings = { periodStartDay: 1 };
  const changedRange = budgetPeriodContaining('2026-09-27', 'monthly', changedSettings);
  assert.deepEqual(budgetRangeForPlan(plan, changedSettings), changedRange);
  assert.equal(budgetPlansForRange([plan], changedRange).length, 1);
  assert.equal(budgetPlansForDate([plan], 'food', '2026-08-26', changedSettings).length, 0);
  assert.equal(budgetPlansForDate([plan], 'food', '2026-09-27', changedSettings).length, 1);
});

test('budget reassignment rejects overflow without changing either limit', async () => {
  const range = budgetPeriodContaining('2026-09-23', 'weekly');
  const plans = [budgetPlanForRange(range, 'food', 100), budgetPlanForRange(range, 'transport', Number.MAX_SAFE_INTEGER)];
  await db.plans.bulkAdd(plans);
  await assert.rejects(reassignBudgetLimit(range, 'food', 'transport', 1), /monto admitido/);
  assert.deepEqual(await db.plans.toArray(), plans);
});

test('invalid budget ranges and duplicate keys cannot replace a valid backup', async () => {
  await db.accounts.add({ id:'cash', name:'Efectivo', type:'cash', currency:'DOP', openingBalance:1234, startDate:'2026-09-01', isDefaultCash:true });
  const valid = budgetPlanForRange(budgetPeriodContaining('2026-09-23', 'weekly'), 'food', 100);
  await db.plans.add(valid);
  const original = await exportDataJSON();
  const invalidPlans = [
    [{ ...valid, periodEnd:'2026-09-19' }],
    [{ ...valid, month:'weekly:2026-09-22' }],
    [{ ...valid, periodType:undefined, periodStart:undefined, periodEnd:undefined }],
    [{ ...valid, periodEnd:'2026-09-28' }],
    [{ ...valid, limit:Number.MAX_SAFE_INTEGER + 1 }],
    [valid, valid],
  ];
  for (const plans of invalidPlans) {
    await assert.rejects(importDataJSON(JSON.stringify({ ...JSON.parse(original), plans })));
    const restored = JSON.parse(await exportDataJSON());
    assert.deepEqual({ ...restored, exportedAt:null }, { ...JSON.parse(original), exportedAt:null });
  }
});

test('plan persistence rejects invalid limits and ranges atomically', async () => {
  const plan = budgetPlanForRange(budgetPeriodContaining('2026-09-23', 'weekly'), 'food', 100);
  for (const invalid of [{ ...plan, limit:-1 }, { ...plan, limit:1.5 }, { ...plan, periodEnd:'2026-09-30' }]) {
    await assert.rejects(savePlans([invalid]));
    assert.equal(await db.plans.count(), 0);
  }
});

test('overlapping ranges warn together and stale consent never bypasses a changed budget', async () => {
  await db.settings.update('general', { budgetOverspendingBehavior:'warn' });
  await db.accounts.add({ id:'cash', name:'Efectivo', type:'cash', currency:'DOP', openingBalance:50_000, startDate:'2026-09-01', isDefaultCash:true });
  const weekly = budgetPeriodContaining('2026-09-23', 'weekly');
  const yearly = budgetPeriodContaining('2026-09-23', 'yearly');
  await db.plans.bulkAdd([budgetPlanForRange(weekly, 'food', 100), budgetPlanForRange(yearly, 'food', 100)]);
  const expense = { id:'warned', accountId:'cash', date:'2026-09-23', categoryId:'food', amount:2, concept:'', nature:'Variable' as const };
  let consent = '';
  await assert.rejects(saveExpense(expense), error => {
    assert.ok(error instanceof BudgetWarning);
    assert.equal(error.evaluation.affectedCount, 2);
    consent = error.evaluation.confirmation;
    return true;
  });
  await db.plans.update([yearly.id, 'food'], { limit:150 });
  await assert.rejects(saveExpense(expense, false, consent), BudgetWarning);
  assert.equal(await db.expenses.count(), 0);
});

test('rollover is idempotent and cannot overwrite edited budgets', async () => {
  await db.settings.update('general', { rolloverStrategy:'accumulate_surplus' });
  const next = budgetPeriodContaining('2026-09-23', 'weekly');
  await db.plans.add(budgetPlanForRange(previousBudgetPeriod(next)!, 'food', 1000));
  assert.equal(await rollBudgetsIntoPeriod(next), true);
  assert.equal(await rollBudgetsIntoPeriod(next), false);
  await db.plans.update([next.id,'food'], { limit:789 });
  assert.equal(await rollBudgetsIntoPeriod(next), false);
  assert.equal((await db.plans.get([next.id,'food']))?.limit, 789);
});

test('all four ranges round-trip alongside legacy monthly budgets', async () => {
  const kinds = ['weekly', 'monthly', 'yearly', 'one_time'] as const;
  const plans = kinds.map(kind => budgetPlanForRange(budgetPeriodContaining('2026-09-23', kind, settings,
    { start:'2026-09-20', end:'2026-10-05' }), 'food', 12345));
  plans.push({ month:'2026-08', categoryId:'transport', limit:678 });
  await db.plans.bulkAdd(plans);
  const before = await db.plans.toArray();
  const exported = await exportDataJSON();
  await importDataJSON(exported);
  assert.deepEqual((await db.plans.toArray()).map(row => JSON.parse(JSON.stringify(row))), before);
  assert.equal(savedBudgetRanges(await db.plans.toArray(), settings).length, 5);
});

test('range spending counts purchases once and honors both inclusive boundaries', async () => {
  const range = budgetPeriodContaining('2026-09-23', 'one_time', {}, { start:'2026-09-20', end:'2026-10-05' });
  const expenses = ['2026-09-19','2026-09-20','2026-10-05','2026-10-06'].map((date, index) => ({
    id:String(index), date, month:date.slice(0,7), categoryId:'food', amount:100,
    concept:'', nature:'Variable' as const, paymentMethod:index % 2 ? 'credit' as const : 'cash' as const,
  }));
  const detail = budgetStatusForRange(budgetPlanForRange(range, 'food', 150), expenses, range);
  assert.equal(detail.spent, 200);
  assert.equal(detail.remaining, -50);
  assert.equal(detail.percentage, 133);
  assert.equal(detail.status, 'over');
});

test('overlapping budgets never multiply actual income spending or monthly reserves', () => {
  const monthly = budgetPeriodContaining('2026-09-23', 'monthly', settings);
  const weekly = budgetPeriodContaining('2026-09-23', 'weekly', settings);
  const yearly = budgetPeriodContaining('2026-09-23', 'yearly', settings);
  const snapshot = { settings, incomes:[], expenses:[{ id:'e', month:'2026-09', date:'2026-09-23', categoryId:'food', amount:250, nature:'Variable' as const, concept:'' }],
    budgets:[budgetPlanForRange(monthly,'food',1000)], debts:[], debtPayments:[], accounts:[], transfers:[], goals:[], goalContributions:[] };
  const baseline = selectPeriodMetrics(snapshot, monthly);
  assert.deepEqual(selectPeriodMetrics({ ...snapshot, budgets:[...snapshot.budgets, budgetPlanForRange(weekly,'food',500), budgetPlanForRange(yearly,'food',5000)] }, monthly), baseline);
});

test('stale monthly editors cannot save or reassign after the calendar changes', async () => {
  const range = budgetPeriodContaining('2026-09-23', 'monthly', settings);
  await saveBudgetLimits(range, [{ categoryId:'food', limit:1000 }]);
  await db.settings.update('general', { periodStartDay:1 });
  await assert.rejects(saveBudgetLimits(range, [{ categoryId:'food', limit:2000 }]), /período financiero cambió/);
  await assert.rejects(reassignBudgetLimit(range, 'food', 'transport', 1), /período financiero cambió/);
  assert.equal((await db.plans.get([range.id,'food']))?.limit, 1000);
});

test('weekly navigation crosses a year boundary and leap day without timezone arithmetic', () => {
  const range = budgetPeriodContaining('2027-01-01', 'weekly');
  assert.equal(range.start, '2026-12-28');
  assert.equal(range.end, '2027-01-03');
  assert.deepEqual(previousBudgetPeriod(nextBudgetPeriod(range)!), range);
  const leap = budgetPeriodContaining('2028-02-29', 'weekly');
  assert.equal(leap.start, '2028-02-28');
  assert.equal(leap.end, '2028-03-05');
});

test('a configured zero limit remains distinct from a category without a budget', () => {
  const range = budgetPeriodContaining('2026-09-23', 'weekly');
  const plan = budgetPlanForRange(range, 'food', 0);
  const expense = { id:'zero-limit', month:'2026-09', date:'2026-09-23', categoryId:'food', amount:1, nature:'Variable' as const, concept:'' };
  assert.equal(budgetStatusForRange(plan, [], range).configured, true);
  assert.equal(budgetStatusForRange(plan, [], range).status, 'ok');
  assert.equal(budgetStatusForRange(plan, [expense], range).status, 'over');
  assert.equal(budgetStatusForRange(plan, [expense], range, false).status, 'unbudgeted');
});

test('expense validation materializes weekly rollover even when Plan has never been opened', async () => {
  await db.settings.update('general', { rolloverStrategy:'accumulate_surplus' });
  await db.accounts.add({ id:'cash', name:'Efectivo', type:'cash', currency:'DOP', openingBalance:50_000, startDate:'2026-09-01', isDefaultCash:true });
  const target = budgetPeriodContaining('2026-09-21', 'weekly');
  await db.plans.add(budgetPlanForRange(previousBudgetPeriod(target)!, 'food', 1000));
  const expense = { id:'rollover-guard', date:'2026-09-21', accountId:'cash', categoryId:'food', amount:100, concept:'', nature:'Variable' as const };
  await assert.rejects(saveExpense(expense), /presupuesto activo/);
  assert.equal(await db.expenses.count(), 0);
  // A permitted save commits the new period and the movement in the same transaction.
  await saveExpense({ ...expense, amount:10 });
  assert.equal((await db.plans.get([target.id, 'food']))?.limit, 2000);
  assert.equal(await db.expenses.count(), 1);
});

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { db } from '../src/lib/db';
import { DEFAULT_SETTINGS } from '../src/lib/settings-read-model';
import { ensureCashAccount } from '../src/lib/accounts';
import { seedTestCategories } from './category-fixture';
import { asCents } from '../src/domain/money';
import { periodForId } from '../src/domain/periods';
import { reconcileSelectedPeriod } from '../src/domain/period-selection';
import { filtersForPeriod } from '../src/domain/transaction-filters';
import { shouldApplyAutomaticRuleField } from '../src/domain/transaction-rule-precedence';
import { saveExpense, saveIncome } from '../src/lib/transaction-service';
import { currencyInputLabel, formatCurrency, toCents } from '../src/lib/utils';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
  await db.settings.put({
    ...DEFAULT_SETTINGS,
    preventNegativeAccountBalance: false,
    budgetOverspendingBehavior: 'allow',
  });
  await seedTestCategories();
});

after(() => db.close());

test('Post-roadmap 1 preserves an explicit period across unrelated settings changes', () => {
  const selected = '2026-07';
  const today = '2026-10-01';

  assert.equal(reconcileSelectedPeriod(selected, today, 25, 25), selected);
  assert.equal(
    reconcileSelectedPeriod(selected, today, 1, 25),
    periodForId('2026-10', { periodStartDay: 25 }).id,
  );

  const provider = source('src/contexts/finance-context.tsx');
  assert.match(provider, /\}, \[settings\.periodStartDay\]\);/);
  assert.doesNotMatch(provider, /setCurrentMonthState\(periodContaining\(localDate\(\), settings\)\.id\);\s*\}, \[settings\]\);/);
});

test('Post-roadmap 1 derives Movimientos dates from the same financial period contract', () => {
  const period = periodForId('2026-10', { periodStartDay: 25 });
  assert.deepEqual(period, {
    id: '2026-10',
    start: '2026-09-25',
    end: '2026-10-24',
  });
  assert.deepEqual(filtersForPeriod(period), {
    dateStart: '2026-09-25',
    dateEnd: '2026-10-24',
  });

  const movements = source('src/components/dashboard/MovementsView.tsx');
  assert.doesNotMatch(movements, /function monthRange/);
  assert.match(movements, /filtersForPeriod\(currentPeriod\)/);
});

test('Post-roadmap 1 writes actual transactions in cents without hidden x100 conversion', async () => {
  const cash = await ensureCashAccount('2026-10-01');

  await saveIncome({
    id: 'income-cents',
    accountId: cash.id,
    description: 'Cobro',
    amount: asCents(12_345),
    categoryId: 'sueldo',
    date: '2026-10-01',
    type: 'extra',
  });
  await saveExpense({
    id: 'expense-cents',
    accountId: cash.id,
    concept: 'Compra',
    amount: asCents(2_500),
    categoryId: 'alimentacion',
    date: '2026-10-01',
    nature: 'Variable',
    paymentMethod: 'cash',
  });

  assert.equal((await db.incomes.get('income-cents'))?.amount, 12_345);
  assert.equal((await db.expenses.get('expense-cents'))?.amount, 2_500);
  assert.equal(toCents(123.45), 12_345);

  const service = source('src/lib/transaction-service.ts');
  assert.doesNotMatch(service, /Math\.round\(value \* 100\)/);
});

test('Post-roadmap 1 formatting respects configured currency and locale boundaries', () => {
  assert.equal(currencyInputLabel('DOP'), 'RD$');
  assert.equal(currencyInputLabel('USD'), 'USD');
  assert.equal(formatCurrency(asCents(123_456), 'USD', 'en-US'), 'USD 1,234.56');

  const visibility = source('src/contexts/balance-visibility-context.tsx');
  assert.match(visibility, /const \{ currency, locale \} = useFinances\(\)/);
  assert.match(visibility, /formatCurrency\(amount, amountCurrency, locale\)/);

  const modal = source('src/components/dashboard/TransactionModal.tsx');
  assert.doesNotMatch(modal, />RD\$</);
  assert.match(modal, /currencyInputLabel\(currency\)/);
});

test('Post-roadmap 1 manual classification wins over later automatic suggestions', () => {
  assert.equal(shouldApplyAutomaticRuleField(false, 'food'), true);
  assert.equal(shouldApplyAutomaticRuleField(true, 'food'), false);
  assert.equal(shouldApplyAutomaticRuleField(false, undefined), false);

  const modal = source('src/components/dashboard/TransactionModal.tsx');
  assert.match(modal, /setCategoryEditedManually\(true\)/);
  assert.match(modal, /setNecessityEditedManually\(true\)/);
  assert.match(modal, /shouldApplyAutomaticRuleField/);
});

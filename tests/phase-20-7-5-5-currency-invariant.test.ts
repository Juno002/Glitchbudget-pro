import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requireSinglePositionCurrency, selectPosition } from '../src/domain/ledger';
import type { Account } from '../src/domain/models';

const through = '2026-09-30';
const emptySnapshot = { incomes: [], expenses: [], payments: [], transfers: [] };

function account(id: string, currency: string, openingBalance = 100_000): Account {
  return {
    id,
    name: id,
    type: 'bank',
    currency,
    openingBalance,
    startDate: '2026-09-01',
  };
}

test('20.7.5.5 position explicitly accepts a homogeneous single-currency dataset', () => {
  const accounts = [account('a', 'DOP', 100_000), account('b', 'DOP', 50_000)];
  assert.equal(requireSinglePositionCurrency(accounts), 'DOP');
  const position = selectPosition(accounts, [], emptySnapshot, through);
  assert.equal(position.liquidAssets, 150_000);
  assert.equal(position.netWorth, 150_000);
});

test('20.7.5.5 adversarial mixed-currency fixture cannot be summed nominally', () => {
  const accounts = [account('dop', 'DOP', 100_000), account('usd', 'USD', 100_000)];
  assert.throws(
    () => selectPosition(accounts, [], emptySnapshot, through),
    /monedas diferentes|conversión explícita/i,
  );
});

test('20.7.5.5 currency comparison is normalized before enforcing the invariant', () => {
  const accounts = [account('a', 'dop'), account('b', ' DOP ')];
  assert.equal(requireSinglePositionCurrency(accounts), 'DOP');
  assert.doesNotThrow(() => selectPosition(accounts, [], emptySnapshot, through));
});

test('20.7.5.5 empty position remains valid and has no inferred currency', () => {
  assert.equal(requireSinglePositionCurrency([]), undefined);
  const position = selectPosition([], [], emptySnapshot, through);
  assert.equal(position.netWorth, 0);
});

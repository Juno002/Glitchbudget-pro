import { describe, expect, it } from 'vitest';
import { compareKpi, selectPositionKpiComparisons } from '../src/domain/kpi-comparisons';
import type { ReportsSnapshotInput } from '../src/domain/reports';

const currentPeriod = { start: '2026-09-01', end: '2026-09-30' };
const comparablePeriod = { start: '2026-08-01', end: '2026-08-31' };

describe('20.8.2 canonical KPI comparisons', () => {
  it('declares periods, values, absolute delta and percentage delta', () => {
    expect(compareKpi(currentPeriod, comparablePeriod, 12500, 10000)).toEqual({
      currentPeriod,
      comparablePeriod,
      current: 12500,
      previous: 10000,
      absoluteDelta: 2500,
      percentageDelta: 25,
      status: 'comparable',
    });
  });

  it('does not invent a percentage when there is no comparable base', () => {
    expect(compareKpi(currentPeriod, comparablePeriod, 5000, 0)).toEqual({
      currentPeriod,
      comparablePeriod,
      current: 5000,
      previous: 0,
      absoluteDelta: 5000,
      percentageDelta: null,
      status: 'no_previous_base',
    });
  });

  it('uses the ledger-backed position selector for the four required KPIs', () => {
    const input: ReportsSnapshotInput = {
      accounts: [
        { id: 'cash', name: 'Cash', type: 'cash', initialBalance: 10000, archived: false },
        { id: 'bank', name: 'Bank', type: 'bank', initialBalance: 20000, archived: false },
        { id: 'inv', name: 'Investment', type: 'investment', initialBalance: 30000, archived: false },
      ],
      debts: [
        { id: 'card', name: 'Card', type: 'credit_card', principal: 0, creditLimit: 100000, archived: false },
      ],
      incomes: [
        { id: 'aug-income', concept: 'Income', amount: 10000, date: '2026-08-10', month: '2026-08', categoryId: 'salary', accountId: 'bank' },
        { id: 'sep-income', concept: 'Income', amount: 5000, date: '2026-09-10', month: '2026-09', categoryId: 'salary', accountId: 'bank' },
      ],
      expenses: [
        { id: 'aug-card', concept: 'Card purchase', amount: 4000, date: '2026-08-20', month: '2026-08', categoryId: 'food', nature: 'Variable', paymentMethod: 'credit', debtId: 'card' },
        { id: 'sep-cash', concept: 'Cash expense', amount: 2000, date: '2026-09-20', month: '2026-09', categoryId: 'food', nature: 'Variable', paymentMethod: 'cash', accountId: 'cash' },
      ],
      debtPayments: [],
      transfers: [],
    };

    const result = selectPositionKpiComparisons(input, currentPeriod, comparablePeriod);

    expect(result.liquidAvailable.currentPeriod).toEqual(currentPeriod);
    expect(result.liquidAvailable.comparablePeriod).toEqual(comparablePeriod);
    expect(result.liquidAvailable.current).toBe(43000);
    expect(result.liquidAvailable.previous).toBe(40000);
    expect(result.netWorth.current).toBe(69000);
    expect(result.netWorth.previous).toBe(66000);
    expect(result.totalDebt.current).toBe(4000);
    expect(result.totalDebt.previous).toBe(4000);
    expect(result.investments.current).toBe(30000);
    expect(result.investments.previous).toBe(30000);
  });
});

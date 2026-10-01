import type {
  Account,
  AccountTransfer,
  Debt,
  DebtPayment,
  Expense,
  Income,
} from './models';
import { selectPosition } from './ledger';
import type { DateRange } from './periods';

export type ComparableKpiComparison = {
  currentPeriod: DateRange;
  comparablePeriod: DateRange;
  current: number;
  previous: number;
  absoluteDelta: number;
  percentageDelta: number | null;
  status: 'comparable' | 'zero_previous';
};

export type NoPreviousBaseKpiComparison = {
  currentPeriod: DateRange;
  comparablePeriod: null;
  current: number;
  previous: null;
  absoluteDelta: null;
  percentageDelta: null;
  status: 'no_previous_base';
};

export type KpiComparison = ComparableKpiComparison | NoPreviousBaseKpiComparison;

export type PositionKpiComparisons = {
  liquidAvailable: KpiComparison;
  netWorth: KpiComparison;
  totalDebt: KpiComparison;
  investments: KpiComparison;
};

export type PositionKpiSnapshotInput = {
  accounts: Account[];
  debts: Debt[];
  incomes: Income[];
  expenses: Expense[];
  debtPayments: DebtPayment[];
  transfers: AccountTransfer[];
};

export function compareKpi(
  currentPeriod: DateRange,
  comparablePeriod: DateRange,
  current: number,
  previous: number,
): ComparableKpiComparison;
export function compareKpi(
  currentPeriod: DateRange,
  comparablePeriod: null,
  current: number,
  previous: null,
): NoPreviousBaseKpiComparison;
export function compareKpi(
  currentPeriod: DateRange,
  comparablePeriod: DateRange | null,
  current: number,
  previous: number | null,
): KpiComparison {
  if (comparablePeriod === null || previous === null) {
    if (comparablePeriod !== null || previous !== null) {
      throw new Error('La comparación KPI necesita período y valor anteriores, o ninguno de los dos.');
    }
    return {
      currentPeriod,
      comparablePeriod: null,
      current,
      previous: null,
      absoluteDelta: null,
      percentageDelta: null,
      status: 'no_previous_base',
    };
  }

  const absoluteDelta = current - previous;
  if (previous === 0) {
    return {
      currentPeriod,
      comparablePeriod,
      current,
      previous,
      absoluteDelta,
      percentageDelta: null,
      status: 'zero_previous',
    };
  }

  return {
    currentPeriod,
    comparablePeriod,
    current,
    previous,
    absoluteDelta,
    percentageDelta: Math.round((absoluteDelta / Math.abs(previous)) * 10_000) / 100,
    status: 'comparable',
  };
}

function positionAt(input: PositionKpiSnapshotInput, through: string) {
  return selectPosition(
    input.accounts,
    input.debts,
    {
      incomes: input.incomes,
      expenses: input.expenses,
      payments: input.debtPayments,
      transfers: input.transfers,
    },
    through,
  );
}

/**
 * Canonical period-over-period comparisons for the position KPIs used by
 * Resumen/Reportes. Values come directly from the canonical ledger position;
 * UI consumers must not reconstruct these deltas.
 */
export function selectPositionKpiComparisons(
  input: PositionKpiSnapshotInput,
  currentPeriod: DateRange,
  comparablePeriod: DateRange | null,
): PositionKpiComparisons {
  const current = positionAt(input, currentPeriod.end);

  if (comparablePeriod === null) {
    return {
      liquidAvailable: compareKpi(currentPeriod, null, current.liquidAssets, null),
      netWorth: compareKpi(currentPeriod, null, current.netWorth, null),
      totalDebt: compareKpi(currentPeriod, null, current.liabilities, null),
      investments: compareKpi(currentPeriod, null, current.investmentAssets, null),
    };
  }

  const previous = positionAt(input, comparablePeriod.end);
  return {
    liquidAvailable: compareKpi(currentPeriod, comparablePeriod, current.liquidAssets, previous.liquidAssets),
    netWorth: compareKpi(currentPeriod, comparablePeriod, current.netWorth, previous.netWorth),
    totalDebt: compareKpi(currentPeriod, comparablePeriod, current.liabilities, previous.liabilities),
    investments: compareKpi(currentPeriod, comparablePeriod, current.investmentAssets, previous.investmentAssets),
  };
}

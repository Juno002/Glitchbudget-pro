import type { ReportsSnapshotInput } from './reports';
import { selectNetWorthReport } from './reports';
import type { DateRange } from './periods';

export type KpiComparisonStatus = 'comparable' | 'no_previous_base';

export type KpiComparison = {
  currentPeriod: DateRange;
  comparablePeriod: DateRange;
  current: number;
  previous: number;
  absoluteDelta: number;
  percentageDelta: number | null;
  status: KpiComparisonStatus;
};

export type PositionKpiComparisons = {
  liquidAvailable: KpiComparison;
  netWorth: KpiComparison;
  totalDebt: KpiComparison;
  investments: KpiComparison;
};

export function compareKpi(
  currentPeriod: DateRange,
  comparablePeriod: DateRange,
  current: number,
  previous: number,
): KpiComparison {
  const absoluteDelta = current - previous;
  const hasComparableBase = previous !== 0;
  return {
    currentPeriod,
    comparablePeriod,
    current,
    previous,
    absoluteDelta,
    percentageDelta: hasComparableBase
      ? Math.round((absoluteDelta / Math.abs(previous)) * 10_000) / 100
      : null,
    status: hasComparableBase ? 'comparable' : 'no_previous_base',
  };
}

/**
 * Canonical period-over-period comparisons for the position KPIs used by
 * Resumen/Reportes. Values come from the existing ledger-backed net-worth
 * selector; UI consumers must not reconstruct these deltas.
 */
export function selectPositionKpiComparisons(
  input: ReportsSnapshotInput,
  currentPeriod: DateRange,
  comparablePeriod: DateRange,
): PositionKpiComparisons {
  const current = selectNetWorthReport(input, currentPeriod.end);
  const previous = selectNetWorthReport(input, comparablePeriod.end);

  return {
    liquidAvailable: compareKpi(currentPeriod, comparablePeriod, current.liquidAssets, previous.liquidAssets),
    netWorth: compareKpi(currentPeriod, comparablePeriod, current.netWorth, previous.netWorth),
    totalDebt: compareKpi(currentPeriod, comparablePeriod, current.liabilities, previous.liabilities),
    investments: compareKpi(currentPeriod, comparablePeriod, current.investments, previous.investments),
  };
}

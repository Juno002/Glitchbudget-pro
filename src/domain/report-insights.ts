export const QUICK_READ_THRESHOLDS = {
  spendingNearPercent: 5,
  cashFlowSignificantPercent: 15,
  netWorthSignificantPercent: 5,
  leadingCategorySharePercent: 35,
  maxInsights: 3,
} as const;

export type QuickReadFocus = 'spending' | 'cash-flow' | 'net-worth' | 'categories' | 'overview';
export type QuickReadDirection = 'increase' | 'decrease' | 'stable' | 'new';

export type QuickReadInsightKind =
  | 'spending_above_previous'
  | 'spending_below_previous'
  | 'spending_near_previous'
  | 'cash_flow_change'
  | 'net_worth_change'
  | 'leading_category'
  | 'no_material_change';

export type QuickReadInsight = {
  kind: QuickReadInsightKind;
  priority: number;
  focus: QuickReadFocus;
  direction: QuickReadDirection;
  copy: {
    key: QuickReadInsightKind;
    params: Record<string, string | number | null>;
  };
};

type ComparisonRow = {
  current: number;
  previous: number;
  difference: number;
  percentChange: number | null;
};

export type ReportQuickReadInput = {
  spending: {
    total: number;
    categories: { categoryId: string; value: number }[];
  };
  comparison: {
    spending: ComparisonRow;
    netCashFlow: ComparisonRow;
    netWorth: ComparisonRow & { status?: string };
  };
};

function directionFromDifference(value: number): QuickReadDirection {
  if (value > 0) return 'increase';
  if (value < 0) return 'decrease';
  return 'stable';
}

function percentageDirection(current: number, previous: number): QuickReadDirection {
  if (previous === 0 && current !== 0) return 'new';
  return directionFromDifference(current - previous);
}

function candidate(
  kind: QuickReadInsightKind,
  priority: number,
  focus: QuickReadFocus,
  direction: QuickReadDirection,
  params: Record<string, string | number | null>,
): QuickReadInsight {
  return { kind, priority, focus, direction, copy: { key: kind, params } };
}

/**
 * Deterministic, local-only editorial layer for Reports.
 *
 * It consumes canonical report metrics only. It does not read the clock,
 * persistence, React state, network data, or raw financial rows, and it never
 * infers causes. The same input always produces the same ranked output.
 */
export function selectReportQuickRead(input: ReportQuickReadInput): QuickReadInsight[] {
  const candidates: QuickReadInsight[] = [];
  const spending = input.comparison.spending;

  if (spending.previous !== 0 && spending.percentChange !== null) {
    const magnitude = Math.abs(spending.percentChange);
    if (magnitude <= QUICK_READ_THRESHOLDS.spendingNearPercent) {
      candidates.push(candidate(
        'spending_near_previous',
        40,
        'spending',
        'stable',
        {
          current: spending.current,
          previous: spending.previous,
          absoluteDelta: spending.difference,
          percentageDelta: spending.percentChange,
        },
      ));
    } else {
      const kind = spending.difference > 0 ? 'spending_above_previous' : 'spending_below_previous';
      candidates.push(candidate(
        kind,
        90,
        'spending',
        directionFromDifference(spending.difference),
        {
          current: spending.current,
          previous: spending.previous,
          absoluteDelta: spending.difference,
          percentageDelta: spending.percentChange,
        },
      ));
    }
  }

  const cashFlow = input.comparison.netCashFlow;
  const cashFlowMagnitude = cashFlow.percentChange === null ? null : Math.abs(cashFlow.percentChange);
  if (
    (cashFlow.previous === 0 && cashFlow.current !== 0) ||
    (cashFlowMagnitude !== null && cashFlowMagnitude >= QUICK_READ_THRESHOLDS.cashFlowSignificantPercent)
  ) {
    candidates.push(candidate(
      'cash_flow_change',
      100,
      'cash-flow',
      percentageDirection(cashFlow.current, cashFlow.previous),
      {
        current: cashFlow.current,
        previous: cashFlow.previous,
        absoluteDelta: cashFlow.difference,
        percentageDelta: cashFlow.percentChange,
      },
    ));
  }

  const netWorth = input.comparison.netWorth;
  const netWorthMagnitude = netWorth.percentChange === null ? null : Math.abs(netWorth.percentChange);
  if (
    (netWorth.previous === 0 && netWorth.current !== 0) ||
    (netWorthMagnitude !== null && netWorthMagnitude >= QUICK_READ_THRESHOLDS.netWorthSignificantPercent)
  ) {
    candidates.push(candidate(
      'net_worth_change',
      80,
      'net-worth',
      percentageDirection(netWorth.current, netWorth.previous),
      {
        current: netWorth.current,
        previous: netWorth.previous,
        absoluteDelta: netWorth.difference,
        percentageDelta: netWorth.percentChange,
      },
    ));
  }

  const leadingCategory = input.spending.categories[0];
  if (leadingCategory && input.spending.total > 0) {
    const sharePercent = Math.round((leadingCategory.value / input.spending.total) * 10_000) / 100;
    if (sharePercent >= QUICK_READ_THRESHOLDS.leadingCategorySharePercent) {
      candidates.push(candidate(
        'leading_category',
        60,
        'categories',
        'stable',
        {
          categoryId: leadingCategory.categoryId,
          value: leadingCategory.value,
          sharePercent,
          spendingTotal: input.spending.total,
        },
      ));
    }
  }

  if (candidates.length === 0) {
    candidates.push(candidate(
      'no_material_change',
      10,
      'overview',
      'stable',
      {
        spendingCurrent: spending.current,
        spendingPrevious: spending.previous,
        cashFlowCurrent: cashFlow.current,
        cashFlowPrevious: cashFlow.previous,
        netWorthCurrent: netWorth.current,
        netWorthPrevious: netWorth.previous,
      },
    ));
  }

  return candidates
    .sort((a, b) => b.priority - a.priority || a.kind.localeCompare(b.kind))
    .slice(0, QUICK_READ_THRESHOLDS.maxInsights);
}

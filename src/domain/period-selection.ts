import { periodContaining } from './periods';

/**
 * Preserve an explicit user period selection across unrelated settings changes.
 * Recenter only on first initialization or when periodStartDay itself changes.
 */
export function reconcileSelectedPeriod(
  selectedPeriodId: string,
  today: string,
  previousPeriodStartDay: number | null,
  nextPeriodStartDay: number,
): string {
  if (previousPeriodStartDay !== null && previousPeriodStartDay === nextPeriodStartDay) {
    return selectedPeriodId;
  }
  return periodContaining(today, { periodStartDay: nextPeriodStartDay }).id;
}

const FINANCIAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Canonical accounting date: a civil day with no time or timezone. */
export function isCanonicalFinancialDate(value: string): boolean {
  const match = FINANCIAL_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export type FinancialDatePartition<T> = {
  valid: T[];
  invalid: T[];
};

/**
 * Classifies rows by canonical financial date without assuming the persisted
 * value is a string. Corrupt historical IndexedDB rows can contain values that
 * violate the TypeScript model, so callers must not invoke string operations
 * before this boundary.
 */
export function partitionCanonicalFinancialDates<T extends { date?: unknown }>(
  rows: readonly T[],
): FinancialDatePartition<T> {
  const valid: T[] = [];
  const invalid: T[] = [];
  for (const row of rows) {
    if (typeof row.date === 'string' && isCanonicalFinancialDate(row.date)) valid.push(row);
    else invalid.push(row);
  }
  return { valid, invalid };
}

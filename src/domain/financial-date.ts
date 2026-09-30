const FINANCIAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Canonical accounting date: a local calendar day with no time or timezone. */
export function isCanonicalFinancialDate(value: string): boolean {
  const match = FINANCIAL_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function localFinancialDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function offsetFinancialDate(date: Date, timezoneOffsetMinutes: number): string {
  const shifted = new Date(date.getTime() - timezoneOffsetMinutes * 60_000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Compatibility boundary for legacy financial datetimes.
 *
 * Date-only values are preserved exactly. Legacy ISO instants are converted once
 * to the user's local civil day, then persisted/consumed as YYYY-MM-DD.
 * timezoneOffsetMinutes is injectable only to make timezone regression tests deterministic.
 */
export function normalizeFinancialDate(
  value: string,
  timezoneOffsetMinutes?: number,
): string {
  if (isCanonicalFinancialDate(value)) return value;
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) throw new Error('Fecha financiera inválida.');
  const normalized = timezoneOffsetMinutes === undefined
    ? localFinancialDate(instant)
    : offsetFinancialDate(instant, timezoneOffsetMinutes);
  if (!isCanonicalFinancialDate(normalized)) throw new Error('Fecha financiera inválida.');
  return normalized;
}

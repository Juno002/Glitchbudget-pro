import { isCanonicalFinancialDate } from '../domain/financial-date';

export { isCanonicalFinancialDate };

export function localFinancialDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function offsetFinancialDate(date: Date, timezoneOffsetMinutes: number): string {
  const shifted = new Date(date.getTime() - timezoneOffsetMinutes * 60_000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Compatibility boundary for legacy financial datetimes.
 * Date-only values are preserved exactly; legacy instants are converted once
 * to the user's local civil day before persistence/domain consumption.
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

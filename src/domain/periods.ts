export interface DateRange {
  start: string; // YYYY-MM-DD inclusive
  end: string;   // YYYY-MM-DD inclusive
}

export interface PeriodRange extends DateRange {
  /**
   * Stable period identifier. For a calendar month this is the same YYYY-MM.
   * When periodStartDay > 1, the id is the calendar month in which the period closes.
   * Example: id 2026-09 with start day 25 => 2026-08-25..2026-09-24.
   */
  id: string;
}

export interface PeriodSettings {
  periodStartDay?: number;
}

const MONTH_ID = /^(\d{4})-(0[1-9]|1[0-2])$/;
const ISO_DATE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function normalizePeriodStartDay(value: unknown): number {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseMonthId(id: string): { year: number; month: number } {
  const match = MONTH_ID.exec(id);
  if (!match) throw new Error('Período inválido.');
  return { year: Number(match[1]), month: Number(match[2]) };
}

function parseDate(value: string): { year: number; month: number; day: number } {
  const date = value.slice(0, 10);
  const match = ISO_DATE.exec(date);
  if (!match) throw new Error('Fecha inválida.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (day > daysInMonth(year, month)) throw new Error('Fecha inválida.');
  return { year, month, day };
}

function formatMonthId(year: number, month: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

function formatDate(year: number, month: number, day: number): string {
  return `${formatMonthId(year, month)}-${String(day).padStart(2, '0')}`;
}

export function shiftPeriodId(id: string, deltaMonths: number): string {
  const { year, month } = parseMonthId(id);
  const serial = year * 12 + (month - 1) + deltaMonths;
  const nextYear = Math.floor(serial / 12);
  const nextMonth = ((serial % 12) + 12) % 12 + 1;
  return formatMonthId(nextYear, nextMonth);
}

function anchorForMonth(id: string, startDay: number): string {
  const { year, month } = parseMonthId(id);
  return formatDate(year, month, Math.min(startDay, daysInMonth(year, month)));
}

function addDays(value: string, delta: number): string {
  let { year, month, day } = parseDate(value);
  let remaining = Math.trunc(delta);
  while (remaining > 0) {
    day += 1;
    if (day > daysInMonth(year, month)) {
      day = 1;
      month += 1;
      if (month > 12) { month = 1; year += 1; }
    }
    remaining -= 1;
  }
  while (remaining < 0) {
    day -= 1;
    if (day < 1) {
      month -= 1;
      if (month < 1) { month = 12; year -= 1; }
      day = daysInMonth(year, month);
    }
    remaining += 1;
  }
  return formatDate(year, month, day);
}

/**
 * Resolves a persisted YYYY-MM period id to its inclusive date range.
 * Existing Plan.month keys remain valid while no longer defining the range themselves.
 */
export function periodForId(id: string, settings: PeriodSettings = {}): PeriodRange {
  parseMonthId(id);
  const startDay = normalizePeriodStartDay(settings.periodStartDay);
  if (startDay === 1) {
    const start = anchorForMonth(id, 1);
    const end = addDays(anchorForMonth(shiftPeriodId(id, 1), 1), -1);
    return { id, start, end };
  }
  const start = anchorForMonth(shiftPeriodId(id, -1), startDay);
  const end = addDays(anchorForMonth(id, startDay), -1);
  return { id, start, end };
}

/**
 * Finds the financial period that contains a dated event.
 * No implicit clock is read: the caller always supplies the date.
 */
export function periodContaining(value: string, settings: PeriodSettings = {}): PeriodRange {
  const { year, month } = parseDate(value);
  const calendarId = formatMonthId(year, month);
  const startDay = normalizePeriodStartDay(settings.periodStartDay);
  if (startDay === 1) return periodForId(calendarId, settings);
  const currentAnchor = anchorForMonth(calendarId, startDay);
  const id = value.slice(0, 10) >= currentAnchor ? shiftPeriodId(calendarId, 1) : calendarId;
  return periodForId(id, settings);
}

export function contains(range: DateRange, value: string): boolean {
  const date = value.slice(0, 10);
  parseDate(date);
  return date >= range.start && date <= range.end;
}

export function previousComparablePeriod(period: PeriodRange, settings: PeriodSettings = {}): PeriodRange {
  return periodForId(shiftPeriodId(period.id, -1), settings);
}

export function nextPeriod(period: PeriodRange, settings: PeriodSettings = {}): PeriodRange {
  return periodForId(shiftPeriodId(period.id, 1), settings);
}


export type BudgetPeriodKind = 'weekly' | 'monthly' | 'yearly' | 'one_time';

export interface BudgetPeriodRange extends PeriodRange {
  kind: BudgetPeriodKind;
}

function weekdayMondayZero(value: string): number {
  const { year, month, day } = parseDate(value);
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (jsDay + 6) % 7;
}

export function budgetPeriodContaining(
  value: string,
  kind: BudgetPeriodKind,
  settings: PeriodSettings = {},
  oneTime?: DateRange,
): BudgetPeriodRange {
  const date = value.slice(0, 10);
  parseDate(date);

  if (kind === 'monthly') {
    return { ...periodContaining(date, settings), kind };
  }

  if (kind === 'weekly') {
    const start = addDays(date, -weekdayMondayZero(date));
    const end = addDays(start, 6);
    return { id: `weekly:${start}`, start, end, kind };
  }

  if (kind === 'yearly') {
    const { year } = parseDate(date);
    const start = formatDate(year, 1, 1);
    const end = formatDate(year, 12, 31);
    return { id: `yearly:${year}`, start, end, kind };
  }

  if (!oneTime) throw new Error('El presupuesto único necesita una fecha inicial y final.');
  parseDate(oneTime.start);
  parseDate(oneTime.end);
  if (oneTime.start > oneTime.end) throw new Error('El rango del presupuesto único es inválido.');
  if (!contains(oneTime, date)) throw new Error('La fecha de referencia debe estar dentro del presupuesto único.');
  return { id: `one-time:${oneTime.start}:${oneTime.end}`, start: oneTime.start, end: oneTime.end, kind };
}

export function previousBudgetPeriod(
  period: BudgetPeriodRange,
  settings: PeriodSettings = {},
): BudgetPeriodRange | undefined {
  if (period.kind === 'one_time') return undefined;
  if (period.kind === 'monthly') return { ...previousComparablePeriod(period, settings), kind: 'monthly' };
  if (period.kind === 'weekly') {
    const start = addDays(period.start, -7);
    return { id: `weekly:${start}`, start, end: addDays(start, 6), kind: 'weekly' };
  }
  const year = Number(period.start.slice(0, 4)) - 1;
  return { id: `yearly:${year}`, start: formatDate(year, 1, 1), end: formatDate(year, 12, 31), kind: 'yearly' };
}

export function nextBudgetPeriod(
  period: BudgetPeriodRange,
  settings: PeriodSettings = {},
): BudgetPeriodRange | undefined {
  if (period.kind === 'one_time') return undefined;
  if (period.kind === 'monthly') return { ...nextPeriod(period, settings), kind: 'monthly' };
  if (period.kind === 'weekly') {
    const start = addDays(period.start, 7);
    return { id: `weekly:${start}`, start, end: addDays(start, 6), kind: 'weekly' };
  }
  const year = Number(period.start.slice(0, 4)) + 1;
  return { id: `yearly:${year}`, start: formatDate(year, 1, 1), end: formatDate(year, 12, 31), kind: 'yearly' };
}

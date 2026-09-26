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

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
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
  const { year, month, day } = parseDate(value);
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return formatDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
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

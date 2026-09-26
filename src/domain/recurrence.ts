import type { RecurringRule } from './models';
import type { DateRange } from './periods';

const ISO_DATE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

type CalendarDate = { year: number; month: number; day: number };

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseDate(value: string): CalendarDate {
  const match = ISO_DATE.exec(value);
  if (!match) throw new Error('Fecha recurrente inválida.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (day > daysInMonth(year, month)) throw new Error('Fecha recurrente inválida.');
  return { year, month, day };
}

function formatDate({ year, month, day }: CalendarDate): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
  return formatDate({ year, month, day });
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export function validateDateRange(range: DateRange): DateRange {
  parseDate(range.start);
  parseDate(range.end);
  if (range.end < range.start) throw new Error('El rango recurrente termina antes de comenzar.');
  return range;
}

function monthlyAnchorDay(rule: RecurringRule): number {
  const startDay = parseDate(rule.startDate).day;
  if (rule.day === undefined || rule.day === 0) return startDay; // 0 survives only as legacy compatibility.
  if (!Number.isInteger(rule.day) || rule.day < 1 || rule.day > 31) throw new Error('Día mensual recurrente inválido.');
  return rule.day;
}

/**
 * Pure recurrence scheduler. It reads no clock, DB, browser API or network.
 * Weekly/biweekly rules advance by exact 7/14-day intervals from startDate.
 * Monthly rules use a calendar day and clamp 29–31 to the month's final valid day.
 */
export function scheduledDatesForRule(rule: RecurringRule, range: DateRange): string[] {
  validateDateRange(range);
  parseDate(rule.startDate);
  if (rule.endDate) {
    parseDate(rule.endDate);
    if (rule.endDate < rule.startDate) throw new Error('La fecha final precede al inicio de la regla.');
  }
  if (!rule.active) return [];

  const lower = range.start > rule.startDate ? range.start : rule.startDate;
  const upper = rule.endDate && rule.endDate < range.end ? rule.endDate : range.end;
  if (lower > upper) return [];

  if (rule.cadence === 'weekly' || rule.cadence === 'biweekly') {
    const step = rule.cadence === 'weekly' ? 7 : 14;
    let cursor = rule.startDate;
    while (cursor < lower) cursor = addDays(cursor, step);
    const result: string[] = [];
    while (cursor <= upper) {
      result.push(cursor);
      cursor = addDays(cursor, step);
    }
    return result;
  }

  if (rule.cadence !== 'monthly') throw new Error('Cadencia recurrente inválida.');

  const anchorDay = monthlyAnchorDay(rule);
  const start = parseDate(rule.startDate);
  let year = start.year;
  let month = start.month;
  const result: string[] = [];

  while (true) {
    const candidate = formatDate({ year, month, day: Math.min(anchorDay, daysInMonth(year, month)) });
    if (candidate > upper) break;
    if (candidate >= lower && candidate >= rule.startDate) result.push(candidate);
    ({ year, month } = nextMonth(year, month));
  }

  return result;
}

/** Stable storage ID. Logical uniqueness is still enforced by [ruleId+scheduledDate]. */
export function plannedOccurrenceId(ruleId: string, scheduledDate: string): string {
  if (!ruleId) throw new Error('La regla recurrente no tiene ID.');
  parseDate(scheduledDate);
  return `occ:${scheduledDate}:${ruleId}`;
}

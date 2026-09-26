import type { DateRange } from '../domain/periods';

function dateAtNoon(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function formatPeriodRange(range: DateRange, locale = 'es-DO'): string {
  const start = dateAtNoon(range.start);
  const end = dateAtNoon(range.end);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startText = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }).format(start);
  const endText = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(end);
  return `${startText} – ${endText}`;
}

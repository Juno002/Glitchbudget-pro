/** Civil-date presentation only; the selected and comparable ranges stay untouched. */
export function formatReportRangeLabel(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });
  const first = new Date(start + 'T12:00:00');
  return start === end ? formatter.format(first) : formatter.formatRange(first, new Date(end + 'T12:00:00'));
}

export function millisecondsUntilNextFinancialDay(now: Date): number {
  const next = new Date(now.getTime());
  next.setHours(24, 0, 0, 50);
  return Math.max(1_000, next.getTime() - now.getTime());
}

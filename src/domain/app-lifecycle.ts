import type { Settings } from './models';

export type VisibleTheme = 'light' | 'dark' | 'serious';
export type LoadableContentState = 'loading' | 'content' | 'empty';

export function resolveVisualTheme(theme: Settings['theme'], prefersDark: boolean): VisibleTheme {
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}

export function millisecondsUntilNextFinancialDay(now: Date): number {
  const next = new Date(now.getTime());
  next.setHours(24, 0, 0, 50);
  return Math.max(1_000, next.getTime() - now.getTime());
}

export function loadableContentState(loading: boolean, hasContent: boolean): LoadableContentState {
  if (loading) return 'loading';
  return hasContent ? 'content' : 'empty';
}

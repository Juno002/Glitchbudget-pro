import type { Settings } from './models';

export type VisibleTheme = 'light' | 'dark' | 'serious';
export type LoadableContentState = 'loading' | 'content' | 'empty';

export function resolveVisualTheme(theme: Settings['theme'], prefersDark: boolean): VisibleTheme {
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}

export function loadableContentState(loading: boolean, hasContent: boolean): LoadableContentState {
  if (loading) return 'loading';
  return hasContent ? 'content' : 'empty';
}

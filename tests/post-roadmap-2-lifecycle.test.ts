import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  loadableContentState,
  millisecondsUntilNextFinancialDay,
  resolveVisualTheme,
} from '../src/domain/app-lifecycle';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Post-roadmap 2 schedules a financial-day refresh at the next local midnight', () => {
  const now = new Date(2026, 9, 1, 23, 59, 30, 0);
  assert.equal(millisecondsUntilNextFinancialDay(now), 30_050);

  const hook = source('src/hooks/use-financial-today.ts');
  assert.match(hook, /visibilitychange/);
  assert.match(hook, /window\.addEventListener\('focus', schedule\)/);

  const provider = source('src/contexts/finance-context.tsx');
  assert.match(provider, /const today = useFinancialToday\(\)/);
  assert.match(provider, /materializePendingOccurrences\(plannedOccurrenceWindow\(today\)\)/);
  assert.match(provider, /\[recurringRules, today, toast\]/);
  assert.match(provider, /prepareBudgetPeriodsForDate\(today\)/);
  assert.match(provider, /\[loading, rawSettings, today, toast\]/);

  const summary = source('src/components/dashboard/summary-tab.tsx');
  assert.match(summary, /periodStartDay,\s*today,\s*locale,/);
  assert.doesNotMatch(summary, /const today=localDate\(\)/);
});

test('Post-roadmap 2 never resolves an unloaded summary module as empty', () => {
  assert.equal(loadableContentState(true, false), 'loading');
  assert.equal(loadableContentState(true, true), 'loading');
  assert.equal(loadableContentState(false, true), 'content');
  assert.equal(loadableContentState(false, false), 'empty');

  const summary = source('src/components/dashboard/summary-tab.tsx');
  for (const state of ['budgetState','upcomingState','goalsState','investmentsState']) {
    assert.match(summary, new RegExp(`${state}==='loading'`));
  }
  assert.match(summary, /data-summary-loading="true"/);
});

test('Post-roadmap 2 resolves system theme from prefers-color-scheme', () => {
  assert.equal(resolveVisualTheme('system', true), 'dark');
  assert.equal(resolveVisualTheme('system', false), 'light');
  assert.equal(resolveVisualTheme('dark', false), 'dark');
  assert.equal(resolveVisualTheme('light', true), 'light');
  assert.equal(resolveVisualTheme('serious', true), 'serious');

  const provider = source('src/contexts/finance-context.tsx');
  assert.match(provider, /window\.matchMedia\('\(prefers-color-scheme: dark\)'\)/);
  assert.match(provider, /media\.addEventListener\('change', applyTheme\)/);
  assert.match(provider, /theme: activeSettings\.theme/);
  assert.doesNotMatch(provider, /activeSettings\.theme === 'system' \? 'dark'/);

  const settings = source('src/components/layout/settings-dialog.tsx');
  assert.match(settings, /RadioGroupItem value="system"/);
  assert.match(settings, /Seguir sistema/);
});

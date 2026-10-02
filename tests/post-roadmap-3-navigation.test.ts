import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  navigationSearch,
  parseNavigationSearch,
  type NavigationLocation,
} from '../src/domain/navigation';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Post-roadmap 3 parses and serializes primary navigation deep links', () => {
  assert.deepEqual(parseNavigationSearch(''), {
    area:'summary',
    planningTab:'budgets',
    movementSection:null,
  });
  assert.deepEqual(parseNavigationSearch('?tab=movements&section=accounts'), {
    area:'movements',
    planningTab:'budgets',
    movementSection:'accounts',
  });
  assert.deepEqual(parseNavigationSearch('?tab=planning&plan=goals'), {
    area:'planning',
    planningTab:'goals',
    movementSection:null,
  });
  assert.deepEqual(parseNavigationSearch('?tab=unknown&plan=nope'), {
    area:'summary',
    planningTab:'budgets',
    movementSection:null,
  });

  const cases: NavigationLocation[] = [
    {area:'summary',planningTab:'budgets',movementSection:null},
    {area:'movements',planningTab:'budgets',movementSection:'investments'},
    {area:'planning',planningTab:'subscriptions',movementSection:null},
    {area:'reports',planningTab:'goals',movementSection:null},
  ];
  assert.deepEqual(cases.map(navigationSearch), [
    '',
    '?tab=movements&section=investments',
    '?tab=planning&plan=subscriptions',
    '?tab=reports',
  ]);
});

test('Post-roadmap 3 TabsContext owns typed URL/history navigation', () => {
  const tabs = source('src/contexts/tabs-context.tsx');
  assert.match(tabs, /activeTab: PrimaryArea/);
  assert.match(tabs, /setActiveTab: \(tab: PrimaryArea\)/);
  assert.match(tabs, /window\.history\[replace \? 'replaceState' : 'pushState'\]/);
  assert.match(tabs, /window\.addEventListener\('popstate', syncFromLocation\)/);
  assert.match(tabs, /parseNavigationSearch\(window\.location\.search\)/);
});

test('Post-roadmap 3 removes DOM timing races from cross-area navigation', () => {
  const summary = source('src/components/dashboard/summary-tab.tsx');
  assert.doesNotMatch(summary, /setTimeout/);
  assert.doesNotMatch(summary, /getElementById/);
  assert.match(summary, /navigate\(\{area:'movements',movementSection:'accounts'\}\)/);
  assert.match(summary, /navigate\(\{area:'movements',movementSection:'investments'\}\)/);

  const movements = source('src/components/dashboard/movements-tab.tsx');
  assert.match(movements, /ref=\{accountsRef\}/);
  assert.match(movements, /ref=\{investmentsRef\}/);
  assert.match(movements, /target\.scrollIntoView/);
  assert.match(movements, /target\.focus\(\{ preventScroll:true \}\)/);
  assert.doesNotMatch(movements, /getElementById/);
  assert.doesNotMatch(movements, /setTimeout/);
});

test('Post-roadmap 3 E2E covers URL state plus browser back and forward', () => {
  const e2e = source('scripts/e2e-smoke.mjs');
  assert.match(e2e, /window\.location\.search === '\?tab=movements'/);
  assert.match(e2e, /history\.back\(\)/);
  assert.match(e2e, /atrás vuelve a Planificados/);
  assert.match(e2e, /history\.forward\(\)/);
  assert.match(e2e, /adelante vuelve a Reportes/);
});

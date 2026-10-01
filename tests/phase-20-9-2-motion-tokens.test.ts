import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('20.9.2 defines the authorized five-family motion scale', () => {
  const css = source('src/app/globals.css');
  const js = source('src/lib/motion.ts');

  for (const [name, ms] of [
    ['press', 80],
    ['control', 110],
    ['menu', 130],
    ['content', 150],
    ['dialog', 170],
  ] as const) {
    assert.match(css, new RegExp(`--motion-${name}:\\s*${ms}ms`));
    assert.match(js, new RegExp(`${name}:\\s*${ms}`));
  }

  assert.match(css, /--motion-fast:\s*var\(--motion-control\)/);
  assert.match(css, /--motion-standard:\s*var\(--motion-content\)/);
  assert.match(css, /--motion-slow:\s*var\(--motion-dialog\)/);
});

test('20.9.2 primary controls use control timing plus immediate press feedback', () => {
  const button = source('src/components/ui/button.tsx');
  const shell = source('src/components/layout/app-shell.tsx');
  const bottom = source('src/components/layout/bottom-nav.tsx');
  const sidebar = source('src/components/layout/desktop-sidebar.tsx');

  for (const content of [button, shell, bottom, sidebar]) {
    assert.match(content, /duration-\[var\(--motion-control\)\]/);
    assert.match(content, /active:duration-\[var\(--motion-press\)\]/);
  }

  assert.doesNotMatch(shell, /motion-standard/);
  assert.doesNotMatch(bottom, /motion-standard/);
  assert.doesNotMatch(sidebar, /motion-standard/);
});

test('20.9.2 blocking surfaces share the dialog timing', () => {
  const dialog = source('src/components/ui/dialog.tsx');
  const alert = source('src/components/ui/alert-dialog.tsx');
  const sheet = source('src/components/ui/sheet.tsx');

  for (const content of [dialog, alert, sheet]) {
    assert.match(content, /duration-\[var\(--motion-dialog\)\]/);
  }

  assert.doesNotMatch(dialog, /duration-200/);
  assert.doesNotMatch(alert, /duration-200/);
  assert.doesNotMatch(sheet, /duration-(?:300|500)/);
});

test('20.9.2 menu-like surfaces share the menu timing', () => {
  for (const path of [
    'src/components/ui/popover.tsx',
    'src/components/ui/tooltip.tsx',
    'src/components/ui/select.tsx',
    'src/components/ui/dropdown-menu.tsx',
    'src/components/ui/menubar.tsx',
  ]) {
    assert.match(source(path), /duration-\[var\(--motion-menu\)\]/, path);
  }
});

test('20.9.2 removes audited legacy content/control durations', () => {
  const accordion = source('src/components/ui/accordion.tsx');
  const tailwind = source('tailwind.config.ts');
  const debts = source('src/components/dashboard/debts-tab.tsx');
  const planning = source('src/components/dashboard/planning-tab.tsx');
  const achievements = source('src/components/dashboard/achievements-panel.tsx');

  assert.match(accordion, /duration-\[var\(--motion-control\)\]/);
  assert.doesNotMatch(accordion, /duration-200/);
  assert.match(tailwind, /accordion-down var\(--motion-content\)/);
  assert.match(tailwind, /accordion-up var\(--motion-content\)/);

  assert.match(debts, /duration-\[var\(--motion-content\)\]/);
  assert.doesNotMatch(debts, /duration-500/);

  assert.match(planning, /MOTION_SECONDS\.content/);
  assert.doesNotMatch(planning, /duration:\s*0\.16/);

  assert.match(achievements, /transition-all duration-\[var\(--motion-control\)\]/);
  assert.doesNotMatch(achievements, /transition-all duration-300/);
});

test('20.9.2 preserves the global reduced-motion override', () => {
  const css = source('src/app/globals.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /transition-duration:\s*0\.01ms !important/);
  assert.match(css, /animation-duration:\s*0\.01ms !important/);
});

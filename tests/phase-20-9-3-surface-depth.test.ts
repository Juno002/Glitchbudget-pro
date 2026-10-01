import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('20.9.3 defines a semantic depth system for premium themes', () => {
  const css = source('src/app/globals.css');

  for (const token of [
    '--surface-card',
    '--surface-modal',
    '--surface-elevated',
    '--border-subtle',
    '--border-strong',
    '--shadow-card',
    '--shadow-control',
    '--shadow-popover',
    '--shadow-modal',
    '--shadow-nav',
    '--blur-navigation',
    '--backdrop',
  ]) {
    assert.ok(css.includes(token), token);
  }

  assert.match(css, /--blur-navigation:\s*18px/);
  assert.match(css, /--backdrop:\s*rgba\(27,47,43,0\.34\)/);
  assert.match(css, /--backdrop:\s*rgba\(8,8,8,0\.68\)/);
  assert.match(css, /\.serious \* \{[\s\S]*box-shadow:\s*none !important/);
});

test('20.9.3 cards use semantic card surface, border, spacing and depth', () => {
  const card = source('src/components/ui/card.tsx');
  assert.match(card, /bg-\[hsl\(var\(--surface-card\)\)\]/);
  assert.match(card, /border-\[var\(--border-subtle\)\]/);
  assert.match(card, /shadow-\[var\(--shadow-card\)\]/);
  assert.match(card, /p-\[var\(--space-card\)\]/);
});

test('20.9.3 blocking surfaces are opaque and share backdrop/modal depth', () => {
  for (const path of [
    'src/components/ui/dialog.tsx',
    'src/components/ui/alert-dialog.tsx',
    'src/components/ui/sheet.tsx',
  ]) {
    const content = source(path);
    assert.match(content, /bg-\[var\(--backdrop\)\]/, path);
    assert.match(content, /bg-\[hsl\(var\(--surface-modal\)\)\]/, path);
    assert.match(content, /shadow-\[var\(--shadow-modal\)\]/, path);
    assert.doesNotMatch(content, /bg-black\/80/, path);
    assert.doesNotMatch(content, /shadow-lg/, path);
  }

  const dialog = source('src/components/ui/dialog.tsx');
  const alert = source('src/components/ui/alert-dialog.tsx');
  assert.match(dialog, /rounded-\[var\(--radius-modal\)\]/);
  assert.match(alert, /rounded-\[var\(--radius-modal\)\]/);
  assert.doesNotMatch(dialog, /backdrop-blur-xl/);
});

test('20.9.3 elevated and navigation surfaces consume the shared policy', () => {
  const popover = source('src/components/ui/popover.tsx');
  const tabs = source('src/components/ui/tabs.tsx');
  const header = source('src/components/layout/header.tsx');
  const bottom = source('src/components/layout/bottom-nav.tsx');
  const separator = source('src/components/ui/separator.tsx');

  assert.match(popover, /surface-elevated/);
  assert.match(popover, /shadow-\[var\(--shadow-popover\)\]/);
  assert.doesNotMatch(popover, /backdrop-blur-xl/);

  assert.match(tabs, /surface-interactive/);
  assert.match(tabs, /border-\[var\(--border-subtle\)\]/);
  assert.doesNotMatch(tabs, /bg-black\/5|rgba\(255,255,255,0\.04\)|backdrop-blur/);

  assert.match(header, /backdrop-blur-\[var\(--blur-navigation\)\]/);
  assert.match(bottom, /backdrop-blur-\[var\(--blur-navigation\)\]/);
  assert.match(separator, /bg-\[var\(--border-subtle\)\]/);
});

test('20.9.3 browser smoke verifies both Prisma and Neon depth tokens', () => {
  const e2e = source('scripts/e2e-smoke.mjs');
  assert.match(e2e, /profundidad Prisma y Neón/);
  assert.match(e2e, /snapshot\('light'\)/);
  assert.match(e2e, /snapshot\('dark'\)/);
  assert.match(e2e, /light\.modalShadow !== dark\.modalShadow/);
});

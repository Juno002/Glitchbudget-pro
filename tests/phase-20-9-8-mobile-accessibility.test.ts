import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function source(path: string) {
  return readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}

test('20.9.8 keeps dialogs inside the visible viewport and device safe areas', () => {
  const css = source('src/app/globals.css');
  const dialog = source('src/components/ui/dialog.tsx');
  const alertDialog = source('src/components/ui/alert-dialog.tsx');
  const sheet = source('src/components/ui/sheet.tsx');
  const viewport = source('src/components/visible-viewport.tsx');

  assert.match(css, /env\(safe-area-inset-top, 0px\)/);
  assert.match(css, /env\(safe-area-inset-bottom, 0px\)/);
  assert.match(css, /env\(safe-area-inset-left, 0px\)/);
  assert.match(css, /env\(safe-area-inset-right, 0px\)/);
  assert.match(css, /\.viewport-sheet/);
  assert.match(css, /left: calc\([\s\S]*safe-area-inset-left[\s\S]*safe-area-inset-right/);
  assert.match(css, /\.viewport-sheet\[data-sheet-side='left'\]/);
  assert.doesNotMatch(css, /\.viewport-sheet \{[^}]*padding-(?:top|right|bottom|left):/);
  assert.match(dialog, /viewport-dialog/);
  assert.match(alertDialog, /viewport-dialog/);
  assert.match(sheet, /viewport-sheet/);
  assert.match(viewport, /window\.visualViewport/);
  assert.match(viewport, /viewport\?\.width/);
  assert.match(viewport, /viewport\?\.offsetLeft/);
  assert.match(css, /overflow-x: hidden/);
  assert.match(css, /scrollbar-gutter: stable/);
});

test('20.9.8 defines coarse-pointer touch targets without enlarging checkbox radio or switch glyphs', () => {
  const css = source('src/app/globals.css');
  const radio = source('src/components/ui/radio-group.tsx');
  const checkbox = source('src/components/ui/checkbox.tsx');
  const toggle = source('src/components/ui/switch.tsx');

  assert.match(css, /@media \(pointer: coarse\)/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /min-width: 44px/);
  assert.match(css, /not\(\[role='checkbox'\]\)/);
  assert.match(css, /input:not\(\[type='checkbox'\]\):not\(\[type='radio'\]\):not\(\[type='range'\]\):not\(\[type='hidden'\]\)/);
  assert.match(css, /textarea/);
  assert.match(radio, /after:-inset-3\.5/);
  assert.match(checkbox, /after:-inset-3\.5/);
  assert.match(toggle, /after:-inset-y-2\.5/);
});

test('20.9.8 numeric fields request the correct mobile keyboard and avoid small focused text', () => {
  const input = source('src/components/ui/input.tsx');
  const appLock = source('src/components/settings/app-lock-settings.tsx');

  assert.match(input, /type === "number" \? "decimal"/);
  assert.match(input, /inputMode=\{resolvedInputMode\}/);
  assert.match(input, /text-base[\s\S]*sm:text-sm/);
  assert.match(appLock, /inputMode="numeric"/);
});

test('20.9.8 fixes the confirmed invisible keyboard focus on achievement badges', () => {
  const achievements = source('src/components/dashboard/achievements-panel.tsx');

  assert.match(achievements, /data-achievement-badge=\{def\.id\}/);
  assert.match(achievements, /shadow-\[var\(--achievement-glow\)\]/);
  assert.match(achievements, /'--achievement-glow'/);
  assert.doesNotMatch(achievements, /boxShadow: isUnlocked/);
  assert.match(achievements, /focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2/);
  assert.doesNotMatch(achievements, /BadgeCard[\s\S]*focus:outline-none"/);
  assert.match(achievements, /opacity: isUnlocked \? 1 : 0\.62/);
  assert.match(achievements, /reducedMotion \? \{ duration: 0 \}/);
});

test('20.9.8 gives selected controls semantic focus and contrast instead of hover-only or hardcoded theme colors', () => {
  const select = source('src/components/ui/select.tsx');
  const dropdown = source('src/components/ui/dropdown-menu.tsx');
  const settings = source('src/components/layout/settings-dialog.tsx');

  assert.match(select, /focus-visible:ring-2/);
  assert.match(select, /focus:bg-accent focus:text-accent-foreground/);
  assert.match(select, /surface-elevated/);
  assert.doesNotMatch(select, /bg-white\/95/);
  assert.doesNotMatch(select, /focus:bg-black\/10/);
  assert.doesNotMatch(dropdown, /focus:bg-black\/10/);
  assert.match(settings, /focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2/);
});

test('20.9.8 high-risk mobile dialogs rely on the shared viewport contract', () => {
  const header = source('src/components/layout/header.tsx');
  const settings = source('src/components/layout/settings-dialog.tsx');
  const accounts = source('src/components/dashboard/accounts-overview.tsx');
  const investments = source('src/components/dashboard/investments-manager.tsx');
  const composer = source('src/components/dashboard/TransactionModal.tsx');
  const backups = source('src/components/backup/opfs-backup-dialog.tsx');

  for (const surface of [header, settings, accounts, investments, composer, backups]) {
    assert.doesNotMatch(surface, /DialogContent className="max-h-/);
  }
  assert.match(composer, /focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2/);
  assert.match(backups, /aria-label=\{'Descargar '\+file\.name\}/);
  assert.match(backups, /aria-label=\{'Restaurar '\+file\.name\}/);
  assert.match(backups, /aria-label=\{'Eliminar '\+file\.name\}/);
});

test('20.9.8 E2E distinguishes the BadgeCard focus ring from its normal achievement glow', () => {
  const e2e = source('scripts/e2e-smoke.mjs');
  const sidebar = source('src/components/ui/sidebar.tsx');
  const sheet = source('src/components/ui/sheet.tsx');

  assert.match(e2e, /focusBaselineShadow/);
  assert.match(e2e, /getPropertyValue\('--tw-ring-shadow'\)/);
  assert.match(e2e, /ringShadow\.includes\('2px'\)/);
  assert.match(e2e, /style\.boxShadow !== baselineShadow/);
  assert.match(sidebar, /className="w-\[--sidebar-width\] bg-sidebar p-0/);
  assert.match(sheet, /data-sheet-side=\{side\}/);
  assert.match(sheet, /right-4 top-4/);
});
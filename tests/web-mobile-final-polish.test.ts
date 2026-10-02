import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('mobile settings containment uses the visual viewport and forbids horizontal dialog overflow', () => {
  const css = source('src/app/globals.css');
  const viewport = source('src/components/visible-viewport.tsx');
  const settings = source('src/components/layout/settings-dialog.tsx');

  assert.match(css, /--visible-width/);
  assert.match(css, /--visible-left/);
  assert.match(css, /overflow-x: hidden/);
  assert.match(css, /scrollbar-gutter: stable/);
  assert.match(viewport, /viewport\?\.width/);
  assert.match(viewport, /viewport\?\.offsetLeft/);

  assert.match(settings, /overflow-x-hidden/);
  assert.match(settings, /sticky top-0/);
  assert.match(settings, /data-settings-mobile-navigation="prisma"/);
  assert.match(settings, /lg:hidden/);
  assert.match(settings, /lg:flex/);
  assert.doesNotMatch(settings, /overflow-x-auto/);
});

test('category editing and icon picking remain inside narrow mobile widths', () => {
  const expense = source('src/components/dashboard/expense-category-manager.tsx');
  const income = source('src/components/dashboard/income-category-manager.tsx');
  const maintenance = source('src/components/dashboard/category-maintenance.tsx');
  const picker = source('src/components/dashboard/icon-picker.tsx');

  for (const manager of [expense, income]) {
    assert.match(manager, /min-w-0 flex-1/);
    assert.match(manager, /min-w-0 flex-1/);
    assert.match(manager, /grid w-full grid-cols-1 gap-2 sm:grid-cols-2/);
  }

  assert.match(maintenance, /flex min-w-0 gap-2/);
  assert.match(maintenance, /className="min-w-0 flex-1"/);
  assert.match(picker, /aria-label="Elegir icono de categoría"/);
  assert.match(picker, /aria-pressed=\{value === name\}/);
  assert.match(picker, /grid-cols-5/);
  assert.match(picker, /sm:grid-cols-6/);
  assert.match(picker, /min-h-10 min-w-10/);
});

test('privacy and automation layouts tolerate active and long-content states', () => {
  const appLock = source('src/components/settings/app-lock-settings.tsx');
  const autoLock = source('src/components/settings/auto-lock-settings.tsx');
  const rules = source('src/components/settings/transaction-rule-manager.tsx');

  assert.match(appLock, /flex flex-col gap-3 sm:flex-row/);
  assert.match(appLock, /min-w-0 flex-wrap items-center/);
  assert.match(appLock, /w-full sm:w-auto/);

  assert.match(autoLock, /flex min-w-0 flex-col gap-3 sm:flex-row/);
  assert.match(autoLock, /shrink-0 self-end/);

  assert.match(rules, /break-words font-medium/);
  assert.match(rules, /break-words text-sm text-muted-foreground/);
});

test('backup surfaces handle long names without horizontal clipping', () => {
  const backups = source('src/components/backup/opfs-backup-dialog.tsx');
  const csv = source('src/components/backup/csv-backup-dialog.tsx');
  const storage = source('src/components/settings/persistent-storage-settings.tsx');

  assert.match(backups, /overflow-x-hidden sm:max-w-2xl/);
  assert.match(backups, /flex min-w-0 flex-col gap-2/);
  assert.match(backups, /break-all font-mono/);
  assert.match(backups, /shrink-0 items-center gap-1 self-end/);
  assert.match(backups, /h-52[\s\S]*sm:h-64/);

  assert.match(csv, /overflow-x-hidden sm:max-w-md/);
  assert.match(csv, /flex min-w-0 flex-col gap-2/);
  assert.match(storage, /whitespace-normal/);
});

test('coarse-pointer controls include text inputs while excluding checkbox radio and switch glyphs', () => {
  const css = source('src/app/globals.css');

  assert.match(css, /input:not\(\[type='checkbox'\]\):not\(\[type='radio'\]\):not\(\[type='range'\]\):not\(\[type='hidden'\]\)/);
  assert.match(css, /textarea/);
  assert.match(css, /min-height: 44px/);
});

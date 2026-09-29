import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('20.2 lifts primary navigation state around the shared shell', () => {
  const page = read('src/app/page.tsx');
  const provider = page.indexOf('<TabsProvider');
  const shell = page.indexOf('<AppShell>');
  assert.ok(provider >= 0 && shell > provider);
  assert.ok(page.indexOf('</AppShell>') < page.indexOf('</TabsProvider>'));

  const content = read('src/components/dashboard/dashboard-content.tsx');
  assert.doesNotMatch(content, /TabsList|BottomNav|PRIMARY_NAV_ITEMS/);
});

test('20.2 shell exposes desktop sidebar, mobile navigation and one shared composer state', () => {
  const shell = read('src/components/layout/app-shell.tsx');
  assert.match(shell, /DesktopSidebar/);
  assert.match(shell, /BottomNav/);
  assert.match(shell, /TransactionModal/);
  assert.match(shell, /data-app-shell="prisma"/);
  assert.match(shell, /aria-label="Nuevo movimiento"/);
  assert.match(shell, /md:hidden/);
  assert.match(shell, /id="main-content"/);
  assert.match(shell, /Saltar al contenido/);
});

test('20.2 desktop and mobile navigation share the canonical four destinations', () => {
  for (const path of [
    'src/components/layout/desktop-sidebar.tsx',
    'src/components/layout/bottom-nav.tsx',
  ]) {
    const source = read(path);
    assert.match(source, /PRIMARY_NAV_ITEMS/, path);
    assert.match(source, /useTabs/, path);
    assert.match(source, /aria-current/, path);
  }

  const nav = read('src/components/layout/primary-navigation.ts');
  for (const label of ['Resumen', 'Movimientos', 'Plan', 'Reportes']) {
    assert.ok(nav.includes(label), label);
  }
});

test('20.2 establishes Prisma light and Neon dark without dropping legacy theme compatibility', () => {
  const css = read('src/app/globals.css');
  assert.match(css, /:root,\s*\.light\s*\{/);
  assert.match(css, /Modo Prisma/);
  assert.match(css, /\.dark\s*\{[\s\S]*Modo Neón/);
  for (const token of [
    '--sidebar-background',
    '--sidebar-accent',
    '--brand-coral',
    '--shadow-card',
    '--shadow-floating',
    '--shadow-nav',
  ]) {
    assert.ok(css.includes(token), token);
  }

  const defaults = read('src/lib/settings-read-model.ts');
  assert.match(defaults, /theme: 'light'/);

  const settings = read('src/components/layout/settings-dialog.tsx');
  assert.match(settings, /Prisma claro/);
  assert.match(settings, /Neón oscuro/);
  assert.match(settings, /Minimalista legado/);

  const model = read('src/domain/models.ts');
  assert.match(model, /'light' \| 'dark' \| 'system' \| 'serious'/);
});

test('20.2 changes visual composition without introducing financial or persistence rules into shell', () => {
  for (const path of [
    'src/components/layout/app-shell.tsx',
    'src/components/layout/desktop-sidebar.tsx',
    'src/components/layout/header.tsx',
    'src/components/layout/bottom-nav.tsx',
    'src/components/layout/brand-mark.tsx',
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /@\/lib\/db|dexie|deriveMetrics|accountBalance|liabilities|toCents|amountBase/, path);
  }

  const motion = read('src/components/motion-preferences.tsx');
  assert.match(motion, /reducedMotion="user"/);
  assert.match(read('src/app/globals.css'), /prefers-reduced-motion/);
});

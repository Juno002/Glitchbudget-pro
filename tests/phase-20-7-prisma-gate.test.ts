import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path:string) => readFileSync(new URL('../'+path, import.meta.url),'utf8');

test('20.7 secondary surfaces are covered by the Prisma visual system', () => {
  const checks:Array<[string,string]> = [
    ['src/components/dashboard/accounts-overview.tsx','data-accounts-prisma="true"'],
    ['src/components/dashboard/debts-tab.tsx','data-cards-prisma="true"'],
    ['src/components/dashboard/investments-manager.tsx','data-investments-prisma="true"'],
    ['src/components/dashboard/category-maintenance.tsx','data-category-maintenance="prisma"'],
    ['src/components/layout/settings-dialog.tsx','data-settings-prisma="true"'],
    ['src/components/backup/opfs-backup-dialog.tsx','data-backups-prisma="true"'],
    ['src/components/settings/app-lock-settings.tsx','data-app-lock-settings="prisma"'],
    ['src/components/settings/auto-lock-settings.tsx','data-auto-lock-settings="prisma"'],
    ['src/components/settings/persistent-storage-settings.tsx','data-persistent-storage-settings="prisma"'],
    ['src/components/dashboard/achievements-panel.tsx','data-achievements-prisma="true"'],
    ['src/components/finance-ui/empty-state.tsx','shadow-[var(--shadow-control)]'],
    ['src/app/error.tsx','data-error-state="prisma"'],
  ];
  for (const [path,marker] of checks) assert.ok(read(path).includes(marker), path);
});

test('20.7 visible product branding is Prisma across shell, PWA and user-facing copy', () => {
  const layout=read('src/app/layout.tsx');
  const sidebar=read('src/components/layout/desktop-sidebar.tsx');
  const header=read('src/components/layout/header.tsx');
  const lock=read('src/components/security/app-lock-gate.tsx');
  const manifest=JSON.parse(read('public/manifest.json')) as {name:string;short_name:string};
  assert.match(layout,/title: 'Prisma'/);
  assert.match(layout,/apple-mobile-web-app-title" content="Prisma"/);
  assert.match(sidebar,/>Prisma<\/span>/);
  assert.match(header,/>Prisma<\/span>/);
  assert.match(lock,/>Prisma bloqueado<\/h1>/);
  assert.equal(manifest.name,'Prisma');
  assert.equal(manifest.short_name,'Prisma');

  for (const path of [
    'src/app/layout.tsx',
    'src/components/layout/desktop-sidebar.tsx',
    'src/components/layout/header.tsx',
    'src/components/security/app-lock-gate.tsx',
    'src/components/dashboard/investments-manager.tsx',
    'src/components/backup/encrypted-backup-export.tsx',
    'src/components/backup/encrypted-backup-restore.tsx',
    'src/components/backup/import-confirmation.tsx',
    'src/components/backup/csv-backup-dialog.tsx',
  ]) {
    assert.doesNotMatch(read(path),/GlitchBudget(?: Pro)?/);
  }
});

test('20.7 preserves persistent GlitchBudget technical identifiers for compatibility', () => {
  const db=read('src/lib/db.ts');
  const security=read('src/domain/local-security.ts');
  const backup=read('src/lib/backup-json.ts');
  const management=read('src/hooks/use-backup-management.ts');
  assert.match(db,/class GlitchBudgetDB extends Dexie/);
  assert.match(db,/constructor\(name = 'GlitchBudgetDB'\)/);
  assert.match(db,/CURRENT_DB_SCHEMA_VERSION = 15/);
  assert.match(security,/BALANCE_VISIBILITY_STORAGE_KEY = 'glitchbudget_balances_hidden_v1'/);
  assert.match(security,/APP_LOCK_STORAGE_KEY = 'glitchbudget_app_lock_v1'/);
  assert.match(security,/AUTO_LOCK_STORAGE_KEY = 'glitchbudget_auto_lock_v1'/);
  assert.match(security,/ENCRYPTED_BACKUP_FORMAT = 'GlitchBudget encrypted backup'/);
  assert.match(security,/ENCRYPTED_BACKUP_VERSION = 1/);
  assert.match(backup,/CURRENT_BACKUP_FORMAT_VERSION = 13/);
  assert.match(management,/const name = `glitchbudget-backup-\$\{timestamp\}\.json`/);
});

test('20.7 brands only newly downloaded backup filenames, not backup formats', () => {
  const backup=read('src/lib/backup-json.ts');
  const encrypted=read('src/components/backup/encrypted-backup-export.tsx');
  const management=read('src/hooks/use-backup-management.ts');
  assert.match(backup,/prisma-backup-/);
  assert.match(encrypted,/prisma-encrypted-backup-/);
  assert.match(management,/anchor\.download = `prisma-backup-/);
});

test('20.7 keeps sounds, motion and chart system protected', () => {
  const sounds=read('src/lib/sounds.ts');
  for (const name of ['playExpense','playIncome','playBudgetExceeded','playGoalComplete','playCoinDrop','playAchievementUnlock']) {
    assert.ok(sounds.includes(name),name);
  }
  const achievements=read('src/components/dashboard/achievements-panel.tsx');
  assert.match(achievements,/framer-motion/);
  assert.match(achievements,/playAchievementUnlock/);
  assert.match(achievements,/triggerConfetti/);
  const reports=read('src/components/dashboard/reports-tab.tsx');
  for (const chart of ['ReportCategoryDonut','ReportValueBars','ReportComparisonBars']) assert.ok(reports.includes(chart),chart);
});

test('20.7 changed secondary UI does not introduce direct financial persistence', () => {
  const paths=[
    'src/components/dashboard/investments-manager.tsx',
    'src/components/dashboard/category-maintenance.tsx',
    'src/components/layout/settings-dialog.tsx',
    'src/components/backup/opfs-backup-dialog.tsx',
    'src/components/settings/app-lock-settings.tsx',
    'src/components/security/app-lock-gate.tsx',
  ];
  const source=paths.map(read).join('\n');
  assert.doesNotMatch(source,/from ['\"]dexie['\"]|IndexedDB|@\/lib\/db|\bdb\./i);
});

test('20.7 carries no Prisma mock finance data into final visible surfaces', () => {
  const source=[
    'src/components/dashboard/summary-tab.tsx',
    'src/components/dashboard/MovementsView.tsx',
    'src/components/dashboard/planning-tab.tsx',
    'src/components/dashboard/reports-tab.tsx',
    'src/components/dashboard/investments-manager.tsx',
  ].map(read).join('\n');
  for (const demo of ['Alex','Internet hogar','Netflix','8.4%','12.6%','RD$30,000']) {
    assert.equal(source.includes(demo),false,demo);
  }
});

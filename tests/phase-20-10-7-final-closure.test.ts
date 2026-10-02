import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('20.10.7 README stays product-facing while documenting maintenance essentials', () => {
  const readme = source('README.md');

  for (const required of [
    'Prisma',
    'Resumen',
    'Movimientos',
    'Plan',
    'Reportes',
    'Lectura rápida',
    'App Lock',
    'Modo Prisma',
    'Modo Neón',
    'Copias y recuperación',
    'Node.js 22',
    'npm ci',
    'npm run dev',
    'npm run check',
    'Nombre público y compatibilidad interna',
    'GlitchBudget',
    'src/domain/local-security.ts',
  ]) {
    assert.match(readme, new RegExp(required, 'i'), required);
  }

  assert.equal((readme.match(/GlitchBudget/g) ?? []).length, 1);

  for (const forbidden of [
    /roadmap/i,
    /\bfase\s+\d/i,
    /\bgate\b/i,
    /\bPR\s*#?\d/i,
    /\bcommit\b/i,
    /\bSHA\b/i,
    /Quality checks/i,
  ]) {
    assert.doesNotMatch(readme, forbidden);
  }
});

test('20.10.7 Prisma is visible while compatibility identifiers remain internal', () => {
  const manifest = JSON.parse(source('public/manifest.json'));
  const layout = source('src/app/layout.tsx');
  const brand = source('src/components/layout/brand-mark.tsx');
  const db = source('src/lib/db.ts');
  const security = source('src/domain/local-security.ts');
  const encrypted = source('src/lib/encrypted-backup.ts');
  const backupHook = source('src/hooks/use-backup-management.ts');
  const preImport = source('src/lib/pre-import-backup.ts');

  assert.equal(manifest.name, 'Prisma');
  assert.equal(manifest.short_name, 'Prisma');
  assert.match(layout, /title:\s*'Prisma'/);
  assert.match(brand, /#18433D/);
  assert.match(brand, /#EA6857/);
  assert.match(brand, /#86B6A8/);

  assert.match(db, /class GlitchBudgetDB/);
  assert.match(security, /GlitchBudget encrypted backup/);
  assert.match(security, /glitchbudget_app_lock_v1/);

  assert.match(encrypted, /compatible de Prisma/);
  assert.match(backupHook, /const name = `glitchbudget-backup-/);
  assert.match(backupHook, /anchor\.download = `prisma-backup-/);
  assert.match(preImport, /glitchbudget-pre-import-/);
});

test('20.10.7 roadmap closure and historical quality review are reconciled', () => {
  const roadmap = source('Roadmap septiembre 2026.txt');
  const phase20 = source('docs/roadmap/phase-20.md');
  const phase2010 = source('docs/roadmap/phase-20-10.md');
  const quality = source('docs/quality-review.md');

  assert.match(roadmap, /20\.10\.1–20\.10\.7 cerradas/);
  assert.match(roadmap, /# Post-roadmap — Hardening técnico de Prisma/);
  assert.match(phase20, /Fase 20 completada \/ Gate final aprobado/);
  assert.match(phase2010, /20\.10\.1–20\.10\.7 cerradas \/ Gate final aprobado/);

  assert.doesNotMatch(quality, /^No hay cifrado de respaldos ni sincronización\./m);
  assert.match(quality, /Dexie v15/);
  assert.match(quality, /backup JSON canónico es v13/);
  assert.match(quality, /copia cifrada opcional/);
});

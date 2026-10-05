import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('20.9.6 Reportes exposes Spanish section and metric labels', () => {
  const reports = source('src/components/dashboard/reports-tab.tsx');

  for (const expected of [
    '>Gastos<',
    '>Comparación<',
    '>Flujo de caja<',
    '>Patrimonio neto<',
    "label:'Ingresos'",
    "label:'Pagos de deuda'",
    'label="Flujo neto"',
    'label="Patrimonio neto"',
    'Movimientos de mayor importe',
  ]) assert.ok(reports.includes(expected), expected);

  for (const forbidden of [
    '>Spending<',
    '>Comparison<',
    '>Cash Flow<',
    '>Net Worth<',
    'label="Income"',
    'label="Debt payments"',
    'label="Net cash flow"',
    'label="Net worth"',
    '>Largest transactions<',
  ]) assert.ok(!reports.includes(forbidden), forbidden);
});

test('20.9.6 visible Home terminology is normalized to Resumen', () => {
  const summary = source('src/components/dashboard/summary-tab.tsx');

  for (const expected of [
    'Personalizar Resumen',
    'Sección inicial al abrir Resumen',
    'Al entrar a Resumen se enfoca esta sección.',
    'Restablecer Resumen',
  ]) assert.ok(summary.includes(expected), expected);

  for (const forbidden of [
    'Personalizar Home',
    'Sección inicial al abrir Home',
    'Al entrar a Home se enfoca esta sección.',
    'Restablecer Home',
  ]) assert.ok(!summary.includes(forbidden), forbidden);
});

test('20.9.6 local automation uses Spanish visible names without renaming internal ids', () => {
  const settings = source('src/components/layout/settings-dialog.tsx');
  const rules = source('src/components/settings/transaction-rule-manager.tsx');
  const automation = source('src/components/dashboard/transaction-modal-automation.tsx');

  assert.match(settings, /data-local-automation-order="templates-saved-filters-rules"/);
  assert.match(settings, /\{layer\.title\}/);
  assert.match(rules, /registro rápido/);
  assert.match(automation, /registro rápido/);

  for (const forbidden of [
    'Templates → Saved filters → Rules',
    'Templates se gestionan dentro de Quick Add',
    'Quick Add no elegirá',
    'Quick Add presenta',
    'sugerencias locales en Quick Add',
    'clasificación de Quick Add',
  ]) {
    assert.ok(!settings.includes(forbidden) && !rules.includes(forbidden) && !automation.includes(forbidden), forbidden);
  }

  assert.match(automation, /data-quick-add-templates="prisma"/);
  assert.match(settings, /data-local-automation-order="templates-saved-filters-rules"/);
});

test('20.9.6 lock surfaces use Spanish product terminology', () => {
  const appLock = source('src/components/settings/app-lock-settings.tsx');
  const autoLock = source('src/components/settings/auto-lock-settings.tsx');
  const gate = source('src/components/security/app-lock-gate.tsx');

  assert.match(appLock, /Bloqueo de aplicación activo/);
  assert.match(appLock, /Activar bloqueo/);
  assert.match(autoLock, /Bloqueo automático/);
  assert.match(gate, /El bloqueo de aplicación protege esta interfaz/);

  assert.doesNotMatch(appLock, /App lock/);
  assert.doesNotMatch(autoLock, /App lock|Auto-lock/);
  assert.doesNotMatch(gate, /App lock/);
});

test('20.9.6 backup surfaces say copia while preserving technical formats', () => {
  const opfs = source('src/components/backup/opfs-backup-dialog.tsx');
  const encryptedExport = source('src/components/backup/encrypted-backup-export.tsx');
  const encryptedRestore = source('src/components/backup/encrypted-backup-restore.tsx');
  const preview = source('src/components/backup/backup-preview-summary.tsx');
  const persistence = source('src/components/settings/persistent-storage-settings.tsx');

  assert.match(opfs, /Copia no válida/);
  assert.match(encryptedExport, /copia cifrada/i);
  assert.match(encryptedExport, /Copia cifrada exportada/);
  assert.match(encryptedExport, /Crear copia cifrada/);
  assert.match(encryptedRestore, /Restaurar copia cifrada/);
  assert.match(encryptedRestore, /Contraseña de la copia/);
  assert.match(preview, /Copia JSON v/);
  assert.match(preview, / · esquema /);
  assert.match(persistence, /copias de seguridad externas/);

  assert.doesNotMatch(opfs, /Backup no válido|backup cifrado opcional/);
  assert.doesNotMatch(encryptedExport, />Backup cifrado<|Crear backup cifrado|sección de backups/);
  assert.doesNotMatch(encryptedRestore, /Restaurar backup cifrado|Contraseña del backup|Revisar backup/);
  assert.doesNotMatch(preview, /Resumen del backup|Backup JSON v| · schema | · app /);
});

test('20.9.6 propagated display sources are also Spanish', () => {
  const reports = source('src/components/dashboard/reports-tab.tsx');
  const automation = source('src/lib/local-automation.ts');
  const encrypted = source('src/lib/encrypted-backup.ts');
  const management = source('src/hooks/use-backup-management.ts');

  for (const label of [
    "{label:'Gastos en efectivo'",
    "{label:'Efectivo'",
    "{label:'Bancos'",
    "{label:'Inversiones'",
    "{label:'Pasivos'",
  ]) assert.ok(reports.includes(label), label);

  assert.match(automation, /title: 'Plantillas'/);
  assert.match(automation, /location: 'Registro rápido'/);
  assert.match(automation, /title: 'Filtros guardados'/);
  assert.match(automation, /title: 'Reglas'/);
  assert.doesNotMatch(automation, /title: 'Templates'|title: 'Saved filters'|title: 'Rules'|location: 'Quick Add'|una Rule/);

  assert.match(encrypted, /copia cifrada/i);
  assert.doesNotMatch(encrypted, /backup cifrado/i);
  assert.match(management, /Copia cifrada restaurada/);
  assert.match(management, /No se pudo restaurar la copia cifrada/);
  assert.doesNotMatch(management, /Backup cifrado restaurado|restaurar el backup cifrado/);
});

test('20.9.6 keeps documented technical names and formats unchanged', () => {
  const help = source('src/components/layout/help-dialog.tsx');
  const csv = source('src/components/backup/csv-backup-dialog.tsx');
  const lockGate = source('src/components/security/app-lock-gate.tsx');

  assert.match(help, /JSON/);
  assert.match(csv, /CSV/);
  assert.match(csv, /Google Sheets/);
  assert.match(csv, /OPFS/);
  assert.match(lockGate, /Dexie/);
});
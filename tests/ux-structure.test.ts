import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Summary remains status-first and keeps category charts out of the home surface', () => {
  const source = read('src/components/dashboard/summary-tab.tsx');
  assert.match(source, /Posición financiera/);
  assert.match(source, /Presupuesto disponible/);
  assert.doesNotMatch(source, /recharts/);
  assert.doesNotMatch(source, /PieChart/);
});

test('all primary areas use the shared page header hierarchy', () => {
  for (const path of [
    'src/components/dashboard/summary-tab.tsx',
    'src/components/dashboard/movements-tab.tsx',
    'src/components/dashboard/planning-tab.tsx',
    'src/components/dashboard/reports-tab.tsx',
  ]) {
    assert.match(read(path), /PageHeader/, path);
  }
});

test('header delegates settings to a structured settings surface', () => {
  const header = read('src/components/layout/header.tsx');
  assert.match(header, /SettingsDialog/);
  assert.doesNotMatch(header, /DropdownMenu/);

  const settings = read('src/components/layout/settings-dialog.tsx');
  for (const label of ['General','Finanzas','Categorías','Privacidad','Datos','Apariencia','Acerca de']) {
    assert.ok(settings.includes(label), label);
  }
});

test('account view adopts the common detail header instead of inventing another detail pattern', () => {
  const accounts = read('src/components/dashboard/accounts-overview.tsx');
  assert.match(accounts, /DetailHeader/);
});

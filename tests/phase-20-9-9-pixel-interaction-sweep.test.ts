import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function source(path: string) {
  return readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}

test('20.9.9 replaces residual functional emoji with the shared Lucide action language', () => {
  for (const path of [
    'src/components/dashboard/expense-category-manager.tsx',
    'src/components/dashboard/income-category-manager.tsx',
  ]) {
    const content = source(path);
    assert.match(content, /import \{ Plus, RotateCcw \} from "lucide-react"/);
    assert.match(content, /<Plus className="mr-2 h-4 w-4" aria-hidden="true" \/>Agregar/);
    assert.match(content, /<RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" \/>Restablecer/);
    assert.doesNotMatch(content, /➕|🔄/);
  }
});

test('20.9.9 closes residual radius and state exceptions in audited secondary surfaces', () => {
  const investment = source('src/components/dashboard/investments-manager.tsx');
  const accounts = source('src/components/dashboard/accounts-overview.tsx');
  const settings = source('src/components/layout/settings-dialog.tsx');
  const row = source('src/components/finance-ui/transaction-row.tsx');

  assert.match(investment, /<Skeleton className="h-24 w-full rounded-\[var\(--radius-card\)\]"/);
  assert.doesNotMatch(investment, /animate-pulse rounded-xl/);
  assert.doesNotMatch(investment, /rounded-lg border p-3 text-xs text-muted-foreground/);

  assert.doesNotMatch(accounts, /<details className="rounded-xl/);
  assert.match(accounts, /active:bg-muted\/50/);
  assert.match(accounts, /focus-visible:ring-ring focus-visible:ring-offset-2/);

  assert.doesNotMatch(settings, /rounded-xl border bg-muted\/20/);
  assert.doesNotMatch(settings, /rounded-xl border border-destructive/);

  assert.doesNotMatch(row, /rounded-xl/);
  assert.match(row, /rounded-\[var\(--radius-interactive\)\]/);
  assert.match(row, /active:bg-muted\/45/);
});

test('20.9.9 routes residual Plan actions back through the shared Button primitive', () => {
  const plan = source('src/components/dashboard/planning-tab.tsx');

  assert.match(plan, /<Button variant="outline" className="mt-4 min-h-12 w-full border-dashed text-primary hover:bg-primary\/10">/);
  assert.match(plan, /<Button[\s\S]*Guardar presupuesto/);
  assert.match(plan, /<Button type="button" variant="outline" className="min-h-11"/);
  assert.doesNotMatch(plan, /<button className="mt-4 flex min-h-12/);
  assert.doesNotMatch(plan, /<button type="button" className="min-h-11/);
});

test('20.9.9 browser sweep exercises real premium-theme controls and residual category iconography', () => {
  const e2e = source('scripts/e2e-smoke.mjs');

  assert.match(e2e, /iconografía funcional de categorías/);
  assert.match(e2e, /#theme-dark/);
  assert.match(e2e, /tema Neón oscuro real/);
  assert.match(e2e, /#theme-light/);
  assert.match(e2e, /tema Prisma claro real/);
  assert.match(e2e, /premium-theme interaction/);
});

test('20.9.9 remains a visual-interaction sweep with no financial or persistence implementation', () => {
  const paths = [
    'src/components/dashboard/expense-category-manager.tsx',
    'src/components/dashboard/income-category-manager.tsx',
    'src/components/dashboard/investments-manager.tsx',
    'src/components/dashboard/accounts-overview.tsx',
    'src/components/dashboard/planning-tab.tsx',
    'src/components/finance-ui/transaction-row.tsx',
    'src/components/layout/settings-dialog.tsx',
  ];
  const combined = paths.map(source).join('\n');

  assert.doesNotMatch(combined, /db\.version\(|CURRENT_DB_SCHEMA_VERSION\s*=|fetch\(|WebSocket\(|EventSource\(/);
});

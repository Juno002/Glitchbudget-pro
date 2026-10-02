import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function source(path: string) {
  return readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}

test('20.9.7 exposes one semantic feedback system for neutral success warning and error states', () => {
  const alert = source('src/components/ui/alert.tsx');
  const feedback = source('src/components/finance-ui/feedback-message.tsx');
  const index = source('src/components/finance-ui/index.ts');

  for (const variant of ['default:', 'success:', 'warning:', 'destructive:']) {
    assert.match(alert, new RegExp(variant.replace(':', '\\:')));
  }
  for (const tone of ["neutral: 'default'", "success: 'success'", "warning: 'warning'", "error: 'destructive'"]) {
    assert.ok(feedback.includes(tone), tone);
  }
  assert.match(feedback, /role = tone === 'error' \? 'alert' : 'status'/);
  assert.match(feedback, /aria-live=\{tone === 'error' \? 'assertive' : 'polite'\}/);
  assert.match(index, /FeedbackMessage/);
});

test('20.9.7 loading and skeleton states use the shared quiet visual contract', () => {
  const skeleton = source('src/components/ui/skeleton.tsx');
  const accounts = source('src/components/dashboard/accounts-overview.tsx');
  const plan = source('src/components/dashboard/planning-tab.tsx');
  const backups = source('src/components/backup/opfs-backup-dialog.tsx');

  assert.match(skeleton, /aria-hidden="true"/);
  assert.match(skeleton, /data-state="loading"/);
  assert.match(skeleton, /bg-muted\/55/);
  assert.match(skeleton, /motion-safe:animate-pulse/);
  assert.match(skeleton, /motion-reduce:animate-none/);
  assert.match(accounts, /Skeleton className="h-28 w-full rounded-\[var\(--radius-card\)\]"/);
  assert.match(plan, /Skeleton key=\{index\} className="h-36 w-full rounded-\[var\(--radius-card\)\]"/);
  assert.match(backups, /role="status" aria-label="Cargando copias locales"/);
  assert.match(backups, /motion-reduce:animate-none/);
});

test('20.9.7 empty states converge on the reusable EmptyState primitive', () => {
  const debts = source('src/components/dashboard/debts-tab.tsx');
  const movements = source('src/components/dashboard/MovementsView.tsx');
  const goals = source('src/components/dashboard/goals-manager.tsx');
  const subscriptions = source('src/components/dashboard/subscriptions-manager.tsx');
  const backups = source('src/components/backup/opfs-backup-dialog.tsx');

  assert.match(debts, /<EmptyState[\s\S]*title="Aún no tienes tarjetas"/);
  assert.match(movements, /<EmptyState description="No hay movimientos registrados que coincidan con estos filtros\."/);
  assert.doesNotMatch(movements, /<EmptyState title="No hay movimientos"/);
  assert.match(goals, /<EmptyState title="Todavía no tienes metas"/);
  assert.match(subscriptions, /<EmptyState[\s\S]*No hay movimientos planificados pendientes/);
  assert.match(backups, /<EmptyState className="min-h-28" title="Sin copias locales"/);
});

test('20.9.7 destructive confirmation uses the shared AlertDialog destructive variant', () => {
  const primitive = source('src/components/ui/alert-dialog.tsx');
  const goals = source('src/components/dashboard/goals-manager.tsx');
  const debts = source('src/components/dashboard/debts-tab.tsx');
  const backups = source('src/components/backup/opfs-backup-dialog.tsx');
  const settings = source('src/components/layout/settings-dialog.tsx');

  assert.match(primitive, /variant\?: ButtonProps\["variant"\]/);
  assert.match(primitive, /variant = "default"/);
  assert.match(primitive, /buttonVariants\(\{ variant \}\)/);

  for (const surface of [goals, debts, backups, settings]) {
    assert.match(surface, /<AlertDialogAction variant="destructive"/);
    assert.doesNotMatch(surface, /AlertDialogAction[^>]*className="bg-destructive text-destructive-foreground"/);
  }
});

test('20.9.7 error and disabled states do not simulate latency or invent another visual language', () => {
  const plan = source('src/components/dashboard/planning-tab.tsx');
  const reportRange = source('src/components/dashboard/report-range-controls.tsx');
  const button = source('src/components/ui/button.tsx');
  const toast = source('src/components/ui/toast.tsx');

  assert.match(plan, /FeedbackMessage tone="error"/);
  assert.match(reportRange, /FeedbackMessage tone="error"/);
  assert.match(button, /disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100/);
  assert.match(plan, /<Button[\s\S]*disabled=\{!selectedCatId \|\| !\(parseFloat\(amount\) > 0\) \|\| saving\}/);
  assert.doesNotMatch(plan, /disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100/);
  assert.match(toast, /success: "success group border-good\/30"/);
  assert.match(toast, /warning: "warning group border-warning\/40"/);
  assert.match(toast, /destructive: "destructive group border-bad\/40"/);
});

test('20.9.7 browser smoke retries only the browser startup boundary before exercising the same E2E gate', () => {
  const e2e = source('scripts/e2e-smoke.mjs');

  assert.match(e2e, /const launchChrome = async \(\) =>/);
  assert.match(e2e, /attempt <= 2/);
  assert.match(e2e, /waitForHttp\(DEBUG_URL \+ '\/json\/version', 30_000\)/);
  assert.match(e2e, /await stop\(chrome\)/);
  assert.match(e2e, /await launchChrome\(\)/);
  assert.match(e2e, /E2E smoke passed:/);
});
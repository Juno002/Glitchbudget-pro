import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('20.9.4 tooltip uses semantic contrast and collision-aware positioning', () => {
  const tooltip = source('src/components/ui/tooltip.tsx');

  assert.match(tooltip, /delayDuration = 250/);
  assert.match(tooltip, /skipDelayDuration = 100/);
  assert.match(tooltip, /sideOffset = 6/);
  assert.match(tooltip, /collisionPadding = 8/);
  assert.match(tooltip, /surface-elevated/);
  assert.match(tooltip, /text-popover-foreground/);
  assert.match(tooltip, /shadow-\[var\(--shadow-popover\)\]/);
  assert.doesNotMatch(tooltip, /bg-white\/95|rgba\(20,20,20,0\.95\)|text-\[rgba\(255,255,255/);
  assert.doesNotMatch(tooltip, /backdrop-blur/);
});

test('20.9.4 popover supports viewport collision handling and explicit touch dismissal', () => {
  const popover = source('src/components/ui/popover.tsx');

  assert.match(popover, /sideOffset = 8/);
  assert.match(popover, /collisionPadding = 12/);
  assert.match(popover, /max-w-\[calc\(100vw-2rem\)\]/);
  assert.match(popover, /showCloseButton/);
  assert.match(popover, /data-popover-close="true"/);
  assert.match(popover, /aria-label=\{closeLabel\}/);
  assert.match(popover, /h-10 w-10/);
  assert.match(popover, /focus-visible:ring-2/);
});

test('20.9.4 dialogs share hierarchy, responsive close behavior and visible focus', () => {
  const dialog = source('src/components/ui/dialog.tsx');
  const alert = source('src/components/ui/alert-dialog.tsx');

  assert.match(dialog, /aria-label="Cerrar diálogo"/);
  assert.match(dialog, /data-dialog-close="true"/);
  assert.match(dialog, /h-10 w-10/);
  assert.match(dialog, /focus-visible:ring-2/);
  assert.match(dialog, /pr-10 text-left/);
  assert.match(dialog, /font-display text-xl font-normal/);

  assert.match(alert, /font-display text-xl font-normal/);
  assert.match(alert, /flex flex-col-reverse gap-2/);
  assert.doesNotMatch(alert, /"mt-2 sm:mt-0"/);
});

test('20.9.4 KPI help is dismissible while financial warnings remain permanently visible', () => {
  const summary = source('src/components/dashboard/summary-tab.tsx');

  assert.match(summary, /aria-label=\{'Qué significa '\+label\}/);
  assert.match(summary, /showCloseButton/);
  assert.match(summary, /data-context-help=\{label\}/);
  assert.match(summary, /Cerrar explicación de '\+label/);
  assert.match(summary, /h-8 w-8/);

  const popoverEnd = summary.indexOf('</PopoverContent>');
  const warningBlock = summary.indexOf('{warning ? (');
  assert.ok(popoverEnd >= 0 && warningBlock > popoverEnd, 'warnings must remain outside contextual popovers');

  assert.match(summary, /warning="No incluye crédito disponible\."/);
  assert.match(summary, /warning="Deuda real registrada\."/);
  assert.match(summary, /warning="No incluye rendimiento proyectado\."/);
});

test('20.9.4 destructive consequences stay in visible AlertDialog descriptions', () => {
  const settings = source('src/components/layout/settings-dialog.tsx');
  const composer = source('src/components/dashboard/TransactionModal.tsx');

  assert.match(settings, /<AlertDialogDescription>Borrar todos los datos eliminará movimientos, planes, cuentas, metas y copias locales del sitio\. Esta acción no se puede deshacer\.<\/AlertDialogDescription>/);
  assert.match(composer, /<AlertDialogDescription>[\s\S]*eliminar/i);
});

test('20.9.4 badge details keep the shared dismissible popover after the 20.9.8 focus fix', () => {
  const achievements = source('src/components/dashboard/achievements-panel.tsx');

  assert.match(achievements, /showCloseButton/);
  assert.match(achievements, /Cerrar detalles de '\+def\.title/);
  assert.match(achievements, /data-achievement-popover=\{def\.id\}/);
  assert.match(achievements, /className="w-56 space-y-1\.5 p-3 pr-12"/);
  assert.match(achievements, /focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2/);
});

test('20.9.4 active sidebar provider does not override the shared tooltip delay', () => {
  const sidebar = source('src/components/ui/sidebar.tsx');
  assert.match(sidebar, /<TooltipProvider>/);
  assert.doesNotMatch(sidebar, /delayDuration=\{0\}/);
});

test('20.9.4 browser smoke covers contextual help in desktop and mobile viewports', () => {
  const e2e = source('scripts/e2e-smoke.mjs');

  assert.match(e2e, /ayuda contextual KPI desktop/);
  assert.match(e2e, /ayuda contextual KPI móvil/);
  assert.match(e2e, /data-context-help="Disponible líquido"/);
  assert.match(e2e, /Cerrar explicación de Disponible líquido/);
});

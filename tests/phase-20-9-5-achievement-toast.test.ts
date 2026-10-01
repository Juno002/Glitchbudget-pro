import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('20.9.5 achievement toast uses the premium elevated surface and hierarchy', () => {
  const toast = source('src/components/dashboard/achievements-panel.tsx');

  assert.match(toast, /data-achievement-toast="true"/);
  assert.match(toast, /data-achievement-toast-surface="true"/);
  assert.match(toast, /surface-elevated/);
  assert.match(toast, /border-\[var\(--border-strong\)\]/);
  assert.match(toast, /shadow-\[var\(--shadow-modal\)\]/);
  assert.match(toast, /rounded-\[var\(--radius-modal\)\]/);
  assert.match(toast, /Logro desbloqueado/);
  assert.match(toast, /font-display text-lg font-normal/);
  assert.match(toast, /\+\{achievement\.xp\} XP/);
  assert.match(toast, /data-achievement-toast-action="dismiss"/);
  assert.match(toast, /data-achievement-toast-close="true"/);
  assert.doesNotMatch(toast, /backdrop-blur-xl/);
  assert.doesNotMatch(toast, /text-white\/75/);
});

test('20.9.5 toast stays navigation-safe through the complete mobile breakpoint range', () => {
  const toast = source('src/components/dashboard/achievements-panel.tsx');

  assert.match(
    toast,
    /bottom-\[calc\(10rem\+env\(safe-area-inset-bottom\)\)\].*md:bottom-6/,
  );
  assert.doesNotMatch(toast, /sm:bottom-6/);
  assert.match(toast, /md:max-h-\[calc\(100dvh-3rem\)\]/);
});

test('20.9.5 preserves sound, confetti and reduced-motion behavior', () => {
  const toast = source('src/components/dashboard/achievements-panel.tsx');
  const confetti = source('src/lib/confetti.ts');

  assert.match(toast, /useReducedMotion/);
  assert.match(toast, /duration: 0/);
  assert.match(toast, /MOTION_SECONDS\.dialog/);
  assert.match(toast, /playAchievementUnlock\(\)/);
  assert.match(toast, /triggerConfetti\(\)/);
  assert.match(toast, /def\.tier === 'gold' \|\| def\.tier === 'diamond'/);

  assert.match(confetti, /prefers-reduced-motion: reduce/);
});

test('20.9.5 keeps both dismissal affordances accessible and touch-sized', () => {
  const toast = source('src/components/dashboard/achievements-panel.tsx');

  assert.match(toast, /aria-label="Cerrar aviso de logro"/);
  assert.match(toast, /h-10 w-10/);
  assert.match(toast, /focus-visible:ring-2/);
  assert.match(toast, />\s*Listo\s*</);
});

test('20.9.5 browser smoke validates real achievement hierarchy and tablet nav separation', () => {
  const e2e = source('scripts/e2e-smoke.mjs');

  assert.match(e2e, /achievement toast/);
  assert.match(e2e, /Primer Ingreso/);
  assert.match(e2e, /\+10 XP/);
  assert.match(e2e, /width: 700/);
  assert.match(e2e, /toastRect\.bottom <= navRect\.top/);
  assert.match(e2e, /achievement toast tablet-safe/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { FINANCIAL_STATUS_LABELS } from '../src/components/finance-ui/status-badge';

test('planned payment status vocabulary is stable and textual', () => {
  assert.equal(FINANCIAL_STATUS_LABELS.pending, 'Pendiente');
  assert.equal(FINANCIAL_STATUS_LABELS.confirmed, 'Confirmado');
  assert.equal(FINANCIAL_STATUS_LABELS.skipped, 'Omitido');
  assert.equal(FINANCIAL_STATUS_LABELS.overdue, 'Vencido');
});

test('structural design tokens are centralized in globals.css', () => {
  const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
  for (const token of [
    '--space-page',
    '--space-section',
    '--space-card',
    '--radius-card',
    '--radius-interactive',
    '--radius-modal',
    '--text-page-title',
    '--text-section-title',
    '--text-metric',
    '--font-money',
    '--border-subtle',
    '--border-strong',
    '--status-success',
    '--status-warning',
    '--status-danger',
    '--status-info',
    '--motion-fast',
    '--motion-standard',
    '--surface-page',
    '--surface-section',
    '--surface-card',
    '--surface-interactive',
    '--surface-modal',
  ]) {
    assert.ok(css.includes(token), `Falta el token ${token}`);
  }
});

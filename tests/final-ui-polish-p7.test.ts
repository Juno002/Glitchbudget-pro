import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const smoke = read('scripts/e2e-smoke.mjs');
const reports = read('src/components/dashboard/reports-tab.tsx');
const home = read('src/components/dashboard/summary-tab.tsx');
const workflow = read('.github/workflows/checks.yml');

test('P7 integration smoke exercises every report range including custom', () => {
  assert.match(smoke, /\['7d','30d','3m','6m','1y'\]/);
  assert.match(smoke, /data-report-preset="\$\{preset\}"/);
  assert.match(smoke, /data-report-preset="custom"/);
  assert.match(smoke, /Final UI Polish P7 rango Custom/);
});

test('P7 integration smoke covers donut legend exact evidence privacy themes mobile and Home return', () => {
  for (const marker of [
    'Reportes lectura progresiva compacta',
    'Reportes análisis detallado completo',
    'Reportes vuelve a lectura compacta',
    'data-category-legend',
    'Ocultar importes',
    'Final UI Polish P7 privacidad de Reportes',
    'theme-dark',
    'Final UI Polish P7 Neón',
    'theme-light',
    'Final UI Polish P7 Prisma',
    'Final UI Polish P7 regreso a Resumen',
    'Tu panorama financiero.',
    'data-home-status-pill',
    'Mostrar importes',
    'Final UI Polish P7 restaurar importes',
  ]) assert.ok(smoke.includes(marker), marker);
});

test('P7 retains exact Reports evidence behind one progressive disclosure', () => {
  const order = [...reports.matchAll(/data-report-section="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(order, [
    'quick-read',
    'spending',
    'spending-breakdown',
    'comparison',
    'analysis-access',
    'comparison-detail',
    'spending-detail',
    'cash-flow',
    'net-worth',
    'detail',
    'budget-followup',
  ]);
  assert.equal([...reports.matchAll(/<Table>/g)].length, 4);
  assert.match(reports, /Ver análisis detallado/);
  assert.match(reports, /Ocultar análisis detallado/);
  assert.match(reports, /aria-expanded=\{showDetailedAnalysis\}/);
  assert.match(reports, /hidden=\{!showDetailedAnalysis\}/);
  assert.match(reports, /projectReportCategoryDistribution/);
});

test('P7 retains the P6 editorial Home contract without duplicate global notices', () => {
  assert.match(home, /Tu panorama financiero/);
  assert.match(home, /data-home-status-pill/);
  assert.match(home, /selectHomeAttentionState/);
  assert.doesNotMatch(home, /elementos requieren atención/);
  assert.doesNotMatch(home, /pagos tienen datos inválidos y no se incluyen en saldos ni reportes/);
});

test('P7 final CI keeps check both benchmarks build and browser E2E mandatory', () => {
  for (const command of [
    'npm run check',
    'npm run benchmark:ledger',
    'npm run benchmark:reports',
    'npm run build',
    'npm run test:e2e',
  ]) assert.ok(workflow.includes(command), command);
});

test('P7 smoke still blocks external network and verifies offline reload', () => {
  assert.match(smoke, /externalRequests/);
  assert.match(smoke, /La app emitió requests externos/);
  assert.match(smoke, /Network\.emulateNetworkConditions/);
  assert.match(smoke, /offline: true/);
  assert.match(smoke, /recarga offline desde service worker/);
});

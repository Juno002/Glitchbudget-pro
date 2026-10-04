import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('20.8.8 keeps the complete Information Design contracts executable', () => {
  const categories = source('tests/phase-20-8-1-information-preflight.test.ts');
  const quickRead = source('tests/phase-20-8-3-quick-read.test.ts');
  const quickReadEngine = source('src/domain/report-insights.ts');
  const kpis = source('tests/phase-20-8-4-summary-kpis.test.ts');
  const reports = source('tests/phase-20-8-6-reports-hierarchy.test.ts');
  const disclosure = source('tests/phase-20-8-7-disclosure.test.ts');

  assert.match(categories, /clean install exposes every default category/);
  assert.match(quickRead, /same canonical snapshot produces exactly the same ranked quick read/);
  assert.doesNotMatch(quickReadEngine, /new Date|Date\.now|Math\.random|crypto\.randomUUID/);
  assert.match(kpis, /canonical comparisons for the four Summary position KPIs/);
  assert.match(kpis, /does not reconstruct KPI comparison math in React/);
  assert.match(reports, /canonical editorial hierarchy/);
  assert.match(reports, /preserves comparison, category, nature, cash-flow and net-worth visuals/);
  assert.match(disclosure, /keeps financial interpretation details accessible without permanent helper rows/);
  assert.match(disclosure, /does not rely on hover-only disclosure/);
});

test('20.8.8 exercises Home and Reports at desktop and mobile widths in browser E2E', () => {
  const e2e = source('scripts/e2e-smoke.mjs');

  assert.match(e2e, /'Home Prisma desktop'/);
  assert.match(e2e, /'Home Prisma móvil'/);
  assert.match(e2e, /'Reportes Prisma y gráficos'/);
  assert.match(e2e, /'Reportes Prisma móvil'/);
  assert.match(e2e, /'Reportes lectura progresiva compacta'/);
  assert.match(e2e, /'Reportes análisis detallado completo'/);
  assert.match(e2e, /report-detailed-analysis/);
  assert.match(e2e, /width:\s*390/);
  assert.match(e2e, /requiredSections = \[/);
  assert.match(e2e, /'quick-read'/);
  assert.match(e2e, /'detail'/);
  assert.match(e2e, /detail\.hidden/);
  assert.match(e2e, /sections\.every\(visibleAndContained\)/);
  assert.match(e2e, /primaryCharts\.every\(visibleAndContained\)/);
  assert.match(e2e, /presetButtons\.every\(usableControl\)/);
  assert.match(e2e, /document\.documentElement\.scrollWidth <= window\.innerWidth \+ 1/);
  assert.match(e2e, /externalRequests\.length/);
  assert.match(e2e, /recarga offline desde service worker/);
});

test('20.8.8 keeps the app local-only with no remote AI SDK or network-capable source path', () => {
  const localOnly = source('scripts/check-local-only.mjs');
  const staticOutput = source('scripts/check-static-output.mjs');
  const pkg = JSON.parse(source('package.json'));

  assert.match(localOnly, /fetch/);
  assert.match(localOnly, /XMLHttpRequest/);
  assert.match(localOnly, /WebSocket/);
  assert.match(localOnly, /firebase\|genkit\|gemini\|openai\|anthropic\|analytics\|posthog\|sentry\|segment\|supabase\|axios/);
  assert.match(staticOutput, /connect-src must be exclusively 'none'/);

  const dependencies = Object.keys(pkg.dependencies || {}).join(' ');
  assert.doesNotMatch(dependencies, /openai|anthropic|gemini|genkit|firebase|analytics|posthog|sentry|segment|supabase|axios/i);
});

test('20.8.8 preserves backup round-trip and migration evidence', () => {
  const baseline = source('tests/roadmap-baseline.test.ts');

  assert.match(baseline, /for \(const version of \[6, 7\]\)/);
  assert.match(baseline, /frozen v4 backup: export, empty test DB, import preserves all tables/);
  assert.match(baseline, /assert\.deepEqual\(again, original\)/);
  assert.match(baseline, /invalid v4 restore leaves every existing table unchanged/);
});

test('20.8.8 keeps the mandatory final gate in Quality checks', () => {
  const workflow = source('.github/workflows/checks.yml');

  assert.match(workflow, /npm run check/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npm run test:e2e/);
});
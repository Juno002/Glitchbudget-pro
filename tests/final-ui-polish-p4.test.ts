import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { projectReportCategoryDistribution } from '../src/lib/report-visualization';

const row = (key: string, value: number) => ({ key, label: key.toUpperCase(), value });

test('P4 returns an empty visual projection for no positive category values', () => {
  assert.deepEqual(projectReportCategoryDistribution([]), { total: 0, segments: [] });
  assert.deepEqual(projectReportCategoryDistribution([row('zero', 0)]), { total: 0, segments: [] });
});

test('P4 keeps one through four positive categories as individual segments', () => {
  const projected = projectReportCategoryDistribution([
    row('a', 400),
    row('b', 300),
    row('c', 200),
    row('zero', 0),
    row('d', 100),
  ]);
  assert.equal(projected.total, 1000);
  assert.deepEqual(projected.segments.map(item => [item.key, item.value, item.isOther]), [
    ['a', 400, false],
    ['b', 300, false],
    ['c', 200, false],
    ['d', 100, false],
  ]);
  assert.equal(projected.segments.reduce((sum, item) => sum + item.percentTenths, 0), 1000);
});

test('P4 groups only categories after the first four into exact Otros', () => {
  const projected = projectReportCategoryDistribution([
    row('a', 500),
    row('b', 400),
    row('c', 300),
    row('d', 200),
    row('e', 100),
    row('f', 50),
  ]);
  assert.equal(projected.total, 1550);
  assert.deepEqual(projected.segments.map(item => [item.key, item.value]), [
    ['a', 500],
    ['b', 400],
    ['c', 300],
    ['d', 200],
    ['__report_other__', 150],
  ]);
  assert.deepEqual(projected.segments.at(-1)?.sourceKeys, ['e', 'f']);
  assert.equal(projected.segments.reduce((sum, item) => sum + item.value, 0), projected.total);
});

test('P4 preserves canonical input order for equal values and equal remainders', () => {
  const projected = projectReportCategoryDistribution([
    row('first', 1),
    row('second', 1),
    row('third', 1),
  ]);
  assert.deepEqual(projected.segments.map(item => item.key), ['first', 'second', 'third']);
  assert.deepEqual(projected.segments.map(item => item.percentTenths), [334, 333, 333]);
  assert.equal(projected.segments.reduce((sum, item) => sum + item.percentTenths, 0), 1000);
});

test('P4 sorts by value while using canonical order only as the tie breaker', () => {
  const projected = projectReportCategoryDistribution([
    row('small', 10),
    row('tie-first', 30),
    row('large', 40),
    row('tie-second', 30),
  ]);
  assert.deepEqual(projected.segments.map(item => item.key), ['large', 'tie-first', 'tie-second', 'small']);
});

test('P4 handles an extreme dominant category without losing the minority share', () => {
  const projected = projectReportCategoryDistribution([row('dominant', 999), row('minority', 1)]);
  assert.deepEqual(projected.segments.map(item => item.percentTenths), [999, 1]);
  assert.equal(projected.segments.reduce((sum, item) => sum + item.percentTenths, 0), 1000);
});

test('P4 rejects an invalid visual segment limit', () => {
  assert.throws(() => projectReportCategoryDistribution([row('a', 1)], 0), /entero positivo/);
});

test('P4 keeps aggregation outside React and preserves exact category detail', () => {
  const visualization = readFileSync(new URL('../src/lib/report-visualization.ts', import.meta.url), 'utf8');
  const charts = readFileSync(new URL('../src/components/dashboard/charts/report-charts.tsx', import.meta.url), 'utf8');
  const reports = readFileSync(new URL('../src/components/dashboard/reports-tab.tsx', import.meta.url), 'utf8');
  const donutStart = charts.indexOf('export function ReportCategoryDonut');
  const donutEnd = charts.indexOf('export function ReportValueBars', donutStart);
  const donut = charts.slice(donutStart, donutEnd);

  assert.doesNotMatch(visualization, /react|recharts|usePrivateCurrency|useFinances/i);
  assert.match(reports, /projectReportCategoryDistribution\(/);
  assert.match(reports, /report\.spending\.categories\.map\(row=>\(/);
  assert.match(reports, /<ReportCategoryDonut data=\{categoryDistribution\.segments\} total=\{categoryDistribution\.total\} \/>/);
  assert.doesNotMatch(donut, /<Legend/);
  assert.match(donut, /data-category-legend/);
  assert.match(donut, /percentTenths/);
  assert.match(donut, /usePrivateCurrency\(\)/);
  assert.match(donut, /balancesHidden/);
  assert.match(donut, /!balancesHidden/);
  assert.match(reports, /<TableHead>Categoría<\/TableHead>/);
  assert.match(reports, /<TableCell className="text-right font-mono">\{money\(row\.value\)\}<\/TableCell>/);
});

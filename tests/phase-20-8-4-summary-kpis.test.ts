import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { selectHomeReadModel } from '../src/domain/home';
import { selectReportsSnapshot, type ReportsSnapshotInput } from '../src/domain/reports';

const input: ReportsSnapshotInput = {
  accounts: [
    { id: 'cash', name: 'Cash', type: 'cash', currency: 'DOP', openingBalance: 100_000, startDate: '2026-01-01' },
    { id: 'inv', name: 'Investment', type: 'investment', currency: 'DOP', openingBalance: 50_000, startDate: '2026-01-01' },
  ],
  debts: [
    { id: 'card', name: 'Card', type: 'credit_card', principal: 100_000, apr: 0, minPayment: 0, createdAt: '2026-01-01', status: 'active', openingAdjustment: 20_000 },
  ],
  incomes: [
    { id: 'aug-income', type: 'extra', description: 'August', amount: 20_000, date: '2026-08-15', month: '2026-08', categoryId: 'salary', accountId: 'cash' },
    { id: 'sep-income', type: 'extra', description: 'September', amount: 30_000, date: '2026-09-10', month: '2026-09', categoryId: 'salary', accountId: 'cash' },
    { id: 'future-income', type: 'extra', description: 'Later in period', amount: 40_000, date: '2026-09-25', month: '2026-09', categoryId: 'salary', accountId: 'cash' },
  ],
  expenses: [],
  debtPayments: [],
  transfers: [],
};

test('20.8.4 Reports exposes canonical comparisons for the four Summary position KPIs', () => {
  const report = selectReportsSnapshot(input, { start: '2026-09-01', end: '2026-09-30' }, '2026-09-20');

  assert.equal(report.netWorth.liquidAssets, 150_000);
  assert.equal(report.positionComparisons.liquidAvailable.current, 150_000);
  assert.equal(report.positionComparisons.liquidAvailable.previous, 120_000);
  assert.equal(report.positionComparisons.liquidAvailable.absoluteDelta, 30_000);
  assert.equal(report.positionComparisons.liquidAvailable.percentageDelta, 25);

  assert.equal(report.positionComparisons.netWorth.current, 180_000);
  assert.equal(report.positionComparisons.netWorth.previous, 150_000);
  assert.equal(report.positionComparisons.totalDebt.current, 20_000);
  assert.equal(report.positionComparisons.totalDebt.previous, 20_000);
  assert.equal(report.positionComparisons.investments.current, 50_000);
  assert.equal(report.positionComparisons.investments.previous, 50_000);

  // The 25 Sep income must not leak into Home when the visible position is through 20 Sep.
  assert.equal(report.positionComparisons.liquidAvailable.current, report.netWorth.liquidAssets);
});

test('20.8.4 Home read model passes canonical position comparisons through without rebuilding them', () => {
  const report = selectReportsSnapshot(input, { start: '2026-09-01', end: '2026-09-30' }, '2026-09-20');
  const home = selectHomeReadModel({
    report,
    budgetDetails: [],
    plannedOccurrences: [],
    recurringRules: [],
    goals: [],
    investments: [],
    today: '2026-09-20',
    periodStartDay: 1,
  });

  assert.deepEqual(home.position, {
    liquidAssets: 150_000,
    investments: 50_000,
    liabilities: 20_000,
    netWorth: 180_000,
  });
  assert.equal(home.positionComparisons, report.positionComparisons);
  assert.equal(home.positionComparisons.liquidAvailable.absoluteDelta, 30_000);
  assert.equal(home.positionComparisons.netWorth.absoluteDelta, 30_000);
  assert.equal(home.positionComparisons.totalDebt.absoluteDelta, 0);
  assert.equal(home.positionComparisons.investments.absoluteDelta, 0);
});

test('20.8.4 Summary keeps canonical comparisons and contextual KPI help', () => {
  const source = readFileSync(new URL('../src/components/dashboard/summary-tab.tsx', import.meta.url), 'utf8');

  assert.match(source, /data-position-comparison=/);
  assert.match(source, /comparison=\{home\.positionComparisons\.liquidAvailable\}/);
  assert.match(source, /comparison=\{home\.positionComparisons\.netWorth\}/);
  assert.match(source, /comparison=\{home\.positionComparisons\.totalDebt\}/);
  assert.match(source, /comparison=\{home\.positionComparisons\.investments\}/);

  const cardStart = source.indexOf('function PositionCard');
  const cardEnd = source.indexOf('function PanelHeading');
  const card = source.slice(cardStart, cardEnd);
  assert.ok(card.indexOf('<MoneyValue') < card.indexOf('data-position-comparison='));
  assert.match(card, /<ContextHelp label=\{'Qué significa '\+label\}>/);
});

test('20.8.4 keeps interpretation details available on demand instead of permanent warning rows', () => {
  const source = readFileSync(new URL('../src/components/dashboard/summary-tab.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /warning\?:string|\{warning \? \(/);
  assert.match(source, /help="Efectivo \+ bancos registrados en el ledger\. No incluye crédito disponible\."/);
  assert.match(source, /help="Activos reales registrados menos pasivos registrados\."/);
  assert.match(source, /help="Pasivos registrados, incluidas tarjetas y préstamos históricos compatibles\."/);
  assert.match(source, /help="Valor registrado de los activos de inversión\. No incluye rendimiento proyectado\."/);
});

test('20.8.4 Summary does not reconstruct KPI comparison math in React', () => {
  const source = readFileSync(new URL('../src/components/dashboard/summary-tab.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /selectPositionKpiComparisons|compareKpi|selectPosition|selectNetWorthReport/);
  assert.doesNotMatch(source, /percentageDelta\s*[+\-*/]|absoluteDelta\s*[+\-*/]/);
  assert.doesNotMatch(source, /\.reduce\(/);
});
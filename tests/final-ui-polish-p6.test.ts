import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { selectHomeAttentionState, selectHomeReadModel, type HomeAttentionStateInput } from '../src/domain/home';
import { selectReportsSnapshot } from '../src/domain/reports';

const none: HomeAttentionStateInput = {
  quarantinedCount: 0,
  overduePlannedCount: 0,
  overBudgetCount: 0,
  overdueGoalCount: 0,
  maturedInvestmentCount: 0,
  alertBudgetCount: 0,
};

test('P6 resolves every authorized attention state with exact copy', () => {
  const cases: Array<[Partial<HomeAttentionStateInput>, string, string]> = [
    [{ quarantinedCount: 1 }, 'integrity', 'Revisa datos preservados'],
    [{ overduePlannedCount: 1 }, 'planned_overdue', 'Hay movimientos planificados vencidos'],
    [{ overBudgetCount: 1 }, 'budget_over', 'Presupuesto excedido'],
    [{ overdueGoalCount: 1 }, 'goals_overdue', 'Hay metas con fecha límite vencida'],
    [{ maturedInvestmentCount: 1 }, 'investments_matured', 'Hay inversiones que requieren revisión'],
    [{ alertBudgetCount: 1 }, 'budget_alert', 'Presupuesto cerca del límite'],
    [{}, 'neutral', 'Sin alertas destacadas'],
  ];
  for (const [patch, kind, label] of cases) {
    const state = selectHomeAttentionState({ ...none, ...patch });
    assert.equal(state.kind, kind);
    assert.equal(state.label, label);
  }
});

test('P6 enforces the exact attention priority order', () => {
  const cases: Array<[Partial<HomeAttentionStateInput>, string]> = [
    [{ quarantinedCount: 1, overduePlannedCount: 1, overBudgetCount: 1 }, 'integrity'],
    [{ overduePlannedCount: 1, overBudgetCount: 1 }, 'planned_overdue'],
    [{ overBudgetCount: 1, overdueGoalCount: 1 }, 'budget_over'],
    [{ overdueGoalCount: 1, maturedInvestmentCount: 1 }, 'goals_overdue'],
    [{ maturedInvestmentCount: 1, alertBudgetCount: 1 }, 'investments_matured'],
    [{ alertBudgetCount: 1 }, 'budget_alert'],
  ];
  for (const [patch, expected] of cases) {
    assert.equal(selectHomeAttentionState({ ...none, ...patch }).kind, expected);
  }
});

test('P6 derives global attention from complete read-model counts, not only visible goal rows', () => {
  const report = selectReportsSnapshot({
    accounts: [],
    debts: [],
    incomes: [],
    expenses: [],
    debtPayments: [],
    transfers: [],
  }, { start: '2026-09-01', end: '2026-09-30' });

  const home = selectHomeReadModel({
    report,
    budgetDetails: [],
    plannedOccurrences: [],
    recurringRules: [],
    goals: [
      { id:'g1', name:'A', target:100, quota:0, startDate:'2026-01-01', date:'2026-09-01', saved:0, status:'active' },
      { id:'g2', name:'B', target:100, quota:0, startDate:'2026-01-01', date:'2026-09-02', saved:0, status:'active' },
      { id:'g3', name:'C', target:100, quota:0, startDate:'2026-01-01', date:'2026-09-03', saved:0, status:'active' },
    ],
    investments: [],
    today: '2026-10-04',
    periodStartDay: 1,
  });

  assert.equal(home.goals.length, 2);
  assert.equal(home.attentionSources.overdueGoalCount, 3);
  assert.equal(home.attentionCount, 3);
  const state = selectHomeAttentionState({ quarantinedCount: 0, ...home.attentionSources });
  assert.equal(state.kind, 'goals_overdue');
  assert.notEqual(state.kind, 'neutral');
});

test('P6 never returns neutral when quarantined data exists', () => {
  const state = selectHomeAttentionState({ ...none, quarantinedCount: 1 });
  assert.notEqual(state.kind, 'neutral');
});

test('P6 replaces duplicate global badges with one editorial header status while preserving module evidence', () => {
  const source = readFileSync(new URL('../src/components/dashboard/summary-tab.tsx', import.meta.url), 'utf8');
  assert.match(source, /Tu panorama financiero/);
  assert.match(source, /financialDateLabel\(today,locale\)/);
  assert.match(source, /período \{formatPeriodRange\(currentPeriod\)\}/);
  assert.match(source, /data-home-status-loading/);
  assert.match(source, /loading \? \(/);
  assert.match(source, /data-home-status-pill=\{attentionState\.kind\}/);
  assert.match(source, /status=\{attentionState\.status\}/);
  assert.match(source, /label=\{attentionState\.label\}/);
  assert.doesNotMatch(source, /elementos requieren atención/);
  assert.doesNotMatch(source, /pago tiene datos inválidos y no se incluye en saldos ni reportes/);
  assert.doesNotMatch(source, /pagos tienen datos inválidos y no se incluyen en saldos ni reportes/);
  assert.doesNotMatch(source, /Alex Rivera|Todo está en orden/);
  assert.match(source, /home\.budget\.overCount>0 \|\| home\.budget\.alertCount>0/);
  assert.match(source, /home\.upcoming\.overdueCount>0 \|\| home\.upcoming\.todayCount>0/);
  assert.match(source, /home\.investments\.maturedCount>0/);
  assert.doesNotMatch(source, /\.reduce\(/);
});

test('P6 browser gate explicitly checks the editorial header, status pill and 320px Home', () => {
  const smoke = readFileSync(new URL('../scripts/e2e-smoke.mjs', import.meta.url), 'utf8');
  assert.match(smoke, /Final UI Polish P6/);
  assert.match(smoke, /data-home-status-pill/);
  assert.match(smoke, /Tu panorama financiero\./);
  assert.match(smoke, /width: 320/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  QUICK_READ_THRESHOLDS,
  selectReportQuickRead,
  type QuickReadDirection,
  type QuickReadInsight,
  type QuickReadInsightKind,
  type ReportQuickReadInput,
} from '../src/domain/report-insights';
import { presentReportInsight } from '../src/lib/report-editorial';

function insight(kind: QuickReadInsightKind, direction: QuickReadDirection = 'increase'): QuickReadInsight {
  return {
    kind,
    focus: kind === 'leading_category' ? 'categories' : kind === 'no_material_change' ? 'overview' : 'spending',
    priority: 90,
    direction,
    copy: {
      key: kind,
      params: { current: 12_345, previous: 10_000, percentageDelta: 23.45, categoryId: 'food', value: 4_321, sharePercent: 35 },
    },
  };
}

test('P1 presents all seven canonical kinds with their exact editorial copy and structured bodies', () => {
  const cases: Array<[QuickReadInsightKind, string, string]> = [
    ['spending_above_previous', 'Gastaste más que en el rango anterior', 'comparison'],
    ['spending_below_previous', 'Gastaste menos que en el rango anterior', 'comparison'],
    ['spending_near_previous', 'El gasto se mantuvo estable', 'comparison'],
    ['cash_flow_change', 'El flujo neto aumentó', 'comparison'],
    ['net_worth_change', 'El patrimonio registrado aumentó', 'comparison'],
    ['leading_category', 'Una categoría concentró buena parte del gasto', 'category'],
    ['no_material_change', 'No hay cambios destacados en este rango', 'no_material_change'],
  ];

  for (const [kind, title, bodyKey] of cases) {
    const input = insight(kind);
    const result = presentReportInsight(input);
    assert.equal(result.kind, kind);
    assert.equal(result.focus, input.focus);
    assert.equal(result.title, title);
    assert.equal(result.body.key, bodyKey);
    assert.doesNotMatch(result.title, /\d|RD\$|\$|€|£/);

    if (result.body.key === 'comparison') {
      assert.deepEqual(result.body.params, { current: 12_345, previous: 10_000, percentageDelta: 23.45 });
      assert.ok(Object.values(result.body.params).every(value => typeof value === 'number' || value === null));
    } else if (result.body.key === 'category') {
      assert.deepEqual(result.body.params, { categoryId: 'food', value: 4_321, sharePercent: 35 });
    } else {
      assert.deepEqual(result.body.params, {});
    }
  }
});

test('P1 derives cash-flow and net-worth headlines from each comparable direction without value judgments', () => {
  const cases: Array<[QuickReadInsightKind, QuickReadDirection, string]> = [
    ['cash_flow_change', 'increase', 'El flujo neto aumentó'],
    ['cash_flow_change', 'decrease', 'El flujo neto disminuyó'],
    ['cash_flow_change', 'stable', 'El flujo neto se mantuvo estable'],
    ['cash_flow_change', 'new', 'Hay un nuevo flujo neto comparable'],
    ['net_worth_change', 'increase', 'El patrimonio registrado aumentó'],
    ['net_worth_change', 'decrease', 'El patrimonio registrado disminuyó'],
    ['net_worth_change', 'stable', 'El patrimonio registrado se mantuvo estable'],
    ['net_worth_change', 'new', 'Hay una nueva base de patrimonio registrada'],
  ];
  for (const [kind, direction, title] of cases) {
    assert.equal(presentReportInsight(insight(kind, direction)).title, title);
  }
  for (const kind of ['cash_flow_change', 'net_worth_change'] as const) {
    assert.throws(() => presentReportInsight(insight(kind, 'none')), /dirección comparable/);
  }
});

test('P1 presents a real zero spending base as new spending without manufacturing a percentage', () => {
  const input = insight('spending_above_previous', 'new');
  input.copy.params = { current: 123_456, previous: 0, percentageDelta: null, absoluteDelta: 123_456 };
  const result = presentReportInsight(input);
  assert.equal(result.title, 'Hay gasto nuevo en este rango');
  assert.deepEqual(result.body, { key: 'comparison', params: { current: 123_456, previous: 0, percentageDelta: null } });
  assert.doesNotMatch(JSON.stringify(result), /Infinity|∞/);
});

test('P1 preserves canonical negative, zero and null parameters instead of recalculating or formatting money', () => {
  const input = insight('cash_flow_change', 'new');
  input.copy.params = { current: -25_000, previous: 0, percentageDelta: null, absoluteDelta: -25_000 };
  assert.deepEqual(presentReportInsight(input).body, {
    key: 'comparison', params: { current: -25_000, previous: 0, percentageDelta: null },
  });
  input.copy.params = { current: 0, previous: -25_000, percentageDelta: -100 };
  assert.deepEqual(presentReportInsight(input).body, {
    key: 'comparison', params: { current: 0, previous: -25_000, percentageDelta: -100 },
  });
  input.copy.params = {};
  assert.deepEqual(presentReportInsight(input).body, {
    key: 'comparison', params: { current: null, previous: null, percentageDelta: null },
  });
});

test('P1 is deterministic and does not mutate even frozen canonical input', () => {
  const input = insight('leading_category', 'none');
  const before = structuredClone(input);
  Object.freeze(input.copy.params);
  Object.freeze(input.copy);
  Object.freeze(input);

  const first = presentReportInsight(input);
  assert.deepEqual(first, presentReportInsight(structuredClone(input)));
  assert.deepEqual(input, before);
  assert.notEqual(first.body.params, input.copy.params);
});

function canonicalInput(): ReportQuickReadInput {
  return {
    spending: { total: 105_000, categories: [{ categoryId: 'food', value: 36_750 }] },
    comparison: {
      spending: { current: 105_000, previous: 100_000, difference: 5_000, percentChange: 5 },
      netCashFlow: { current: 115_000, previous: 100_000, difference: 15_000, percentChange: 15 },
      netWorth: { current: 1_050_000, previous: 1_000_000, difference: 50_000, percentChange: 5 },
    },
  };
}

test('P1 presentation preserves the canonical ranking and exact threshold boundaries', () => {
  assert.deepEqual(QUICK_READ_THRESHOLDS, {
    spendingNearPercent: 5, cashFlowSignificantPercent: 15, netWorthSignificantPercent: 5,
    leadingCategorySharePercent: 35, maxInsights: 3,
  });
  const input = canonicalInput();
  const ranked = selectReportQuickRead(input);
  const before = structuredClone(ranked);
  assert.deepEqual(ranked.map(row => row.kind), ['cash_flow_change', 'net_worth_change', 'leading_category']);
  assert.deepEqual(ranked.map(presentReportInsight).map(row => row.kind), ranked.map(row => row.kind));
  assert.deepEqual(ranked, before);

  const below = canonicalInput();
  below.comparison.netCashFlow = { current: 114_999, previous: 100_000, difference: 14_999, percentChange: 14.999 };
  below.comparison.netWorth = { current: 1_049_999, previous: 1_000_000, difference: 49_999, percentChange: 4.9999 };
  below.spending.categories = [{ categoryId: 'food', value: 36_749 }];
  assert.deepEqual(selectReportQuickRead(below).map(presentReportInsight).map(row => row.kind), ['spending_near_previous']);

  below.comparison.spending = { current: 105_001, previous: 100_000, difference: 5_001, percentChange: 5.001 };
  assert.deepEqual(selectReportQuickRead(below).map(presentReportInsight).map(row => row.kind), ['spending_above_previous']);
});

test('P1 presentation has no formatting, financial reconstruction, persistence, React, clock or network dependency', () => {
  const source = readFileSync(new URL('../src/lib/report-editorial.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"][^'"]*(?:react|dexie|\/db)['"]/i);
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|WebSocket|EventSource|navigator\./);
  assert.doesNotMatch(source, /new Date|Date\.now|Math\.random|crypto\.randomUUID/);
  assert.doesNotMatch(source, /Intl\.|toLocaleString|toFixed|formatCurrency|RD\$|\.reduce\s*\(/);
});

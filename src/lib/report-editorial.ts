import type { QuickReadFocus, QuickReadInsight, QuickReadInsightKind } from '../domain/report-insights';

export type ReportEditorialBody =
  | {
    key: 'comparison';
    params: { current: number | null; previous: number | null; percentageDelta: number | null };
  }
  | {
    key: 'cash_flow_sign_change';
    params: { current: number | null; previous: number | null; percentageDelta: number | null };
  }
  | {
    key: 'category';
    params: { categoryId: string; value: number | null; sharePercent: number | null };
  }
  | {
    key: 'no_material_change';
    params: Record<string, never>;
  };

export type ReportEditorialInsight = {
  kind: QuickReadInsightKind;
  focus: QuickReadFocus;
  title: string;
  body: ReportEditorialBody;
};

function cashFlowSignChangeTitle(insight: QuickReadInsight): string | null {
  if (insight.kind !== 'cash_flow_change') return null;
  const { current, previous } = insight.copy.params;
  if (typeof current !== 'number' || typeof previous !== 'number') return null;
  if (previous > 0 && current < 0) return 'El flujo neto pasó de positivo a negativo';
  if (previous < 0 && current > 0) return 'El flujo neto pasó de negativo a positivo';
  return null;
}

function titleForInsight(insight: QuickReadInsight, signChangeTitle: string | null): string {
  switch (insight.kind) {
    case 'spending_above_previous':
      return insight.copy.params.previous === 0 && typeof insight.copy.params.current === 'number' && insight.copy.params.current > 0
        ? 'Hay gasto nuevo en este rango'
        : 'Gastaste más que en el rango anterior';
    case 'spending_below_previous': return 'Gastaste menos que en el rango anterior';
    case 'spending_near_previous': return 'El gasto se mantuvo estable';
    case 'cash_flow_change':
      if (signChangeTitle !== null) return signChangeTitle;
      switch (insight.direction) {
        case 'increase': return 'El flujo neto aumentó';
        case 'decrease': return 'El flujo neto disminuyó';
        case 'stable': return 'El flujo neto se mantuvo estable';
        case 'new': return 'Hay un nuevo flujo neto comparable';
        case 'none': throw new Error('La lectura de flujo neto requiere una dirección comparable.');
      }
    case 'net_worth_change':
      switch (insight.direction) {
        case 'increase': return 'El patrimonio registrado aumentó';
        case 'decrease': return 'El patrimonio registrado disminuyó';
        case 'stable': return 'El patrimonio registrado se mantuvo estable';
        case 'new': return 'Hay una nueva base de patrimonio registrada';
        case 'none': throw new Error('La lectura de patrimonio requiere una dirección comparable.');
      }
    case 'leading_category': return 'La categoría con mayor participación en el gasto';
    case 'no_material_change': return 'No hay cambios destacados en este rango';
  }
}

/** Presentation only: preserve canonical numbers and leave all money formatting to React. */
export function presentReportInsight(insight: QuickReadInsight): ReportEditorialInsight {
  const params = insight.copy.params;
  const number = (key: string): number | null => typeof params[key] === 'number' ? params[key] as number : null;
  const signChangeTitle = cashFlowSignChangeTitle(insight);
  let body: ReportEditorialBody;

  if (insight.kind === 'leading_category') {
    body = {
      key: 'category',
      params: {
        categoryId: typeof params.categoryId === 'string' ? params.categoryId : '',
        value: number('value'),
        sharePercent: number('sharePercent'),
      },
    };
  } else if (insight.kind === 'no_material_change') {
    body = { key: 'no_material_change', params: {} };
  } else {
    body = {
      key: signChangeTitle === null ? 'comparison' : 'cash_flow_sign_change',
      params: {
        current: number('current'),
        previous: number('previous'),
        percentageDelta: number('percentageDelta'),
      },
    };
  }

  return { kind: insight.kind, focus: insight.focus, title: titleForInsight(insight, signChangeTitle), body };
}

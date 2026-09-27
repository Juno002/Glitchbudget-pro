export const PLAN_SECTIONS = [
  { value: 'budgets', label: 'Presupuestos' },
  { value: 'goals', label: 'Metas' },
  { value: 'subscriptions', label: 'Planificados' },
] as const;

export type PlanSection = typeof PLAN_SECTIONS[number]['value'];

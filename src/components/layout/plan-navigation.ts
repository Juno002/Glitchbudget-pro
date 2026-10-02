import type { PlanningArea } from '@/domain/navigation';

export const PLAN_SECTIONS = [
  { value: 'budgets', label: 'Presupuestos' },
  { value: 'goals', label: 'Metas' },
  { value: 'subscriptions', label: 'Planificados' },
] as const satisfies ReadonlyArray<{ value: PlanningArea; label: string }>;

export type PlanSection = PlanningArea;

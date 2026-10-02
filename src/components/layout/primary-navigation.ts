import type { PrimaryArea } from '@/domain/navigation';

export const PRIMARY_NAV_ITEMS = [
  { value: 'summary', label: 'Resumen', href: '/' },
  { value: 'movements', label: 'Movimientos', href: '/?tab=movements' },
  { value: 'planning', label: 'Plan', href: '/?tab=planning&plan=budgets' },
  { value: 'reports', label: 'Reportes', href: '/?tab=reports' },
] as const satisfies ReadonlyArray<{ value: PrimaryArea; label: string; href: string }>;

export type { PrimaryArea } from '@/domain/navigation';

export const PRIMARY_NAV_ITEMS = [
  { value: 'summary', label: 'Resumen', href: '/' },
  { value: 'movements', label: 'Movimientos', href: '/' },
  { value: 'planning', label: 'Plan', href: '/' },
  { value: 'reports', label: 'Reportes', href: '/' },
] as const;

export type PrimaryArea = typeof PRIMARY_NAV_ITEMS[number]['value'];

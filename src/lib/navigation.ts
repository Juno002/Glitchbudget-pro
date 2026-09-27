import { BarChart2, ArrowLeftRight, NotebookPen, FileText } from 'lucide-react';
/** Shared labels and order for desktop tabs and the mobile bottom navigation. */
export const PRIMARY_AREAS = [
 { value: 'summary', label: 'Resumen', icon: BarChart2, href: '/' },
 { value: 'movements', label: 'Movimientos', icon: ArrowLeftRight, href: '/' },
 { value: 'planning', label: 'Plan', icon: NotebookPen, href: '/' },
 { value: 'reports', label: 'Reportes', icon: FileText, href: '/' },
] as const;

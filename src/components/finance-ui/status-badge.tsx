import { cn } from '@/lib/utils';

export type FinancialStatus =
  | 'pending'
  | 'confirmed'
  | 'skipped'
  | 'overdue'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export const FINANCIAL_STATUS_LABELS: Record<FinancialStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  skipped: 'Omitido',
  overdue: 'Vencido',
  success: 'Correcto',
  warning: 'Atención',
  danger: 'Requiere atención',
  neutral: 'Sin cambios',
};

const statusClasses: Record<FinancialStatus, string> = {
  pending: 'border-primary/30 bg-primary/10 text-primary',
  confirmed: 'border-good/30 bg-good/10 text-good',
  skipped: 'border-border bg-muted/10 text-muted-foreground',
  overdue: 'border-warning/40 bg-warning/10 text-warning',
  success: 'border-good/30 bg-good/10 text-good',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  danger: 'border-bad/40 bg-bad/10 text-bad',
  neutral: 'border-border bg-muted/10 text-muted-foreground',
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: FinancialStatus;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        statusClasses[status],
        className,
      )}
    >
      {label ?? FINANCIAL_STATUS_LABELS[status]}
    </span>
  );
}

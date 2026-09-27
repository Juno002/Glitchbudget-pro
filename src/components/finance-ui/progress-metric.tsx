import type { ReactNode } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { MoneyValue } from './money-value';
import { StatusBadge, type FinancialStatus } from './status-badge';

export function ProgressMetric({
  label,
  current,
  total,
  remaining,
  status = 'neutral',
  supporting,
  className,
}: {
  label: ReactNode;
  current: number;
  total: number;
  remaining?: number;
  status?: FinancialStatus;
  supporting?: ReactNode;
  className?: string;
}) {
  const percent = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{label}</div>
          {supporting ? <div className="text-xs text-muted-foreground">{supporting}</div> : null}
        </div>
        <StatusBadge status={status} />
      </div>
      <Progress value={percent} className={cn(
        'h-2',
        (status === 'danger' || status === 'overdue') && '[&>div]:bg-bad',
        status === 'warning' && '[&>div]:bg-warning',
        (status === 'success' || status === 'confirmed') && '[&>div]:bg-good',
      )} />
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span><MoneyValue amount={current} className="text-xs" /> de <MoneyValue amount={total} className="text-xs" /></span>
        {remaining !== undefined ? <span>Restante: <MoneyValue amount={remaining} className="text-xs font-semibold" /></span> : null}
      </div>
    </div>
  );
}

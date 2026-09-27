import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MoneyValue } from './money-value';

export function DetailHeader({
  title,
  subtitle,
  amount,
  supporting,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  amount?: number;
  supporting?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        <div className="text-sm text-muted-foreground">{subtitle}</div>
        <h3 className="truncate text-lg font-semibold">{title}</h3>
        {amount !== undefined ? <MoneyValue amount={amount} className="mt-1 inline-block text-xl font-semibold" /> : null}
        {supporting ? <div className="mt-1 text-xs text-muted-foreground">{supporting}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MoneyValue, type MoneyTone } from './money-value';

export function MetricCard({
  label,
  amount,
  value,
  supporting,
  tone = 'neutral',
  concealed = false,
  className,
}: {
  label: ReactNode;
  amount?: number;
  value?: ReactNode;
  supporting?: ReactNode;
  tone?: MoneyTone;
  concealed?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn('min-w-0', className)}>
      <CardContent className="p-[var(--space-card)]">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 min-w-0 text-[length:var(--text-metric)] font-semibold leading-tight">
          {amount !== undefined ? (
            <MoneyValue amount={amount} tone={tone} concealed={concealed} className="font-semibold" />
          ) : value}
        </div>
        {supporting ? <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{supporting}</div> : null}
      </CardContent>
    </Card>
  );
}

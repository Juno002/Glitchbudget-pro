import { cn } from '@/lib/utils';
import { MoneyValue, type MoneyTone } from './money-value';

export function DeltaValue({
  amount,
  label,
  tone = 'neutral',
  className,
}: {
  amount: number;
  label?: string;
  tone?: MoneyTone;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-1.5 text-sm', className)}>
      <MoneyValue amount={amount} tone={tone} showSign className="font-semibold" />
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
    </span>
  );
}

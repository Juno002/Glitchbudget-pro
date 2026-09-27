'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MoneyValue, type MoneyTone } from './money-value';

export function TransactionRow({
  icon,
  title,
  meta,
  amount,
  tone = 'neutral',
  dateLabel,
  badge,
  onClick,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  amount: number;
  tone?: MoneyTone;
  dateLabel?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const signedAmount = tone === 'negative' ? -Math.abs(amount) : tone === 'positive' ? Math.abs(amount) : amount;

  const body = (
    <>
      {icon ? <div className="shrink-0">{icon}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {meta}
          {badge}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <MoneyValue amount={signedAmount} tone={tone} showSign={tone === 'positive' || tone === 'negative'} className="text-sm font-semibold" />
        {dateLabel ? <div className="text-[10px] text-muted-foreground">{dateLabel}</div> : null}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex min-h-14 w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          className,
        )}
      >
        {body}
      </button>
    );
  }

  return <div className={cn('flex min-h-14 items-center gap-3 rounded-xl border p-3', className)}>{body}</div>;
}

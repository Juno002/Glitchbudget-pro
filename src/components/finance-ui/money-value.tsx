'use client';

import { cn, formatCurrency } from '@/lib/utils';
import { useBalanceVisibility } from '@/contexts/balance-visibility-context';

export type MoneyTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'muted';

const toneClass: Record<MoneyTone, string> = {
  neutral: 'text-foreground',
  positive: 'text-good',
  negative: 'text-bad',
  warning: 'text-warning',
  muted: 'text-muted-foreground',
};

export function MoneyValue({
  amount,
  tone = 'neutral',
  showSign = false,
  concealed = false,
  className,
}: {
  amount: number;
  tone?: MoneyTone;
  showSign?: boolean;
  concealed?: boolean;
  className?: string;
}) {
  const { balancesHidden } = useBalanceVisibility();
  const hidden = concealed || balancesHidden;
  const sign = showSign && amount !== 0 ? (amount > 0 ? '+' : '−') : '';
  const absolute = showSign ? Math.abs(amount) : amount;

  return (
    <span
      className={cn(
        'tabular-nums tracking-tight [font-family:var(--font-money)]',
        toneClass[tone],
        className,
      )}
      data-money-value="true"
      aria-label={hidden ? 'Importe oculto' : undefined}
    >
      {hidden ? '••••••' : `${sign}${formatCurrency(absolute)}`}
    </span>
  );
}

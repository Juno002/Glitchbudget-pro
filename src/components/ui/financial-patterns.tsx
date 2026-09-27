'use client';

import React, { type ReactNode } from 'react';
import { Clock3, CheckCircle2, SkipForward, AlertCircle } from 'lucide-react';
import { useMoneyFormatter } from '@/hooks/use-money-visibility';
import { cn } from '@/lib/utils';

export function PageHeader({ title, context, action }: { title: string; context?: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">{title}</h2>{context && <p className="text-sm text-muted-foreground">{context}</p>}</div>{action}</div>;
}
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold">{title}</h3>{action}</div>;
}
export function MoneyValue({ amount, className }: { amount: number; className?: string }) {
  const money = useMoneyFormatter();
  return <span className={cn('tabular-nums break-words', className)}>{money(amount)}</span>;
}
export function MetricCard({ label, amount, help }: { label: string; amount: number; help?: string }) {
  return <div className="ui-card min-w-0"><p className="text-sm text-muted-foreground">{label}</p><MoneyValue amount={amount} className="block text-xl sm:text-2xl font-semibold" />{help && <p className="mt-2 text-xs text-muted-foreground">{help}</p>}</div>;
}
const states = {
  pending: { label: 'Pendiente', icon: Clock3, color: 'text-muted-foreground' },
  confirmed: { label: 'Confirmado', icon: CheckCircle2, color: 'text-primary' },
  skipped: { label: 'Omitido', icon: SkipForward, color: 'text-muted-foreground' },
  overdue: { label: 'Vencido', icon: AlertCircle, color: 'text-destructive' },
};
export function StatusBadge({ status }: { status: keyof typeof states }) {
  const { label, icon: Icon, color } = states[status];
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs', color)}><Icon aria-hidden="true" className="h-3 w-3" />{label}</span>;
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-dashed p-5 text-center space-y-2"><p className="font-medium">{title}</p><p className="text-sm text-muted-foreground">{description}</p>{action}</div>;
}

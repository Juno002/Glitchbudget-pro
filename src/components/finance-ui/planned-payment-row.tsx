'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { PlannedOccurrenceDisplayStatus } from '@/domain/occurrence-status';
import { MoneyValue } from './money-value';
import { StatusBadge } from './status-badge';

export function PlannedPaymentRow({
  title,
  amount,
  dateLabel,
  kindLabel,
  status,
  meta,
  actions,
}: {
  title: ReactNode;
  amount?: number;
  dateLabel: ReactNode;
  kindLabel?: ReactNode;
  status: PlannedOccurrenceDisplayStatus;
  meta?: ReactNode;
  actions?: {
    confirm?: () => void;
    skip?: () => void;
    viewMovement?: () => void;
    disabled?: boolean;
  };
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{title}</span>
          {kindLabel ? <span className="text-xs text-muted-foreground">{kindLabel}</span> : null}
          <StatusBadge status={status} />
        </div>
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{dateLabel}</span>
          {amount !== undefined ? <MoneyValue amount={amount} className="text-xs" /> : null}
          {meta}
        </div>
      </div>

      {actions ? (
        <div className="flex flex-wrap gap-2">
          {actions.skip ? (
            <Button type="button" size="sm" variant="outline" className="min-h-11 sm:min-h-9" disabled={actions.disabled} onClick={actions.skip}>
              Omitir
            </Button>
          ) : null}
          {actions.confirm ? (
            <Button type="button" size="sm" className="min-h-11 sm:min-h-9" disabled={actions.disabled} onClick={actions.confirm}>
              Confirmar
            </Button>
          ) : null}
          {actions.viewMovement ? (
            <Button type="button" size="sm" variant="outline" className="min-h-11 sm:min-h-9" onClick={actions.viewMovement}>
              Ver movimiento
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

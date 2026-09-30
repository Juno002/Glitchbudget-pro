'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { useBudgetPeriod } from '@/hooks/use-budget-period';
import { formatPeriodRange } from '@/lib/period-format';
import { cn } from '@/lib/utils';

export const BUDGET_PERIOD_LABELS = { weekly:'Semanal', monthly:'Mensual', yearly:'Anual', one_time:'Único' } as const;

export function BudgetPeriodControls({ selection }: { selection:ReturnType<typeof useBudgetPeriod> }) {
  const { kind, setKind, range, saved, values, update, choose, navigate } = selection;
  return (
    <div className="space-y-4 rounded-[var(--radius-card)] bg-muted/25 p-4" data-budget-period-controls="prisma">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Tipo de período del presupuesto">
        {(Object.keys(BUDGET_PERIOD_LABELS) as Array<keyof typeof BUDGET_PERIOD_LABELS>).map(value => (
          <Button key={value} type="button" variant="outline" aria-pressed={kind === value} onClick={() => setKind(value)}
            className={cn('min-h-11 rounded-[var(--radius-interactive)] bg-card shadow-[var(--shadow-control)]', kind === value && 'border-primary/35 bg-primary/10 text-primary')}>
            {BUDGET_PERIOD_LABELS[value]}
          </Button>
        ))}
      </div>
      {kind === 'one_time' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="min-w-0 space-y-1 text-sm"><span>Inicio</span><Input type="date" value={values.start} onChange={event => update({ start:event.target.value })} /></label>
          <label className="min-w-0 space-y-1 text-sm"><span>Fin</span><Input type="date" value={values.end} onChange={event => update({ end:event.target.value })} /></label>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <Button type="button" variant="outline" className="rounded-[var(--radius-interactive)]" aria-label="Presupuesto anterior" onClick={() => navigate(-1)} disabled={!range}>Anterior</Button>
          <Button type="button" variant="outline" className="rounded-[var(--radius-interactive)]" aria-label="Presupuesto siguiente" onClick={() => navigate(1)} disabled={!range}>Siguiente</Button>
          {kind !== 'monthly' && <label className="min-w-0 flex-1 space-y-1 text-sm"><span>Fecha de referencia</span><Input type="date" value={values.anchor} onChange={event => update({ anchor:event.target.value })} /></label>}
        </div>
      )}
      {saved.length > 0 && (
        <label className="block space-y-1 text-sm">
          <span>Presupuestos guardados</span>
          <select className="h-11 w-full min-w-0 rounded-[var(--radius-interactive)] border border-input bg-card px-3 shadow-[var(--shadow-control)]" value={saved.some(item => item.id === range?.id) ? range!.id : ''}
            onChange={event => { const item = saved.find(item => item.id === event.target.value); if (item) choose(item); }}>
            <option value="">Selecciona un rango guardado</option>
            {saved.map(item => <option key={item.id} value={item.id}>{formatPeriodRange(item)}</option>)}
          </select>
        </label>
      )}
      <p className="rounded-[var(--radius-interactive)] bg-card px-3 py-2 text-sm shadow-[var(--shadow-control)]" aria-live="polite"><span className="text-muted-foreground">Rango: </span><strong>{range ? formatPeriodRange(range) : 'Selecciona un rango válido'}</strong></p>
    </div>
  );
}

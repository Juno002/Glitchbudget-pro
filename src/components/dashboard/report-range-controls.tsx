'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReportRangePreset } from '@/domain/reports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FeedbackMessage } from '@/components/finance-ui';

const presets: Array<{ value:ReportRangePreset; label:string }> = [
  { value:'7d', label:'Semana' },
  { value:'30d', label:'Mes' },
  { value:'1y', label:'Año' },
  { value:'3m', label:'3 meses' },
  { value:'6m', label:'6 meses' },
  { value:'custom', label:'Fechas' },
];

export function ReportRangeControls({
  preset,
  rangeLabel,
  customStart,
  customEnd,
  today,
  rangeError,
  canGoForward,
  onPresetChange,
  onPrevious,
  onNext,
  onCustomStartChange,
  onCustomEndChange,
}: {
  preset: ReportRangePreset;
  rangeLabel:string;
  customStart: string;
  customEnd: string;
  today: string;
  rangeError: string;
  canGoForward:boolean;
  onPresetChange: (value: ReportRangePreset) => void;
  onPrevious: () => void;
  onNext: () => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-3" data-report-range-controls="prisma">
      <div className="grid grid-cols-3 rounded-2xl bg-muted p-1" role="group" aria-label="Rango de Reportes">
        {presets.slice(0,3).map(option=>(
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={preset===option.value?'secondary':'ghost'}
            className="min-h-11 rounded-xl px-3 text-sm shadow-none"
            data-report-preset={option.value}
            aria-pressed={preset===option.value}
            onClick={()=>onPresetChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={onPrevious} aria-label="Período anterior">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <p className="min-w-0 flex-1 text-center text-sm font-semibold tabular-nums" data-report-period>{rangeLabel}</p>
        <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={onNext} disabled={!canGoForward} aria-label="Período siguiente">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" size="icon" className="min-h-11 min-w-11 rounded-full" onClick={()=>onPresetChange(preset==='custom'?'30d':'custom')} aria-label="Elegir fechas personalizadas" data-report-preset="custom" aria-pressed={preset==='custom'}>
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Otros rangos">
        {presets.slice(3,5).map(option=>(
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={preset===option.value?'default':'ghost'}
            className="min-h-9 rounded-full px-3 text-xs"
            data-report-preset={option.value}
            aria-pressed={preset===option.value}
            onClick={()=>onPresetChange(option.value)}
          >{option.label}</Button>
        ))}
      </div>

      {preset==='custom' && (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="min-w-0 text-xs text-muted-foreground">Desde
            <Input className="mt-1 min-h-11 min-w-0" type="date" max={customEnd || today} value={customStart} onChange={event=>onCustomStartChange(event.target.value)} />
          </label>
          <label className="min-w-0 text-xs text-muted-foreground">Hasta
            <Input className="mt-1 min-h-11 min-w-0" type="date" min={customStart} max={today} value={customEnd} onChange={event=>onCustomEndChange(event.target.value)} />
          </label>
        </div>
      )}
      {rangeError ? <FeedbackMessage tone="error" description={rangeError} /> : null}
    </div>
  );
}

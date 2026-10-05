'use client';

import type { ReportRangePreset } from '@/domain/reports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FeedbackMessage } from '@/components/finance-ui';

const presets: Array<{ value:ReportRangePreset; label:string }> = [
  { value:'7d', label:'7D' },
  { value:'30d', label:'30D' },
  { value:'3m', label:'3M' },
  { value:'6m', label:'6M' },
  { value:'1y', label:'1Y' },
  { value:'custom', label:'Custom' },
];

export function ReportRangeControls({
  preset,
  customStart,
  customEnd,
  today,
  rangeError,
  onPresetChange,
  onCustomStartChange,
  onCustomEndChange,
}: {
  preset: ReportRangePreset;
  customStart: string;
  customEnd: string;
  today: string;
  rangeError: string;
  onPresetChange: (value: ReportRangePreset) => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-3" data-report-range-controls="prisma">
      <div className="report-range-presets" role="group" aria-label="Rango de Reportes">
        {presets.map(option=>(
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={preset===option.value?'default':'outline'}
            className="min-h-11 min-w-11 rounded-[var(--radius-interactive)] px-2 text-xs shadow-none"
            data-report-preset={option.value}
            aria-pressed={preset===option.value}
            onClick={()=>onPresetChange(option.value)}
          >
            {option.label}
          </Button>
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

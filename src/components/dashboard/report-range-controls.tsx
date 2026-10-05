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
    <div className="space-y-3" data-report-range-controls="prisma">
      <div
        className="flex max-w-full flex-wrap gap-1.5"
        role="group"
        aria-label="Rango del reporte"
      >
        {presets.map(option=>(
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={preset===option.value?'default':'ghost'}
            className="min-h-9 rounded-full px-3 text-xs shadow-none"
            data-report-preset={option.value}
            aria-pressed={preset===option.value}
            onClick={()=>onPresetChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {preset==='custom' && (
        <div className="grid max-w-xl gap-3 rounded-[var(--radius-interactive)] border border-[var(--border-subtle)] bg-card/55 p-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-muted-foreground">Desde
            <Input className="mt-1" type="date" max={customEnd || today} value={customStart} onChange={event=>onCustomStartChange(event.target.value)} />
          </label>
          <label className="text-xs font-medium text-muted-foreground">Hasta
            <Input className="mt-1" type="date" min={customStart} max={today} value={customEnd} onChange={event=>onCustomEndChange(event.target.value)} />
          </label>
        </div>
      )}
      {rangeError ? <FeedbackMessage tone="error" description={rangeError} /> : null}
    </div>
  );
}

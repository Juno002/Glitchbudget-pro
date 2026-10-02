'use client';

import type { ReportRangePreset } from '@/domain/reports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionHeader } from '@/components/finance-ui';
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
    <section className="space-y-4 rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-card)]" aria-labelledby="range-title" data-report-range-controls="prisma">
      <SectionHeader title={<span id="range-title">Rango</span>} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {presets.map(option=>(
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={preset===option.value?'default':'outline'}
            className="min-h-10 rounded-[var(--radius-interactive)]"
            data-report-preset={option.value}
            aria-pressed={preset===option.value}
            onClick={()=>onPresetChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {preset==='custom' && (
        <div className="grid gap-3 rounded-[var(--radius-interactive)] bg-muted/30 p-3 sm:grid-cols-2">
          <label className="text-sm">Desde
            <Input type="date" max={customEnd || today} value={customStart} onChange={event=>onCustomStartChange(event.target.value)} />
          </label>
          <label className="text-sm">Hasta
            <Input type="date" min={customStart} max={today} value={customEnd} onChange={event=>onCustomEndChange(event.target.value)} />
          </label>
        </div>
      )}
      {rangeError ? <FeedbackMessage tone="error" description={rangeError} /> : null}
    </section>
  );
}
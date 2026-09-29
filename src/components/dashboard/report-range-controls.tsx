'use client';

import type { ReportRangePreset } from '@/domain/reports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionHeader } from '@/components/finance-ui';
import { cn } from '@/lib/utils';

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
  currentLabel,
  previousLabel,
  onPresetChange,
  onCustomStartChange,
  onCustomEndChange,
}: {
  preset: ReportRangePreset;
  customStart: string;
  customEnd: string;
  today: string;
  rangeError: string;
  currentLabel: string;
  previousLabel: string;
  onPresetChange: (value: ReportRangePreset) => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
}) {
  return (
    <section className="space-y-3" aria-labelledby="range-title">
      <SectionHeader
        title={<span id="range-title">Rango</span>}
        description="El período anterior siempre usa una ventana inmediatamente anterior de duración comparable."
      />
      <div className="flex flex-wrap gap-2">
        {presets.map(option=>(
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={preset===option.value?'default':'outline'}
            onClick={()=>onPresetChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {preset==='custom' && (
        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <label className="text-sm">Desde
            <Input type="date" max={customEnd || today} value={customStart} onChange={event=>onCustomStartChange(event.target.value)} />
          </label>
          <label className="text-sm">Hasta
            <Input type="date" min={customStart} max={today} value={customEnd} onChange={event=>onCustomEndChange(event.target.value)} />
          </label>
        </div>
      )}
      <p className={cn('text-xs',rangeError?'text-bad':'text-muted-foreground')}>
        {rangeError || 'Actual: '+currentLabel+' · Comparable: '+previousLabel}
      </p>
    </section>
  );
}

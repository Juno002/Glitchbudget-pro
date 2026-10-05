'use client';

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { useBalanceVisibility, usePrivateCurrency } from '@/contexts/balance-visibility-context';
import type { ReportCategoryVisualizationSegment } from '@/lib/report-visualization';
import type { SpendingTrendPoint } from '@/domain/reports';

const CATEGORY_COLORS = [
  'hsl(var(--brand-coral))',
  'hsl(var(--brand-mint))',
  'hsl(var(--brand-lavender))',
  'hsl(var(--brand-gold))',
  'hsl(var(--muted-foreground))',
];

export type ReportChartRow = {
  label: string;
  value: number;
};

export type ReportComparisonChartRow = {
  label: string;
  previous: number;
  current: number;
};

function EmptyChart({ label }: { label:string }) {
  return <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">{label}</div>;
}

function categoryColor(row: ReportCategoryVisualizationSegment, index: number) {
  return row.isOther ? 'hsl(var(--muted-foreground))' : CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

export function ReportCategoryDonut({
  data,
  total,
}: {
  data: ReportCategoryVisualizationSegment[];
  total: number;
}) {
  const money = usePrivateCurrency();
  const { balancesHidden } = useBalanceVisibility();
  if (!data.length || total <= 0) return <EmptyChart label="Sin gastos para representar." />;

  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] md:items-center" data-report-chart="category-donut">
      <div className="relative h-[210px] min-w-0" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer={false}>
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as ReportCategoryVisualizationSegment | undefined;
                if (!active || !row) return null;
                return (
                  <div className="rounded-[var(--radius-interactive)] border bg-popover p-3 text-xs text-popover-foreground shadow-[var(--shadow-popover)]">
                    <p className="font-medium">{row.label}</p>
                    <p>{(row.percentTenths / 10).toFixed(1)}%</p>
                    <p className="mt-1 whitespace-nowrap">{money(row.value)}</p>
                  </div>
                );
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((row,index)=><Cell key={row.key} fill={categoryColor(row,index)} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-[8rem] text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Total</p>
            <p className="mt-1 truncate font-display text-lg leading-tight text-foreground">{money(total)}</p>
          </div>
        </div>
      </div>
      <ol className="min-w-0 divide-y divide-[var(--border-subtle)]" aria-label="Distribución por categoría" data-category-legend>
        {data.map((row,index) => (
          <li
            key={row.key}
            className="flex min-w-0 items-center gap-3 py-2.5"
            data-category-legend-item
            data-category-other={row.isOther ? 'true' : undefined}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: categoryColor(row,index) }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-sm" title={row.label}>{row.label}</span>
            <span className="shrink-0 text-right">
              <span className="block text-sm tabular-nums">{(row.percentTenths / 10).toFixed(1)}%</span>
              {!balancesHidden ? (
                <span className="mt-0.5 block whitespace-nowrap text-[10px] text-muted-foreground" data-category-legend-money>
                  {money(row.value)}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function magnitudeScale(values:number[]) {
  return Math.max(1,...values.map(value=>Math.abs(value)));
}

export function ReportValueBars({
  data,
  signed=false,
}: {
  data:ReportChartRow[];
  signed?:boolean;
}) {
  const money=usePrivateCurrency();
  if (!data.length) return <EmptyChart label="Sin datos para representar." />;
  const max=magnitudeScale(data.map(row=>row.value));

  return (
    <ol className="grid gap-4" data-report-chart="value-bars">
      {data.map(row=>{
        const negative=signed && row.value<0;
        const width=Math.max(row.value===0?0:4,Math.min(100,Math.abs(row.value)/max*100));
        const fill=negative?'hsl(var(--bad))':signed?'hsl(var(--good))':'hsl(var(--primary))';
        return (
          <li key={row.label} className="grid gap-1.5">
            <div className="flex items-end justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{row.label}</span>
              <span className="shrink-0 font-mono text-xs tabular-nums">{money(row.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted/70" aria-hidden="true">
              <span className="block h-full rounded-full" style={{width:width+'%',backgroundColor:fill}} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ReportComparisonBars({ data }: { data:ReportComparisonChartRow[] }) {
  const money=usePrivateCurrency();
  if (!data.length) return <EmptyChart label="Sin comparación disponible." />;
  const max=magnitudeScale(data.flatMap(row=>[row.previous,row.current]));

  return (
    <div className="space-y-5" data-report-chart="comparison-bars">
      <div className="flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-muted-foreground/45" />Anterior</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-primary" />Actual</span>
      </div>
      <ol className="grid gap-5">
        {data.map(row=>(
          <li key={row.label} className="grid gap-2.5">
            <div className="text-sm font-medium">{row.label}</div>
            <div className="grid gap-2">
              {([
                ['Anterior',row.previous,'hsl(var(--muted-foreground) / 0.42)'],
                ['Actual',row.current,'hsl(var(--primary))'],
              ] as const).map(([name,value,fill])=>(
                <div key={name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted/60" aria-label={name}>
                    <span
                      className="block h-full rounded-full"
                      style={{width:Math.max(value===0?0:4,Math.min(100,Math.abs(value)/max*100))+'%',backgroundColor:fill}}
                    />
                  </div>
                  <span className="min-w-[7.5rem] text-right font-mono text-xs tabular-nums">{money(value)}</span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function spendingWindowLabel(point: SpendingTrendPoint) {
  const formatter = new Intl.DateTimeFormat('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });
  const format = (date: string) => formatter.format(new Date(date + 'T12:00:00'));
  return point.range.start === point.range.end ? format(point.range.start) : format(point.range.start) + ' – ' + format(point.range.end);
}

function SpendingTrendBar({
  x, y, width, height, fill, fillOpacity, stroke, strokeWidth, strokeDasharray, payload,
}: {
  x?: number; y?: number; width?: number; height?: number;
  fill?: string; fillOpacity?: number; stroke?: string; strokeWidth?: number; strokeDasharray?: string;
  payload?: SpendingTrendPoint;
}) {
  return (
    <rect
      x={x} y={y} width={width} height={height} rx={5}
      fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray}
      data-spending-trend-bar
      data-spending-coverage={payload?.coverage}
      data-spending-current={payload?.isCurrent ? 'true' : 'false'}
    >
      {payload ? <title>{spendingWindowLabel(payload)} · {payload.isCurrent ? 'Actual' : 'Anterior'}{payload.coverage === 'partial' ? ' · Historial parcial' : ''}</title> : null}
    </rect>
  );
}

export function ReportSpendingTrend({
  data,
  variant='default',
}: {
  data: SpendingTrendPoint[];
  variant?: 'default'|'hero';
}) {
  const money = usePrivateCurrency();
  if (!data.length) return null;
  if (data.length === 1) {
    const point = data[0];
    return point.coverage === 'partial' ? (
      <p
        className={variant==='hero'?'text-xs text-primary-foreground/65':'text-xs text-muted-foreground'}
        data-spending-trend-partial
        data-spending-window-start={point.range.start}
        data-spending-window-end={point.range.end}
        data-spending-coverage={point.coverage}
        data-spending-current={point.isCurrent ? 'true' : 'false'}
      >Historial parcial</p>
    ) : null;
  }

  const hero=variant==='hero';
  return (
    <div className="min-w-0 space-y-3" data-report-chart="spending-trend" data-spending-trend-variant={variant}>
      <div className={hero?'h-32 w-full':'h-40 w-full'} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 2, left: 4 }} accessibilityLayer={false}>
            <XAxis dataKey="range.start" hide />
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as SpendingTrendPoint | undefined;
                if (!active || !point) return null;
                return (
                  <div className="rounded-[var(--radius-interactive)] border bg-popover p-3 text-xs text-popover-foreground shadow-[var(--shadow-popover)]">
                    <p>{spendingWindowLabel(point)} · {point.isCurrent ? 'Actual' : 'Anterior'}</p>
                    {point.coverage === 'partial' ? <p>Historial parcial</p> : null}
                    <p className="mt-1 whitespace-nowrap">{money(point.total)}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="total" isAnimationActive={false} shape={<SpendingTrendBar />}>
              {data.map(point => (
                <Cell
                  key={point.range.start}
                  fill={hero
                    ? point.isCurrent ? 'hsl(var(--brand-gold))' : 'hsl(var(--primary-foreground))'
                    : point.isCurrent ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                  fillOpacity={point.isCurrent ? 1 : hero ? 0.34 : 0.48}
                  stroke={point.isCurrent || point.coverage === 'partial'
                    ? hero ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'
                    : 'none'}
                  strokeWidth={point.isCurrent || point.coverage === 'partial' ? 1.5 : 0}
                  strokeDasharray={point.coverage === 'partial' ? '4 3' : undefined}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ol className={hero?'flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-primary-foreground/65':'grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3'}>
        {data.map(point => (
          <li
            key={point.range.start}
            className={hero
              ? 'flex min-w-0 items-center gap-1.5'
              : 'min-w-0 space-y-1 rounded-[var(--radius-interactive)] border border-[var(--border-subtle)] p-2 text-muted-foreground'}
            data-spending-trend-point
            data-spending-window-start={point.range.start}
            data-spending-window-end={point.range.end}
            data-spending-coverage={point.coverage}
            data-spending-current={point.isCurrent ? 'true' : 'false'}
          >
            {hero ? (
              <>
                <span className={point.isCurrent?'font-semibold text-primary-foreground':'truncate'}>{point.isCurrent?'Actual':spendingWindowLabel(point)}</span>
                {point.coverage === 'partial' ? <span>· parcial</span> : null}
              </>
            ) : (
              <>
                <p className={point.isCurrent ? 'font-semibold text-foreground' : undefined}>{point.isCurrent ? 'Actual' : 'Anterior'}</p>
                <p>{spendingWindowLabel(point)}</p>
                {point.coverage === 'partial' ? <p>Historial parcial</p> : null}
                <p className="whitespace-nowrap text-sm text-foreground" data-spending-trend-money>{money(point.total)}</p>
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

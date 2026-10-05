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
import { projectReportBarGeometry, type ReportCategoryVisualizationSegment } from '@/lib/report-visualization';
import { formatReportRangeLabel } from '@/lib/report-formatting';
import type { SpendingTrendPoint } from '@/domain/reports';

// Category identity only. State colors are reserved for canonical financial states.
const SEGMENT_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--brand-coral))',
  'hsl(var(--brand-mint))',
  'hsl(var(--brand-lavender))',
  'hsl(var(--brand-gold))',
];

export type ReportChartRow = {
  label: string;
  value: number;
};

export type ReportComparisonChartRow = {
  label: string;
  previous: number;
  current: number;
  difference: number;
  percentChange: number | null;
};

function EmptyChart({ label }: { label:string }) {
  return <div className="flex h-full min-h-36 items-center justify-center text-sm text-muted-foreground">{label}</div>;
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
    <div className="report-category-composition" data-report-chart="category-donut">
      <div className="report-category-figure relative mx-auto w-full max-w-[208px] min-w-0" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer={false}>
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as ReportCategoryVisualizationSegment | undefined;
                if (!active || !row) return null;
                return (
                  <div className="rounded-[var(--radius-interactive)] border bg-card p-3 text-xs text-card-foreground shadow-[var(--shadow-control)]">
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
              innerRadius="65%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="hsl(var(--card))"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((row,index)=><Cell key={row.key} fill={SEGMENT_COLORS[index%SEGMENT_COLORS.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[70%] max-w-[112px] text-center [container-type:inline-size]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Total</p>
            <p className="mt-1 whitespace-nowrap leading-tight text-foreground" style={{ fontSize: 'min(0.875rem, ' + (170 / money(total).length) + 'cqi)' }}>{money(total)}</p>
          </div>
        </div>
      </div>
      <ol className="grid min-w-0 gap-3 text-xs sm:text-sm" aria-label="Distribución por categoría" data-category-legend>
        {data.map((row,index) => (
          <li
            key={row.key}
            className="min-w-0"
            data-category-legend-item
            data-category-other={row.isOther ? 'true' : undefined}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: SEGMENT_COLORS[index%SEGMENT_COLORS.length] }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 break-words">{row.label}</span>
              <span className="shrink-0 tabular-nums">{(row.percentTenths / 10).toFixed(1)}%</span>
            </div>
            {!balancesHidden ? (
              <p className="mt-1 whitespace-nowrap pl-[1.125rem] text-xs text-muted-foreground" data-category-legend-money>
                {money(row.value)}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ValueTrack({
  leftPercent, widthPercent, zeroPercent, subdued = false,
}: {
  leftPercent: number; widthPercent: number; zeroPercent: number; subdued?: boolean;
}) {
  return (
    <div className="report-value-track" aria-hidden="true">
      <span className="report-value-zero" style={{ left: zeroPercent + '%' }} />
      <span
        className={'report-value-fill' + (subdued ? ' report-value-fill-previous' : '')}
        style={{ left: leftPercent + '%', width: widthPercent + '%' }}
        data-report-bar={subdued ? 'previous' : 'current'}
      />
    </div>
  );
}

export function ReportValueBars({ data }: { data: ReportChartRow[] }) {
  const money = usePrivateCurrency();
  const geometry = projectReportBarGeometry(data.map(row => row.value));
  if (!data.length) return <EmptyChart label="Sin datos para representar." />;
  return (
    <ol className="space-y-5" data-report-chart="value-bars" aria-label="Naturaleza del gasto">
      {data.map((row, index) => (
        <li key={row.label}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span>{row.label}</span>
            <span className="whitespace-nowrap tabular-nums" data-report-bar-money>{money(row.value)}</span>
          </div>
          <ValueTrack {...geometry.bars[index]} zeroPercent={geometry.zeroPercent} />
        </li>
      ))}
    </ol>
  );
}

function changeLabel(value: number | null) {
  if (value === null) return 'Sin base comparable';
  if (value === 0) return 'Sin cambio';
  return (value > 0 ? '+' : '') + value.toLocaleString('es-DO', { maximumFractionDigits: 2 }) + '%';
}

export function ReportComparisonBars({ data }: { data: ReportComparisonChartRow[] }) {
  const money = usePrivateCurrency();
  const { balancesHidden } = useBalanceVisibility();
  if (!data.length) return <EmptyChart label="Sin comparación disponible." />;
  return (
    <div className="grid min-w-0 gap-x-10 gap-y-7 sm:grid-cols-2" data-report-chart="comparison-bars">
      {data.map(row => {
        const geometry = projectReportBarGeometry([row.previous, row.current]);
        return (
          <article key={row.label} className="min-w-0" data-report-comparison={row.label}>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-xl font-normal">{row.label}</h3>
              <p className="text-xs text-muted-foreground" data-comparison-change>
                <span className="whitespace-nowrap" data-comparison-money="difference">
                  {!balancesHidden && row.difference > 0 ? '+' : ''}{money(row.difference)}
                </span>{' · '}{changeLabel(row.percentChange)}
              </p>
            </div>
            <dl className="space-y-3">
              {(['previous', 'current'] as const).map((key, index) => (
                <div key={key} className={key === 'previous' ? 'text-muted-foreground' : 'text-foreground'}>
                  <div className="mb-1.5 flex flex-wrap justify-between gap-2 text-xs">
                    <dt>{key === 'previous' ? 'Anterior' : 'Actual'}</dt>
                    <dd className="whitespace-nowrap tabular-nums" data-comparison-money={key}>{money(row[key])}</dd>
                  </div>
                  <ValueTrack {...geometry.bars[index]} zeroPercent={geometry.zeroPercent} subdued={key === 'previous'} />
                </div>
              ))}
            </dl>
          </article>
        );
      })}
    </div>
  );
}

export type ReportEquationRow = ReportChartRow & { operator: '' | '+' | '−' };

export function ReportFinancialEquation({
  rows, label, amount, tone = 'neutral',
}: {
  rows: ReportEquationRow[];
  label: string;
  amount: number;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  const money = usePrivateCurrency();
  const { balancesHidden } = useBalanceVisibility();
  // The operators only orient the bars. The result is supplied by the snapshot.
  const geometry = projectReportBarGeometry(rows.map(row => row.operator === '−' ? -row.value : row.value));
  return (
    <div className="report-equation" data-report-chart="financial-equation" aria-label={label}>
      <dl className="space-y-4">
        {rows.map((row, index) => (
          <div key={row.label} data-report-equation-term>
            <div className="report-equation-line">
              <dt className="flex min-w-0 gap-2 text-sm">
                <span className="w-3 shrink-0 text-muted-foreground" aria-hidden="true">{row.operator || ' '}</span>
                <span className="break-words">{row.label}</span>
                {row.operator === '−' ? <span className="sr-only">se resta</span> : row.operator === '+' ? <span className="sr-only">se suma</span> : null}
              </dt>
              <dd className="whitespace-nowrap text-sm tabular-nums" data-equation-money>{money(row.value)}</dd>
            </div>
            <div className="ml-5 mt-2">
              <ValueTrack {...geometry.bars[index]} zeroPercent={geometry.zeroPercent} />
            </div>
          </div>
        ))}
      </dl>
      <div className="report-equation-result" data-report-equation-result={label}>
        <p className="text-sm font-medium">{label}</p>
        <p
          className={(balancesHidden ? 'text-base' : 'font-display tracking-[-0.04em]') + (tone === 'negative' ? ' text-bad' : tone === 'positive' ? ' text-good' : '')}
          style={balancesHidden ? undefined : { fontSize: 'min(2.5rem, ' + (155 / money(amount).length) + 'cqi)' }}
        >
          <span className="whitespace-nowrap" data-equation-money>{money(amount)}</span>
        </p>
      </div>
    </div>
  );
}

function spendingWindowLabel(point: SpendingTrendPoint) {
  return formatReportRangeLabel(point.range.start, point.range.end);
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
      x={x} y={y} width={width} height={height} rx={4}
      fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray}
      data-spending-trend-bar
      data-spending-coverage={payload?.coverage}
      data-spending-current={payload?.isCurrent ? 'true' : 'false'}
    >
      {payload ? <title>{spendingWindowLabel(payload)} · {payload.isCurrent ? 'Actual' : 'Anterior'}{payload.coverage === 'partial' ? ' · Historial parcial' : ''}</title> : null}
    </rect>
  );
}

export function ReportSpendingTrend({ data }: { data: SpendingTrendPoint[] }) {
  const money = usePrivateCurrency();
  if (!data.length) return null;
  if (data.length === 1) {
    const point = data[0];
    return point.coverage === 'partial' ? (
      <p
        className="report-hero-muted text-xs"
        data-spending-trend-partial
        data-spending-window-start={point.range.start}
        data-spending-window-end={point.range.end}
        data-spending-coverage={point.coverage}
        data-spending-current={point.isCurrent ? 'true' : 'false'}
      >Historial parcial</p>
    ) : null;
  }

  return (
    <div className="report-spending-trend min-w-0 space-y-3" data-report-chart="spending-trend">
      <div className="h-36 w-full border-b border-current/20" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 8 }} accessibilityLayer={false}>
            <XAxis dataKey="range.start" hide />
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as SpendingTrendPoint | undefined;
                if (!active || !point) return null;
                return (
                  <div className="rounded-[var(--radius-interactive)] border bg-card p-3 text-xs text-card-foreground shadow-[var(--shadow-control)]">
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
                  fill="hsl(var(--report-hero-ink, var(--foreground)))"
                  fillOpacity={point.isCurrent ? 0.95 : 0.38}
                  stroke={point.isCurrent || point.coverage === 'partial' ? 'hsl(var(--report-hero-ink, var(--foreground)))' : 'none'}
                  strokeWidth={point.isCurrent || point.coverage === 'partial' ? 2 : 0}
                  strokeDasharray={point.coverage === 'partial' ? '4 3' : undefined}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ol className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-3">
        {data.map(point => (
          <li
            key={point.range.start}
            className={'min-w-0 space-y-1 ' + (point.isCurrent ? '' : 'report-hero-muted')}
            data-spending-trend-point
            data-spending-window-start={point.range.start}
            data-spending-window-end={point.range.end}
            data-spending-coverage={point.coverage}
            data-spending-current={point.isCurrent ? 'true' : 'false'}
          >
            <p className={point.isCurrent ? 'font-semibold' : undefined}>{point.isCurrent ? 'Actual' : 'Anterior'}</p>
            <p>{spendingWindowLabel(point)}</p>
            {point.coverage === 'partial' ? <p>Historial parcial</p> : null}
            <p className="whitespace-nowrap text-sm" data-spending-trend-money>{money(point.total)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

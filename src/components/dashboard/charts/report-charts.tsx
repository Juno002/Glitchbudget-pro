'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePrivateCurrency } from '@/contexts/balance-visibility-context';
import type { SpendingTrendPoint } from '@/domain/reports';

const SEGMENT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
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
};

function EmptyChart({ label }: { label:string }) {
  return <div className="flex h-full min-h-56 items-center justify-center text-sm text-muted-foreground">{label}</div>;
}

export function ReportCategoryDonut({ data }: { data:ReportChartRow[] }) {
  const money=usePrivateCurrency();
  if (!data.length) return <EmptyChart label="Sin gastos para representar." />;

  return (
    <div className="h-[290px] w-full" data-report-chart="category-donut">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip formatter={(value:number)=>money(value)} />
          <Legend
            verticalAlign="bottom"
            formatter={(value)=>String(value)}
            wrapperStyle={{ fontSize:11 }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="45%"
            innerRadius={58}
            outerRadius={92}
            paddingAngle={2}
            stroke="hsl(var(--card))"
            strokeWidth={2}
            isAnimationActive
          >
            {data.map((row,index)=><Cell key={row.label} fill={SEGMENT_COLORS[index%SEGMENT_COLORS.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
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

  return (
    <div className="h-[270px] w-full" data-report-chart="value-bars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top:8,right:14,bottom:8,left:12 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.45} />
          <XAxis
            type="number"
            tickFormatter={(value:number)=>money(value)}
            tick={{ fontSize:10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={104}
            tick={{ fontSize:11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip formatter={(value:number)=>money(value)} />
          <Bar dataKey="value" radius={[0,6,6,0]} isAnimationActive>
            {data.map((row,index)=>{
              const fill=signed && row.value<0
                ? 'hsl(var(--bad))'
                : SEGMENT_COLORS[index%SEGMENT_COLORS.length];
              return <Cell key={row.label} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportComparisonBars({ data }: { data:ReportComparisonChartRow[] }) {
  const money=usePrivateCurrency();
  if (!data.length) return <EmptyChart label="Sin comparación disponible." />;

  return (
    <div className="h-[300px] w-full" data-report-chart="comparison-bars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top:8,right:12,bottom:8,left:4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.45} />
          <XAxis dataKey="label" tick={{ fontSize:10 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(value:number)=>money(value)} tick={{ fontSize:10 }} axisLine={false} tickLine={false} width={72} />
          <Tooltip formatter={(value:number)=>money(value)} />
          <Legend wrapperStyle={{ fontSize:11 }} />
          <Bar name="Anterior" dataKey="previous" fill="hsl(var(--muted-foreground))" radius={[5,5,0,0]} />
          <Bar name="Actual" dataKey="current" fill="hsl(var(--primary))" radius={[5,5,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function spendingWindowLabel(point: SpendingTrendPoint) {
  const formatter = new Intl.DateTimeFormat('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });
  const format = (date: string) => formatter.format(new Date(date + 'T12:00:00'));
  return point.range.start === point.range.end ? format(point.range.start) : format(point.range.start) + ' – ' + format(point.range.end);
}

function SpendingTrendBar({
  x, y, width, height, fill, fillOpacity, stroke, strokeWidth, payload,
}: {
  x?: number; y?: number; width?: number; height?: number;
  fill?: string; fillOpacity?: number; stroke?: string; strokeWidth?: number;
  payload?: SpendingTrendPoint;
}) {
  return (
    <rect
      x={x} y={y} width={width} height={height} rx={4}
      fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeWidth}
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

  return (
    <div className="min-w-0 space-y-3" data-report-chart="spending-trend">
      <div className="h-44 w-full" aria-hidden="true">
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
                  fill={point.isCurrent ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}
                  fillOpacity={point.isCurrent ? 1 : 0.55}
                  stroke={point.isCurrent ? 'hsl(var(--foreground))' : 'none'}
                  strokeWidth={point.isCurrent ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ol className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {data.map(point => (
          <li
            key={point.range.start}
            className={'min-w-0 space-y-1 rounded-[var(--radius-interactive)] border p-2 ' + (point.isCurrent ? 'border-foreground/40 text-foreground' : 'border-[var(--border-subtle)] text-muted-foreground')}
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

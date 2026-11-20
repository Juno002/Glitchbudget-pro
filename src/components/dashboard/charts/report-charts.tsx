'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useBalanceVisibility, usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { projectReportBarGeometry, type ReportCategoryVisualizationSegment } from '@/lib/report-visualization';
import { formatReportRangeLabel } from '@/lib/report-formatting';
import type { IncomeExpenseTrendPoint } from '@/domain/reports';

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


function trendAxisLabel(point:IncomeExpenseTrendPoint) {
  const start=new Date(point.range.start+'T12:00:00');
  if (point.labelKind === 'day') {
    return new Intl.DateTimeFormat('es-DO',{day:'numeric'}).format(start);
  }
  if (point.labelKind === 'week') {
    return new Intl.DateTimeFormat('es-DO',{day:'numeric',month:'short'}).format(start);
  }
  return new Intl.DateTimeFormat('es-DO',{month:'short'}).format(start).replace('.','');
}

export function ReportIncomeExpenseTrend({ data }: { data: IncomeExpenseTrendPoint[] }) {
  const money=usePrivateCurrency();
  const {balancesHidden}=useBalanceVisibility();
  if (!data.length) return <EmptyChart label="No hay datos para este período." />;
  return (
    <div className="min-w-0 space-y-3" data-report-chart="income-expense-trend">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-normal">Tendencia</h3>
        <div className="flex gap-4 text-xs text-muted-foreground" aria-label="Series del gráfico">
          <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-primary/40" aria-hidden="true" />Ingresos</span>
          <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />Gastos</span>
        </div>
      </div>
      <div className="h-48 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{top:8,right:4,bottom:0,left:-18}} barGap={3} accessibilityLayer={false}>
            <XAxis tickFormatter={value=>trendAxisLabel(data.find(point=>point.range.start===value)||data[0])} interval="preserveStartEnd" dataKey="range.start" tickLine={false} axisLine={false} tick={{fontSize:11,fill:'hsl(var(--muted-foreground))'}} />
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <YAxis width={42} tickLine={false} axisLine={false} tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}} tickFormatter={value=>balancesHidden?'•••':new Intl.NumberFormat('es-DO',{notation:'compact',maximumFractionDigits:1}).format(Number(value))} />
            <Tooltip
              isAnimationActive={false}
              labelFormatter={(_,payload)=>payload?.[0]?.payload ? formatReportRangeLabel((payload[0].payload as IncomeExpenseTrendPoint).range.start,(payload[0].payload as IncomeExpenseTrendPoint).range.end) : ''}
              formatter={(value,name)=>[balancesHidden?'••••••':money(Number(value)),name]}
            />
            <Bar dataKey="income" name="Ingresos" fill="hsl(var(--primary))" fillOpacity={0.42} radius={[4,4,0,0]} isAnimationActive={false} />
            <Bar dataKey="spending" name="Gastos" fill="hsl(var(--primary))" radius={[4,4,0,0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {data.some(point => point.income === 0 && point.spending === 0) && <p className="text-xs text-muted-foreground">Los períodos sin movimientos se muestran en {balancesHidden ? 'cero' : money(0)}.</p>}
      <table className="sr-only" style={{position:'fixed',left:'-10000px',top:0,width:'1px',height:'1px',padding:0,margin:0,overflow:'hidden',clip:'rect(0,0,0,0)',whiteSpace:'nowrap',border:0,tableLayout:'fixed'}}>
        <caption>Tendencia de ingresos y gastos por período</caption>
        <thead><tr><th>Período</th><th>Ingresos</th><th>Gastos</th></tr></thead>
        <tbody>{data.map(point=>(
          <tr key={point.range.start}>
            <th scope="row">{formatReportRangeLabel(point.range.start,point.range.end)}</th>
            <td>{money(point.income)}</td>
            <td>{money(point.spending)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

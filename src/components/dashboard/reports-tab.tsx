'use client';

import { useState } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { resolveReportRange, type ReportRangePreset } from '@/domain/reports';
import type { QuickReadInsight } from '@/domain/report-insights';
import { localDate } from '@/lib/finance-calculations';
import { usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { useCategoryResolver } from '@/hooks/use-categories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, MetricCard, PageHeader, SectionHeader } from '@/components/finance-ui';
import { useTabs } from '@/contexts/tabs-context';
import { ReportRangeControls } from './report-range-controls';
import {
  ReportCategoryDonut,
  ReportComparisonBars,
  ReportValueBars,
  type ReportChartRow,
  type ReportComparisonChartRow,
} from './charts/report-charts';

function rangeLabel(start:string,end:string) {
  const formatter=new Intl.DateTimeFormat('es-DO',{day:'numeric',month:'short',year:'numeric'});
  const format=(value:string)=>formatter.format(new Date(value+'T12:00:00'));
  return start===end ? format(start) : format(start)+' – '+format(end);
}

function percentLabel(value:number|null) {
  if (value === null) return 'Sin base comparable';
  if (value === 0) return 'Sin cambio';
  return (value > 0 ? '+' : '') + value.toLocaleString('es-DO',{maximumFractionDigits:2}) + '%';
}

function shareLabel(value:number,total:number) {
  if (total <= 0) return '0.0%';
  return (value / total * 100).toFixed(1)+'%';
}

function ComparisonValue({ value }: { value:number|null }) {
  return <span className="text-xs text-muted-foreground">{percentLabel(value)}</span>;
}

function quickReadTitle(insight:QuickReadInsight) {
  switch (insight.kind) {
    case 'spending_above_previous': return 'Gasto aumentó';
    case 'spending_below_previous': return 'Gasto bajó';
    case 'spending_near_previous': return 'Gasto estable';
    case 'cash_flow_change': return 'Flujo neto cambió';
    case 'net_worth_change': return 'Patrimonio cambió';
    case 'leading_category': return 'Categoría dominante';
    case 'no_material_change': return 'Sin cambios materiales';
  }
}

function quickReadBody(
  insight:QuickReadInsight,
  money:(value:number)=>string,
  categoryName:(id:string)=>string,
) {
  const params=insight.copy.params;
  const number=(key:string)=>typeof params[key]==='number' ? params[key] as number : null;

  if (insight.kind==='leading_category') {
    const id=typeof params.categoryId==='string' ? params.categoryId : '';
    const value=number('value');
    const share=number('sharePercent');
    return [
      categoryName(id),
      value===null ? null : money(value),
      share===null ? null : share.toLocaleString('es-DO',{maximumFractionDigits:2})+'% del gasto',
    ].filter(Boolean).join(' · ');
  }

  if (insight.kind==='no_material_change') {
    return 'Ningún umbral de cambio relevante se activó para este rango.';
  }

  const current=number('current');
  const previous=number('previous');
  const percentage=number('percentageDelta');
  return [
    current===null ? null : 'Actual '+money(current),
    previous===null ? null : 'anterior '+money(previous),
    percentage===null ? null : percentLabel(percentage),
  ].filter(Boolean).join(' · ');
}

export default function ReportsTab() {
  const { getReportSnapshot, getBudgetStatusDetails, currentMonth, loading } = useFinances();
  const { setActiveTab, setPlanningTab } = useTabs();
  const money = usePrivateCurrency();
  const getCategoryInfo = useCategoryResolver();
  const today=localDate();
  const initial=resolveReportRange('30d',today);
  const [preset,setPreset]=useState<ReportRangePreset>('30d');
  const [customStart,setCustomStart]=useState(initial.start);
  const [customEnd,setCustomEnd]=useState(initial.end);

  let range=initial;
  let rangeError='';
  try {
    range=resolveReportRange(preset,today,preset==='custom'?{start:customStart,end:customEnd}:undefined);
  } catch(error) {
    rangeError=error instanceof Error ? error.message : 'Rango inválido.';
  }

  const report=getReportSnapshot(range,range.end);
  const budgetDetails=getBudgetStatusDetails(currentMonth).filter(row=>row.configured);
  const previousLabel=rangeLabel(report.previousRange.start,report.previousRange.end);
  const currentLabel=rangeLabel(range.start,range.end);

  const comparisonRows=[
    {label:'Gasto',data:report.comparison.spending},
    {label:'Ingreso',data:report.comparison.income},
    {label:'Flujo neto',data:report.comparison.netCashFlow},
    {label:'Patrimonio neto',data:report.comparison.netWorth},
  ];

  const categoryChartRows:ReportChartRow[]=report.spending.categories.map(row=>({
    label:getCategoryInfo(row.categoryId)?.name || row.categoryId,
    value:row.value,
  }));
  const natureChartRows:ReportChartRow[]=report.spending.byNature.map(row=>({
    label:row.nature,
    value:row.total,
  }));
  const cashFlowChartRows:ReportChartRow[]=[
    {label:'Ingresos',value:report.cashFlow.income},
    {label:'Gastos en efectivo',value:report.cashFlow.cashExpenses},
    {label:'Pagos de deuda',value:report.cashFlow.debtPayments},
    {label:'Flujo neto',value:report.cashFlow.netCashFlow},
  ];
  const netWorthChartRows:ReportChartRow[]=[
    {label:'Efectivo',value:report.netWorth.cash},
    {label:'Bancos',value:report.netWorth.banks},
    {label:'Inversiones',value:report.netWorth.investments},
    {label:'Pasivos',value:-report.netWorth.liabilities},
    {label:'Patrimonio neto',value:report.netWorth.netWorth},
  ];
  const comparisonChartRows:ReportComparisonChartRow[]=comparisonRows.map(row=>({
    label:row.label,
    previous:row.data.previous,
    current:row.data.current,
  }));

  return (
    <div className="space-y-8 pb-24 md:pb-8" data-reports-prisma="true">
      <PageHeader title={<><span>Reportes</span><span className="text-[hsl(var(--brand-coral))]">.</span></>} />

      <ReportRangeControls
        preset={preset}
        customStart={customStart}
        customEnd={customEnd}
        today={today}
        rangeError={rangeError}
        onPresetChange={setPreset}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-muted/30" />
          <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-muted/30" />
        </div>
      ) : (
        <>
          <section className="space-y-4" aria-labelledby="quick-read-title" data-report-section="quick-read">
            <SectionHeader title={<span id="quick-read-title">Lo más relevante del rango</span>} />
            <div className="grid gap-3 md:grid-cols-3">
              {report.quickRead.map(insight=>(
                <Card key={insight.kind} className="shadow-[var(--shadow-control)]" data-quick-read-kind={insight.kind}>
                  <CardContent className="p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {insight.focus==='cash-flow'?'Flujo de caja':insight.focus==='net-worth'?'Patrimonio':insight.focus==='categories'?'Categorías':insight.focus==='spending'?'Gastos':'Resumen'}
                    </p>
                    <p className="mt-2 font-display text-xl font-normal tracking-[-0.025em]">{quickReadTitle(insight)}</p>
                    {insight.kind !== 'no_material_change' ? (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {quickReadBody(insight,money,id=>getCategoryInfo(id)?.name || id)}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="spending-title" data-report-section="spending">
            <SectionHeader title={<span id="spending-title">Gastos</span>} />
            <Card className="overflow-hidden shadow-[var(--shadow-card)]" data-report-hero="spending">
              <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.35fr_2fr] lg:items-end">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Total gastado</p>
                  <p className="mt-2 font-display text-4xl font-normal tracking-[-0.05em] text-bad">{money(report.spending.total)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{currentLabel}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[var(--radius-interactive)] bg-muted/35 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Período comparable</p>
                    <p className="mt-2 font-mono text-sm font-semibold">{money(report.spending.previousTotal)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{previousLabel}</p>
                  </div>
                  <div className="rounded-[var(--radius-interactive)] bg-muted/35 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Tendencia</p>
                    <p className="mt-2 font-display text-xl font-normal">{percentLabel(report.spending.percentChange)}</p>
                  </div>
                  <div className="rounded-[var(--radius-interactive)] bg-muted/35 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Transacciones</p>
                    <p className="mt-2 font-display text-xl font-normal">{report.spending.transactionCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4" aria-labelledby="comparison-title" data-report-section="comparison">
            <SectionHeader title={<span id="comparison-title">Comparación</span>} />
            <Card className="shadow-[var(--shadow-card)]" data-report-visual="comparison">
              <CardHeader>
                <CardTitle className="font-display text-xl font-normal">Actual vs. anterior</CardTitle>
                <CardDescription>{currentLabel} comparado con {previousLabel}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ReportComparisonBars data={comparisonChartRows} />
                <div className="overflow-x-auto rounded-[var(--radius-interactive)] border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Métrica</TableHead>
                        <TableHead className="text-right">{previousLabel}</TableHead>
                        <TableHead className="text-right">{currentLabel}</TableHead>
                        <TableHead className="text-right">Cambio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonRows.map(row=>(
                        <TableRow key={row.label}>
                          <TableCell>{row.label}</TableCell>
                          <TableCell className="text-right font-mono">{money(row.data.previous)}</TableCell>
                          <TableCell className="text-right font-mono">{money(row.data.current)}</TableCell>
                          <TableCell className="text-right">
                            <div className="font-mono">{row.data.difference>=0?'+':''}{money(row.data.difference)}</div>
                            <ComparisonValue value={row.data.percentChange} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4" aria-labelledby="spending-breakdown-title" data-report-section="spending-breakdown">
            <SectionHeader title={<span id="spending-breakdown-title">Categorías y naturaleza</span>} />
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="overflow-hidden shadow-[var(--shadow-card)]" data-report-visual="categories">
                <CardHeader>
                  <CardTitle className="font-display text-2xl font-normal">Distribución por categoría</CardTitle>
                  </CardHeader>
                <CardContent className="space-y-4">
                  <ReportCategoryDonut data={categoryChartRows} />
                  {report.spending.categories.length ? (
                    <div className="overflow-x-auto rounded-[var(--radius-interactive)] border">
                      <Table>
                        <TableHeader><TableRow><TableHead>Categoría</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {report.spending.categories.map(row=>(
                            <TableRow key={row.categoryId}>
                              <TableCell>{getCategoryInfo(row.categoryId)?.name || row.categoryId}</TableCell>
                              <TableCell className="text-right font-mono">{money(row.value)}</TableCell>
                              <TableCell className="text-right">{shareLabel(row.value,report.spending.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : <EmptyState description="No hay gastos registrados dentro de este rango." />}
                </CardContent>
              </Card>

              <Card className="overflow-hidden shadow-[var(--shadow-card)]" data-report-visual="nature">
                <CardHeader>
                  <CardTitle className="font-display text-2xl font-normal">Fijo / Variable / Ocasional</CardTitle>
                  </CardHeader>
                <CardContent className="space-y-4">
                  <ReportValueBars data={natureChartRows} />
                  <div className="overflow-x-auto rounded-[var(--radius-interactive)] border">
                    <Table>
                      <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">#</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {report.spending.byNature.map(row=>(
                          <TableRow key={row.nature}>
                            <TableCell>{row.nature}</TableCell>
                            <TableCell className="text-right font-mono">{money(row.total)}</TableCell>
                            <TableCell className="text-right">{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="cashflow-title" data-report-section="cash-flow">
            <SectionHeader title={<span id="cashflow-title">Flujo de caja</span>} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Ingresos" amount={report.cashFlow.income} tone="positive" />
              <MetricCard label="Gastos en efectivo" amount={report.cashFlow.cashExpenses} tone="negative" />
              <MetricCard label="Pagos de deuda" amount={report.cashFlow.debtPayments} tone="negative" />
              <MetricCard label="Flujo neto" amount={report.cashFlow.netCashFlow} tone={report.cashFlow.netCashFlow<0?'negative':'positive'} />
            </div>
            <Card className="shadow-[var(--shadow-card)]" data-report-visual="cash-flow">
              <CardHeader>
                <CardTitle className="font-display text-xl font-normal">Flujo del rango</CardTitle>
              </CardHeader>
              <CardContent><ReportValueBars data={cashFlowChartRows} signed /></CardContent>
            </Card>
          </section>

          <section className="space-y-4" aria-labelledby="networth-title" data-report-section="net-worth">
            <SectionHeader title={<span id="networth-title">Patrimonio neto</span>} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard label="Efectivo" amount={report.netWorth.cash} tone="neutral" />
              <MetricCard label="Bancos" amount={report.netWorth.banks} tone="neutral" />
              <MetricCard label="Inversiones" amount={report.netWorth.investments} tone="neutral" />
              <MetricCard label="Pasivos" amount={report.netWorth.liabilities} tone={report.netWorth.liabilities>0?'negative':'neutral'} />
              <MetricCard label="Patrimonio neto" amount={report.netWorth.netWorth} tone={report.netWorth.netWorth<0?'negative':'positive'} />
            </div>
            <Card className="shadow-[var(--shadow-card)]" data-report-visual="net-worth">
              <CardHeader>
                <CardTitle className="font-display text-xl font-normal">Composición registrada</CardTitle>
              </CardHeader>
              <CardContent><ReportValueBars data={netWorthChartRows} signed /></CardContent>
            </Card>
            {report.netWorth.cardPositiveBalance>0 && (
              <p className="rounded-[var(--radius-interactive)] bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                El patrimonio también incluye {money(report.netWorth.cardPositiveBalance)} de saldo a favor real en tarjetas; el crédito disponible nunca se trata como activo.
              </p>
            )}
          </section>

          <section className="space-y-4" aria-labelledby="detail-title" data-report-section="detail">
            <SectionHeader title={<span id="detail-title">Movimientos destacados</span>} />
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="font-display text-xl font-normal">Movimientos de mayor importe</CardTitle>
              </CardHeader>
              <CardContent>
                {report.spending.largestTransactions.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Movimiento</TableHead><TableHead>Categoría</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {report.spending.largestTransactions.map(row=>(
                          <TableRow key={row.id}>
                            <TableCell>{row.date}</TableCell>
                            <TableCell>{row.title}<span className="ml-2 text-xs text-muted-foreground">{row.nature}</span></TableCell>
                            <TableCell>{getCategoryInfo(row.categoryId)?.name || row.categoryId}</TableCell>
                            <TableCell className="text-right font-mono">{money(row.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : <EmptyState description="No hay gastos para ordenar en este rango." />}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4" aria-labelledby="budget-followup-title" data-report-section="budget-followup">
            <SectionHeader title={<span id="budget-followup-title">Presupuestos actuales</span>} />
            <Card className="shadow-[var(--shadow-card)]">
              <CardContent className="pt-6">
                {budgetDetails.length ? (
                  <div className="space-y-3">
                    {budgetDetails.slice(0,5).map(row=>(
                      <div key={row.categoryId} className="flex items-center justify-between gap-3 rounded-[var(--radius-interactive)] border bg-background/55 p-3">
                        <span className="text-sm">{getCategoryInfo(row.categoryId)?.name || row.categoryId}</span>
                        <span className="text-right text-sm font-mono">{money(row.spent)} / {money(row.limit)}</span>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={()=>{ setPlanningTab('budgets'); setActiveTab('planning'); }}>
                      Gestionar presupuestos
                    </Button>
                  </div>
                ) : (
                  <EmptyState
                    title="Aún no tienes presupuestos"
                    description="Crea un presupuesto en Plan → Presupuestos para comparar límite, gasto y restante en este reporte."
                    action={(
                      <Button type="button" variant="outline" onClick={()=>{ setPlanningTab('budgets'); setActiveTab('planning'); }}>
                        Crear presupuesto
                      </Button>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
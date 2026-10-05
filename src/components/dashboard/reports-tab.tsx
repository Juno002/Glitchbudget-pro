'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { resolveReportRange, SPENDING_TREND_MAX_WINDOWS, type ReportRangePreset } from '@/domain/reports';
import { presentReportInsight, type ReportEditorialInsight } from '@/lib/report-editorial';
import { projectReportCategoryDistribution } from '@/lib/report-visualization';
import { localDate } from '@/lib/finance-calculations';
import { useBalanceVisibility, usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { useCategoryResolver } from '@/hooks/use-categories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, MetricCard, PageHeader, SectionHeader, TransactionRow } from '@/components/finance-ui';
import { useTabs } from '@/contexts/tabs-context';
import { ReportRangeControls } from './report-range-controls';
import {
  ReportCategoryDonut,
  ReportComparisonBars,
  ReportSpendingTrend,
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

function quickReadBody(
  insight:ReportEditorialInsight,
  money:(value:number)=>string,
  categoryName:(id:string)=>string,
) {
  const currency=(value:number)=><span className="whitespace-nowrap" data-quick-read-money>{money(value)}</span>;
  const join=(parts:ReactNode[])=>parts.filter(Boolean).map((part,index)=>(
    <Fragment key={index}>{index>0?' · ':null}{part}</Fragment>
  ));

  if (insight.body.key==='category') {
    const { categoryId,value,sharePercent }=insight.body.params;
    return join([
      categoryName(categoryId),
      value===null ? null : currency(value),
      sharePercent===null ? null : sharePercent.toLocaleString('es-DO',{maximumFractionDigits:2})+'% del gasto',
    ]);
  }

  if (insight.body.key==='no_material_change') {
    return 'Ninguna métrica principal cambió lo suficiente para destacarla.';
  }

  const { current,previous,percentageDelta }=insight.body.params;
  return join([
    current===null ? null : <>Actual {currency(current)}</>,
    previous===null ? null : <>anterior {currency(previous)}</>,
    insight.body.key==='cash_flow_sign_change' || percentageDelta===null ? null : percentLabel(percentageDelta),
  ]);
}

export default function ReportsTab() {
  const { getReportSnapshot, getSpendingTrend, getBudgetStatusDetails, currentMonth, loading } = useFinances();
  const { setActiveTab, setPlanningTab } = useTabs();
  const money = usePrivateCurrency();
  const { balancesHidden } = useBalanceVisibility();
  const getCategoryInfo = useCategoryResolver();
  const today=localDate();
  const initial=resolveReportRange('30d',today);
  const [preset,setPreset]=useState<ReportRangePreset>('30d');
  const [customStart,setCustomStart]=useState(initial.start);
  const [customEnd,setCustomEnd]=useState(initial.end);
  const [showDetailedAnalysis,setShowDetailedAnalysis]=useState(false);

  let range=initial;
  let rangeError='';
  try {
    range=resolveReportRange(preset,today,preset==='custom'?{start:customStart,end:customEnd}:undefined);
  } catch(error) {
    rangeError=error instanceof Error ? error.message : 'Rango inválido.';
  }

  const report=getReportSnapshot(range,range.end);
  const spendingTrend=getSpendingTrend(range,SPENDING_TREND_MAX_WINDOWS[preset]);
  const editorialQuickRead=report.quickRead.map(presentReportInsight);
  const budgetDetails=getBudgetStatusDetails(currentMonth).filter(row=>row.configured);
  const previousLabel=rangeLabel(report.previousRange.start,report.previousRange.end);
  const currentLabel=rangeLabel(range.start,range.end);

  const comparisonRows=[
    {label:'Gasto',data:report.comparison.spending},
    {label:'Ingreso',data:report.comparison.income},
    {label:'Flujo neto',data:report.comparison.netCashFlow},
    {label:'Patrimonio neto',data:report.comparison.netWorth},
  ];

  const categoryDistribution=projectReportCategoryDistribution(
    report.spending.categories.map(row=>({
      key:row.categoryId,
      label:getCategoryInfo(row.categoryId)?.name || row.categoryId,
      value:row.value,
    })),
  );
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
    <div className="space-y-7 pb-24 md:pb-8" data-reports-prisma="true">
      <header className="space-y-4" data-report-header="editorial">
        <PageHeader
          title={<><span>Reportes</span><span className="text-[hsl(var(--brand-coral))]">.</span></>}
          description={<span>{currentLabel}</span>}
        />
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
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-muted/30" />
          <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-muted/30" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.85fr)] lg:items-stretch" data-report-opening="editorial">
            <section
              className="order-2 min-w-0 rounded-[var(--radius-card)] border border-[hsl(var(--brand-gold)/0.28)] bg-[hsl(var(--brand-gold)/0.10)] p-5 shadow-[var(--shadow-card)] sm:p-6 lg:order-2"
              aria-labelledby="quick-read-title"
              data-report-section="quick-read"
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--warning))]">Lectura rápida</p>
              <div className="mt-4 divide-y divide-[hsl(var(--brand-gold)/0.24)]">
                {editorialQuickRead.map((insight,index)=>(
                  <article
                    key={insight.kind}
                    className={index===0?'min-w-0 pb-5':'min-w-0 py-4 last:pb-0'}
                    aria-labelledby={'quick-read-'+insight.kind+'-title'}
                    data-quick-read-kind={insight.kind}
                    data-quick-read-primary={index===0?'true':undefined}
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {insight.focus==='cash-flow'?'Flujo de caja':insight.focus==='net-worth'?'Patrimonio':insight.focus==='categories'?'Categorías':insight.focus==='spending'?'Gastos':'Resumen'}
                    </p>
                    <h2
                      id={index===0?'quick-read-title':undefined}
                      className={index===0?'mt-2 max-w-[20ch] break-words font-display text-3xl font-normal leading-[1.02] tracking-[-0.04em]':'mt-1.5 break-words font-display text-lg font-normal leading-snug tracking-[-0.02em]'}
                    >{insight.title}</h2>
                    <p className={index===0?'mt-3 text-sm leading-relaxed text-muted-foreground':'mt-2 text-xs leading-relaxed text-muted-foreground'}>
                      {quickReadBody(insight,money,id=>getCategoryInfo(id)?.name || id)}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section
              className="order-1 min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-primary bg-primary text-primary-foreground shadow-[var(--shadow-floating)] lg:order-1"
              aria-labelledby="spending-title"
              data-report-section="spending"
              data-report-hero="spending"
            >
              <div className="grid min-h-full gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(15rem,1.15fr)] lg:items-end">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-primary-foreground/60">Análisis del período</p>
                  <h2 id="spending-title" className="mt-2 font-display text-2xl font-normal tracking-[-0.035em]">Gastos</h2>
                  <p className={'mt-5 font-normal '+(balancesHidden?'text-base leading-normal tracking-normal':'font-display text-[clamp(2.25rem,8vw,4.75rem)] leading-[0.92] tracking-[-0.055em]')}>
                    <span className="whitespace-nowrap" data-spending-money="total">{money(report.spending.total)}</span>
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    <p className="font-medium text-primary-foreground" data-spending-variation>
                      {report.spending.previousTotal!==0 && report.spending.percentChange!==null ? (
                        <><span aria-hidden="true">{report.spending.percentChange>0?'↑':report.spending.percentChange<0?'↓':'↔'}</span>{' '}</>
                      ) : null}
                      {report.spending.previousTotal===0?'Sin base anterior':percentLabel(report.spending.percentChange)+' vs. anterior'}
                    </p>
                    <p className="text-primary-foreground/60" data-spending-count>{report.spending.transactionCount} {report.spending.transactionCount===1?'movimiento':'movimientos'}</p>
                  </div>
                  <div className="mt-5 border-t border-primary-foreground/15 pt-4 text-[10px] leading-relaxed text-primary-foreground/55">
                    <p>Anterior · <span className={'whitespace-nowrap'+(balancesHidden?' text-sm':'')} data-spending-money="previous">{money(report.spending.previousTotal)}</span></p>
                    <p>{previousLabel}</p>
                  </div>
                </div>
                <ReportSpendingTrend data={spendingTrend.windows} variant="hero" />
              </div>
            </section>
          </div>

          <div className="grid gap-7 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-start" data-report-evidence="primary">
            <section
              className="space-y-5 rounded-[var(--radius-card)] border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6"
              aria-labelledby="spending-breakdown-title"
              data-report-section="spending-breakdown"
              data-report-visual="categories"
            >
              <SectionHeader
                eyebrow="Distribución"
                title={<span id="spending-breakdown-title">Dónde se fue el gasto</span>}
              />
              <ReportCategoryDonut data={categoryDistribution.segments} total={categoryDistribution.total} />
            </section>

            <section
              className="space-y-5 border-y border-[var(--border-subtle)] py-6 xl:border-y-0 xl:border-l xl:py-0 xl:pl-7"
              aria-labelledby="comparison-title"
              data-report-section="comparison"
              data-report-visual="comparison"
            >
              <SectionHeader
                eyebrow="Cambio"
                title={<span id="comparison-title">Actual vs. anterior</span>}
                description={<span>{currentLabel}<br className="hidden sm:block" /> {previousLabel}</span>}
              />
              <ReportComparisonBars data={comparisonChartRows} />
            </section>
          </div>

          <section
            className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-5 sm:flex-row sm:items-center sm:justify-between"
            data-report-section="analysis-access"
          >
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Análisis detallado</p>
              <p className="mt-1 font-display text-xl font-normal">Cifras exactas y composición</p>
            </div>
            <Button
              type="button"
              variant="outline"
              aria-expanded={showDetailedAnalysis}
              aria-controls="report-detailed-analysis"
              onClick={()=>setShowDetailedAnalysis(value=>!value)}
            >
              {showDetailedAnalysis?'Ocultar análisis detallado':'Ver análisis detallado'}
            </Button>
          </section>

          <div
            id="report-detailed-analysis"
            hidden={!showDetailedAnalysis}
            data-report-detail={showDetailedAnalysis?'expanded':'collapsed'}
            className="space-y-8"
          >
            <section className="space-y-4" aria-labelledby="comparison-detail-title" data-report-section="comparison-detail">
              <SectionHeader title={<span id="comparison-detail-title">Comparación exacta</span>} />
              <Card className="shadow-[var(--shadow-card)]">
                <CardContent className="pt-6">
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

            <section className="space-y-4" aria-labelledby="spending-detail-title" data-report-section="spending-detail">
              <SectionHeader title={<span id="spending-detail-title">Detalle del gasto</span>} />
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="overflow-hidden shadow-[var(--shadow-card)]">
                  <CardHeader>
                    <CardTitle className="font-display text-xl font-normal">Categorías exactas</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                    <CardTitle className="font-display text-xl font-normal">Fijo / Variable / Ocasional</CardTitle>
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

            <section className="space-y-5" aria-labelledby="cashflow-title" data-report-section="cash-flow">
              <SectionHeader eyebrow="Movimiento real" title={<span id="cashflow-title">Flujo de caja</span>} />
              <div className="grid items-stretch gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.15fr]" data-report-equation="cash-flow">
                <MetricCard label="Ingresos" amount={report.cashFlow.income} tone="positive" className="border-0 bg-transparent shadow-none" />
                <div className="hidden items-center justify-center text-xl text-muted-foreground lg:flex" aria-hidden="true">−</div>
                <MetricCard label="Gastos en efectivo" amount={report.cashFlow.cashExpenses} tone="negative" className="border-0 bg-transparent shadow-none" />
                <div className="hidden items-center justify-center text-xl text-muted-foreground lg:flex" aria-hidden="true">−</div>
                <MetricCard label="Pagos de deuda" amount={report.cashFlow.debtPayments} tone="negative" className="border-0 bg-transparent shadow-none" />
                <div className="hidden items-center justify-center text-xl text-muted-foreground lg:flex" aria-hidden="true">=</div>
                <MetricCard label="Flujo neto" amount={report.cashFlow.netCashFlow} tone={report.cashFlow.netCashFlow<0?'negative':'positive'} className="border-primary/20 bg-primary/5 shadow-none" />
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-5" data-report-visual="cash-flow">
                <ReportValueBars data={cashFlowChartRows} signed />
              </div>
            </section>

            <section className="space-y-5" aria-labelledby="networth-title" data-report-section="net-worth">
              <SectionHeader eyebrow="Posición" title={<span id="networth-title">Patrimonio neto</span>} />
              <div className="grid items-stretch gap-2 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1.15fr]" data-report-equation="net-worth">
                <MetricCard label="Efectivo" amount={report.netWorth.cash} tone="neutral" className="border-0 bg-transparent shadow-none" />
                <div className="hidden items-center justify-center text-xl text-muted-foreground xl:flex" aria-hidden="true">+</div>
                <MetricCard label="Bancos" amount={report.netWorth.banks} tone="neutral" className="border-0 bg-transparent shadow-none" />
                <div className="hidden items-center justify-center text-xl text-muted-foreground xl:flex" aria-hidden="true">+</div>
                <MetricCard label="Inversiones" amount={report.netWorth.investments} tone="neutral" className="border-0 bg-transparent shadow-none" />
                <div className="hidden items-center justify-center text-xl text-muted-foreground xl:flex" aria-hidden="true">−</div>
                <MetricCard label="Pasivos" amount={report.netWorth.liabilities} tone={report.netWorth.liabilities>0?'negative':'neutral'} className="border-0 bg-transparent shadow-none" />
                <div className="hidden items-center justify-center text-xl text-muted-foreground xl:flex" aria-hidden="true">=</div>
                <MetricCard label="Patrimonio neto" amount={report.netWorth.netWorth} tone={report.netWorth.netWorth<0?'negative':'positive'} className="border-primary/20 bg-primary/5 shadow-none" />
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-5" data-report-visual="net-worth">
                <ReportValueBars data={netWorthChartRows} signed />
              </div>
              {report.netWorth.cardPositiveBalance>0 && (
                <p className="text-xs text-muted-foreground">
                  Incluye {money(report.netWorth.cardPositiveBalance)} de saldo a favor real en tarjetas; el crédito disponible no es un activo.
                </p>
              )}
            </section>

            <section className="space-y-5" aria-labelledby="detail-title" data-report-section="detail">
              <SectionHeader eyebrow="Evidencia" title={<span id="detail-title">Movimientos de mayor importe</span>} />
              {report.spending.largestTransactions.length ? (
                <div className="divide-y divide-[var(--border-subtle)]" data-report-largest-list="editorial">
                  {report.spending.largestTransactions.map(row=>{
                    const category=getCategoryInfo(row.categoryId);
                    const Icon=category?.icon;
                    return (
                      <TransactionRow
                        key={row.id}
                        icon={Icon ? <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-interactive)] bg-[hsl(var(--brand-coral)/0.11)] text-[hsl(var(--brand-coral))]"><Icon className="h-4 w-4" /></span> : undefined}
                        title={row.title}
                        meta={<>{category?.name || row.categoryId} · {row.nature}</>}
                        amount={row.amount}
                        tone="negative"
                        dateLabel={row.date}
                        className="rounded-none border-0 px-0 py-3"
                      />
                    );
                  })}
                </div>
              ) : <EmptyState description="No hay gastos para ordenar en este rango." />}
            </section>

            <section className="space-y-5 border-t border-[var(--border-subtle)] pt-6" aria-labelledby="budget-followup-title" data-report-section="budget-followup">
              <SectionHeader
                eyebrow="Contexto de planificación"
                title={<span id="budget-followup-title">Presupuestos actuales</span>}
                actions={budgetDetails.length ? (
                  <Button type="button" variant="ghost" onClick={()=>{ setPlanningTab('budgets'); setActiveTab('planning'); }}>
                    Gestionar
                  </Button>
                ) : undefined}
              />
              {budgetDetails.length ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {budgetDetails.slice(0,5).map(row=>(
                    <div key={row.categoryId} className="flex items-center justify-between gap-3 py-3">
                      <span className="text-sm">{getCategoryInfo(row.categoryId)?.name || row.categoryId}</span>
                      <span className="text-right text-sm font-mono">{money(row.spent)} / {money(row.limit)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="Sin presupuestos configurados."
                  action={(
                    <Button type="button" variant="outline" onClick={()=>{ setPlanningTab('budgets'); setActiveTab('planning'); }}>
                      Crear presupuesto
                    </Button>
                  )}
                />
              )}
            </section>
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
          </div>
        </>
      )}
    </div>
  );
}
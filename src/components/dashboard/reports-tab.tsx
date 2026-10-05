'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useFinances } from '@/contexts/finance-context';
import { resolveReportRange, SPENDING_TREND_MAX_WINDOWS, type ReportRangePreset } from '@/domain/reports';
import { presentReportInsight, type ReportEditorialInsight } from '@/lib/report-editorial';
import { formatReportRangeLabel as rangeLabel } from '@/lib/report-formatting';
import { projectReportCategoryDistribution } from '@/lib/report-visualization';
import { localDate } from '@/lib/finance-calculations';
import { useBalanceVisibility, usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { useCategoryResolver } from '@/hooks/use-categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, PageHeader, SectionHeader, StatusBadge, TransactionRow } from '@/components/finance-ui';
import { useTabs } from '@/contexts/tabs-context';
import { ReportRangeControls } from './report-range-controls';
import {
  ReportCategoryDonut,
  ReportComparisonBars,
  ReportFinancialEquation,
  ReportSpendingTrend,
  ReportValueBars,
  type ReportChartRow,
  type ReportComparisonChartRow,
} from './charts/report-charts';

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
  const comparisonChartRows:ReportComparisonChartRow[]=comparisonRows.map(row=>({
    label:row.label,
    previous:row.data.previous,
    current:row.data.current,
    difference:row.data.difference,
    percentChange:row.data.percentChange,
  }));

  return (
    <div className="space-y-8 pb-24 md:pb-8" data-reports-prisma="true">
      <div className="report-editorial-header" data-report-editorial-header>
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Análisis</p>
          <PageHeader
            title={<><span>Reportes</span><span className="text-[hsl(var(--brand-coral))]">.</span></>}
            description={<span data-report-period>{currentLabel}</span>}
          />
        </div>
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
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-muted/30" />
          <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-muted/30" />
        </div>
      ) : (
        <>
          <section className="report-spending-hero" aria-labelledby="spending-title" data-report-section="spending" data-report-hero="spending" data-spending-has-trend={spendingTrend.windows.length>=2?'true':'false'}>
            <h2 id="spending-title" className="sr-only">Gastos</h2>
            <div className="report-spending-composition">
              <div className="min-w-0">
                <p className="report-hero-muted text-[10px] font-semibold uppercase tracking-[0.12em]">Gasto del rango</p>
                <div className="report-hero-amount">
                  <p className={'mt-3 font-normal '+(balancesHidden?'text-base leading-normal tracking-normal':'font-display leading-none tracking-[-0.05em]')}>
                    <span
                      className="whitespace-nowrap"
                      style={balancesHidden ? undefined : { fontSize: 'min(4.75rem, ' + (155 / money(report.spending.total).length) + 'cqi)' }}
                      data-spending-money="total"
                    >{money(report.spending.total)}</span>
                  </p>
                </div>
                <p className="report-hero-muted mt-3 text-xs">{currentLabel}</p>
                <div className="mt-6 space-y-2 text-sm">
                  <p data-spending-variation>
                    {report.spending.previousTotal!==0 && report.spending.percentChange!==null ? (
                      <><span aria-hidden="true">{report.spending.percentChange>0?'↑':report.spending.percentChange<0?'↓':'↔'}</span>{' '}</>
                    ) : null}
                    {report.spending.previousTotal===0?'Sin gasto anterior con el que comparar':percentLabel(report.spending.percentChange)+' frente al rango comparable'}
                  </p>
                  <p className="report-hero-muted text-xs" data-spending-count>{report.spending.transactionCount} {report.spending.transactionCount===1?'movimiento':'movimientos'}</p>
                </div>
                <div className="report-hero-comparable mt-6 space-y-1 pt-4 text-xs">
                  <p>Período comparable · <span className={'whitespace-nowrap'+(balancesHidden?' text-base leading-normal tracking-normal':'')} data-spending-money="previous">{money(report.spending.previousTotal)}</span></p>
                  <p className="report-hero-muted">{previousLabel}</p>
                </div>
              </div>
              <ReportSpendingTrend data={spendingTrend.windows} />
            </div>
          </section>

          <div className="report-evidence-composition">
            <section className="report-quick-read" aria-labelledby="quick-read-title" data-report-section="quick-read">
              <h2 id="quick-read-title" className="text-[10px] font-semibold uppercase tracking-[0.12em]">Lectura rápida</h2>
              <div className="mt-5 space-y-5">
                {editorialQuickRead.map((insight,index)=>(
                  <article
                    key={insight.kind}
                    className={index===0?'min-w-0':'report-insight-secondary min-w-0 pt-4'}
                    aria-labelledby={'quick-read-'+insight.kind+'-title'}
                    data-quick-read-kind={insight.kind}
                    data-quick-read-primary={index===0?'true':undefined}
                  >
                    <p className="report-insight-meta text-[10px] font-medium uppercase tracking-[0.08em]">
                      {insight.focus==='cash-flow'?'Flujo de caja':insight.focus==='net-worth'?'Patrimonio':insight.focus==='categories'?'Categorías':insight.focus==='spending'?'Gastos':'Resumen'}
                    </p>
                    <h3
                      id={'quick-read-'+insight.kind+'-title'}
                      className={index===0?'mt-2 break-words font-display text-3xl font-normal leading-tight tracking-[-0.035em] sm:text-4xl':'mt-2 break-words font-display text-xl font-normal leading-snug tracking-[-0.025em]'}
                    >{insight.title}</h3>
                    <p className={index===0?'report-insight-meta mt-3 break-words text-base leading-relaxed':'report-insight-meta mt-2 break-words text-sm leading-relaxed'}>
                      {quickReadBody(insight,money,id=>getCategoryInfo(id)?.name || id)}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="report-category-panel" aria-labelledby="spending-breakdown-title" data-report-section="spending-breakdown" data-report-visual="categories">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Distribución por categoría</p>
              <h2 id="spending-breakdown-title" className="mt-2 font-display text-2xl font-normal tracking-[-0.025em]">Dónde se fue el gasto</h2>
              <div className="mt-4">
                <ReportCategoryDonut data={categoryDistribution.segments} total={categoryDistribution.total} />
              </div>
            </section>
          </div>

          <section className="report-comparison space-y-5" aria-labelledby="comparison-title" data-report-section="comparison" data-report-visual="comparison">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="comparison-title" className="font-display text-2xl font-normal tracking-[-0.025em]">Comparación</h2>
              <p className="text-xs text-muted-foreground">{currentLabel} · anterior {previousLabel}</p>
            </div>
            <ReportComparisonBars data={comparisonChartRows} />
          </section>

          <section className="report-analysis-access flex flex-wrap items-center justify-between gap-3" data-report-section="analysis-access">
            <p className="text-xs text-muted-foreground">Tablas exactas y detalle</p>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              aria-expanded={showDetailedAnalysis}
              aria-controls="report-detailed-analysis"
              onClick={()=>setShowDetailedAnalysis(value=>!value)}
            >
              {showDetailedAnalysis?'Ocultar análisis detallado':'Ver análisis detallado'}
              {showDetailedAnalysis ? <ChevronUp className="ml-2 h-4 w-4" aria-hidden="true" /> : <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />}
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

            <div className="grid min-w-0 gap-8 lg:grid-cols-2">
              <section className="report-equation-section space-y-5" aria-labelledby="cashflow-title" data-report-section="cash-flow" data-report-visual="cash-flow">
                <SectionHeader title={<span id="cashflow-title">Flujo de caja</span>} />
                <ReportFinancialEquation
                  rows={[
                    {label:'Ingresos',value:report.cashFlow.income,operator:''},
                    {label:'Gastos en efectivo',value:report.cashFlow.cashExpenses,operator:'−'},
                    {label:'Pagos de deuda',value:report.cashFlow.debtPayments,operator:'−'},
                  ]}
                  label="Flujo neto" amount={report.cashFlow.netCashFlow}
                  tone={report.cashFlow.netCashFlow<0?'negative':report.cashFlow.netCashFlow>0?'positive':'neutral'}
                />
              </section>

              <section className="report-equation-section space-y-5" aria-labelledby="networth-title" data-report-section="net-worth" data-report-visual="net-worth">
                <SectionHeader title={<span id="networth-title">Patrimonio neto</span>} />
                <ReportFinancialEquation
                  rows={[
                    {label:'Efectivo',value:report.netWorth.cash,operator:''},
                    {label:'Bancos',value:report.netWorth.banks,operator:'+'},
                    {label:'Inversiones',value:report.netWorth.investments,operator:'+'},
                    ...(report.netWorth.cardPositiveBalance>0 ? [{label:'Saldo a favor en tarjetas',value:report.netWorth.cardPositiveBalance,operator:'+' as const}] : []),
                    {label:'Pasivos',value:report.netWorth.liabilities,operator:'−'},
                  ]}
                  label="Patrimonio neto" amount={report.netWorth.netWorth}
                  tone={report.netWorth.netWorth<0?'negative':'neutral'}
                />
                {report.netWorth.cardPositiveBalance>0 && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    El patrimonio también incluye {money(report.netWorth.cardPositiveBalance)} de saldo a favor real en tarjetas; el crédito disponible nunca se trata como activo.
                  </p>
                )}
              </section>
            </div>

            <section className="space-y-4" aria-labelledby="detail-title" data-report-section="detail">
              <SectionHeader title={<span id="detail-title">Movimientos destacados</span>} />
              <h3 className="text-xs text-muted-foreground">Movimientos de mayor importe</h3>
              {report.spending.largestTransactions.length ? (
                <>
                  <ul className="min-w-0 divide-y divide-border sm:hidden" aria-label="Movimientos de mayor importe" data-report-featured-list>
                    {report.spending.largestTransactions.map(row=>{
                      const category=getCategoryInfo(row.categoryId);
                      const Icon=category?.icon;
                      return (
                        <li key={row.id}>
                          <TransactionRow
                            className="report-featured-row rounded-none border-0 bg-transparent px-0 py-4"
                            icon={<span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50" aria-hidden="true">{Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}</span>}
                            title={row.title}
                            meta={<span>{category?.name || row.categoryId} · {row.nature}</span>}
                            amount={row.amount}
                            tone="neutral"
                            dateLabel={rangeLabel(row.date,row.date)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                  <div className="hidden overflow-x-auto sm:block" data-report-featured-table>
                    <Table>
                      <TableHeader><TableRow><TableHead>Movimiento</TableHead><TableHead>Categoría</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {report.spending.largestTransactions.map(row=>(
                          <TableRow key={row.id}>
                            <TableCell><p className="font-medium">{row.title}</p><span className="text-xs text-muted-foreground">{row.nature}</span></TableCell>
                            <TableCell className="text-muted-foreground">{getCategoryInfo(row.categoryId)?.name || row.categoryId}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{row.date}</TableCell>
                            <TableCell className="text-right font-mono">{money(row.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : <EmptyState description="No hay gastos para ordenar en este rango." />}
            </section>

            <section className="report-budget-context space-y-4" aria-labelledby="budget-followup-title" data-report-section="budget-followup">
              <SectionHeader
                title={<span id="budget-followup-title">Presupuestos actuales</span>}
                description={new Intl.DateTimeFormat('es-DO',{month:'long',year:'numeric'}).format(new Date(currentMonth+'-01T12:00:00'))}
                actions={<Button type="button" variant="ghost" className="min-h-11" onClick={()=>{ setPlanningTab('budgets'); setActiveTab('planning'); }}>Ir a Plan</Button>}
              />
              {budgetDetails.length ? (
                <ul className="divide-y divide-border">
                  {budgetDetails.slice(0,5).map(row=>(
                    <li key={row.categoryId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0 space-y-1">
                        <p className="break-words text-sm font-medium">{getCategoryInfo(row.categoryId)?.name || row.categoryId}</p>
                        <p className="flex flex-wrap gap-x-1 text-xs text-muted-foreground">
                          <span className="whitespace-nowrap">{money(row.spent)}</span> de <span className="whitespace-nowrap">{money(row.limit)}</span>
                        </p>
                      </div>
                      <StatusBadge
                        status={row.status==='over'?'danger':row.status==='alert'?'warning':'neutral'}
                        label={row.status==='over'?'Excedido':row.status==='alert'?'En alerta':'En rango'}
                      />
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">Aún no tienes presupuestos.</p>}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

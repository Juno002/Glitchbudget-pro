'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { useFinances } from '@/contexts/finance-context';
import { accountBalance, type AccountSnapshot } from '@/lib/accounts';
import { resolveReportRange, selectIncomeExpenseTrend, shiftReportDateRange, shiftReportRangeAnchor, type ReportRangePreset } from '@/domain/reports';
import { formatReportRangeLabel as rangeLabel } from '@/lib/report-formatting';
import { localDate } from '@/lib/finance-calculations';
import { projectReportCategoryRanking } from '@/lib/report-visualization';
import { usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { useCategoryResolver } from '@/hooks/use-categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, PageHeader, SectionHeader, StatusBadge, TransactionRow } from '@/components/finance-ui';
import { useTabs } from '@/contexts/tabs-context';
import { ReportRangeControls } from './report-range-controls';
import {
  ReportFinancialEquation,
  ReportIncomeExpenseTrend,
  ReportValueBars,
  type ReportChartRow,
} from './charts/report-charts';

function percentLabel(value:number|null) {
  if (value === null) return 'Sin base comparable';
  if (value === 0) return 'Sin cambio';
  return (value > 0 ? '+' : '') + value.toLocaleString('es-DO',{maximumFractionDigits:2}) + '%';
}

function ComparisonValue({ value }: { value:number|null }) {
  return <span className="text-xs text-muted-foreground">{percentLabel(value)}</span>;
}

export default function ReportsTab() {
  const { getReportSnapshot, getBudgetStatusDetails, currentMonth, accounts, accountTransfers, debtPayments, debts, incomes, expenses, loading } = useFinances();
  const { setActiveTab, setPlanningTab, navigate } = useTabs();
  const money = usePrivateCurrency();
  const getCategoryInfo = useCategoryResolver();
  const today=localDate();
  const [anchor,setAnchor]=useState(today);
  const [preset,setPreset]=useState<ReportRangePreset>('30d');
  const initial=resolveReportRange('30d',today);
  const [customStart,setCustomStart]=useState(initial.start);
  const [customEnd,setCustomEnd]=useState(initial.end);
  const [showDetailedAnalysis,setShowDetailedAnalysis]=useState(false);
  const [showAllCategories,setShowAllCategories]=useState(false);

  let range=initial;
  let rangeError='';
  try {
    range=resolveReportRange(preset,anchor,preset==='custom'?{start:customStart,end:customEnd}:undefined);
  } catch(error) {
    rangeError=error instanceof Error ? error.message : 'Rango inválido.';
  }

  const report=getReportSnapshot(range,range.end);
  const incomeExpenseTrend=selectIncomeExpenseTrend(incomes||[],expenses||[],range,preset);
  const topCategories=report.spending.categories;
  const categoryRanking=projectReportCategoryRanking(topCategories,report.spending.total);
  const changeWindow=(direction:-1|1)=>{
    if(preset==='custom'){
      const shifted=shiftReportDateRange({start:customStart,end:customEnd},direction,today);
      setCustomStart(shifted.start); setCustomEnd(shifted.end);
    } else {
      const next=shiftReportRangeAnchor(anchor,preset,direction);
      setAnchor(direction>0 && next>today ? today : next);
    }
  };
  const accountSnapshot:AccountSnapshot={incomes:incomes||[],expenses:expenses||[],payments:debtPayments||[],transfers:accountTransfers||[]};
  const accountUse=new Map<string,number>();
  const markAccountUse=(id?:string)=>{if(id) accountUse.set(id,(accountUse.get(id)||0)+1);};
  for(const row of incomes||[]) if(row.date<=range.end) markAccountUse(row.accountId);
  for(const row of expenses||[]) if(row.date<=range.end && row.paymentMethod!=='credit') markAccountUse(row.accountId);
  for(const row of debtPayments||[]) if(row.date<=range.end) markAccountUse(row.accountId);
  for(const row of accountTransfers||[]) if(row.date<=range.end){markAccountUse(row.fromAccountId);markAccountUse(row.toAccountId);}
  const accountRows=(accounts||[]).map(account=>({...account,balance:accountBalance(account,accountSnapshot,range.end),uses:accountUse.get(account.id)||0}))
    .sort((a,b)=>b.uses-a.uses || b.balance-a.balance || a.name.localeCompare(b.name));
  const accountTotal=report.netWorth.liquidAssets;
  const budgetDetails=getBudgetStatusDetails(currentMonth).filter(row=>row.configured);
  const previousLabel=rangeLabel(report.previousRange.start,report.previousRange.end);
  const currentLabel=rangeLabel(range.start,range.end);

  const comparisonRows=[
    {label:'Gasto',data:report.comparison.spending},
    {label:'Ingreso',data:report.comparison.income},
    {label:'Flujo neto',data:report.comparison.netCashFlow},
    {label:'Patrimonio neto',data:report.comparison.netWorth},
  ];

  const natureChartRows:ReportChartRow[]=report.spending.byNature.map(row=>({
    label:row.nature,
    value:row.total,
  }));

  return (
    <div className="space-y-8 pb-24 md:pb-8" data-reports-prisma="true">
      <div className="report-editorial-header" data-report-editorial-header>
        <div className="min-w-0">
          <PageHeader
            title={<><span>Reportes</span><span className="text-[hsl(var(--brand-coral))]">.</span></>}
          />
        </div>
        <ReportRangeControls
          preset={preset}
          rangeLabel={currentLabel}
          customStart={customStart}
          customEnd={customEnd}
          today={today}
          rangeError={rangeError}
          canGoForward={range.end<today}
          onPresetChange={value=>{if(value==='custom'){setCustomStart(range.start);setCustomEnd(range.end);}else setAnchor(range.end);setPreset(value);}}
          onPrevious={()=>changeWindow(-1)}
          onNext={()=>changeWindow(1)}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-muted/30" />
          <div className="h-48 animate-pulse rounded-[var(--radius-card)] bg-muted/30" />
        </div>
      ) : (
        <>
          <Card className="overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-card)]" aria-labelledby="spending-title" data-report-section="spending" data-report-hero="spending">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div>
                <h2 id="spending-title" className="text-sm font-medium text-muted-foreground">Gasto del período</h2>
                <p className="mt-2 font-display text-5xl tabular-nums font-semibold tracking-[-0.05em] sm:text-6xl" data-spending-money="total">{money(report.spending.total)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium" data-spending-variation>
                    {report.spending.previousTotal===0
                      ? 'Sin gasto previo'
                      : percentLabel(report.spending.percentChange)+' vs. período anterior'}
                  </span>
                  <span className="text-muted-foreground" data-spending-count>{report.spending.transactionCount} {report.spending.transactionCount===1?'movimiento':'movimientos'}</span>
                </div>
              </div>

              <ReportIncomeExpenseTrend data={incomeExpenseTrend} />

              <div className="grid grid-cols-2 gap-4 border-t pt-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Ingresos</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums" data-report-income-total>{money(report.cashFlow.income)}</p>
                </div>
                <div className="border-l pl-4">
                  <p className="text-muted-foreground">Flujo neto</p>
                  <p className={'mt-1 text-xl font-semibold tabular-nums '+(report.cashFlow.netCashFlow>=0?'text-good':'text-bad')} data-report-net-flow>{report.cashFlow.netCashFlow>0?'+':''}{money(report.cashFlow.netCashFlow)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-4" aria-labelledby="top-expenses-title" data-report-section="top-expenses" data-report-visual="categories">
            <div className="flex items-center justify-between gap-3">
              <h2 id="top-expenses-title" className="font-display text-2xl font-normal tracking-[-0.025em]">Top gastos</h2>
              {topCategories.length>5 ? <Button type="button" variant="ghost" className="min-h-11 text-primary" onClick={()=>setShowAllCategories(value=>!value)}>{showAllCategories?'Ver menos':'Ver todo'}</Button> : null}
            </div>
            <Card className="overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
              <CardContent className="p-5">
                {topCategories.length ? (
                  <ol className="divide-y divide-border">
                    {(showAllCategories?categoryRanking:categoryRanking.slice(0,5)).map(row=>{
                      return <li key={row.categoryId} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words font-medium">{getCategoryInfo(row.categoryId)?.name||row.categoryId}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-semibold tabular-nums">{money(row.value)}</p>
                            <p className="text-sm text-muted-foreground">{row.sharePercent.toFixed(1)+'%'}</p>
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={row.sharePercent.toFixed(1)+'% del gasto'}>
                          <span className="block h-full rounded-full bg-primary" style={{width:String(row.widthPercent)+'%'}} />
                        </div>
                      </li>;
                    })}
                  </ol>
                ) : <EmptyState description="No hay gastos para este período." />}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4" aria-labelledby="budget-followup-title" data-report-section="budget-followup">
            <SectionHeader title={<span id="budget-followup-title">Presupuestos</span>} description={new Intl.DateTimeFormat('es-DO',{month:'long',year:'numeric'}).format(new Date(currentMonth+'-01T12:00:00'))} />
            <Card className="rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
              <CardContent className="p-5">
                {budgetDetails.length ? (
                  <>
                    <div className="mb-2 flex justify-end">
                      <Button type="button" variant="ghost" className="min-h-11 text-primary" onClick={()=>{setPlanningTab('budgets');setActiveTab('planning');}}>Administrar</Button>
                    </div>
                    <ul className="divide-y divide-border">
                      {budgetDetails.slice(0,5).map(row=>(
                        <li key={row.categoryId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                          <div className="min-w-0 space-y-1">
                            <p className="break-words text-sm font-medium">{getCategoryInfo(row.categoryId)?.name||row.categoryId}</p>
                            <p className="flex flex-wrap gap-x-1 text-xs text-muted-foreground"><span className="whitespace-nowrap">{money(row.spent)}</span> de <span className="whitespace-nowrap">{money(row.limit)}</span></p>
                          </div>
                          <StatusBadge status={row.status==='over'?'danger':row.status==='alert'?'warning':'neutral'} label={row.status==='over'?'Excedido':row.status==='alert'?'En alerta':'En rango'} />
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="mx-auto max-w-sm py-1 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">◎</div>
                    <h3 className="mt-4 font-semibold">Aún no tienes presupuestos</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Define un límite por categoría y sigue su avance desde aquí.</p>
                    <Button type="button" className="mt-5 min-h-11 rounded-full px-6" onClick={()=>{setPlanningTab('budgets');setActiveTab('planning');}}>Crear presupuesto</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4" aria-labelledby="report-accounts-title" data-report-section="accounts">
            <div className="flex items-center justify-between gap-3">
              <h2 id="report-accounts-title" className="font-display text-2xl font-normal tracking-[-0.025em]">Mis cuentas</h2>
              <Button type="button" variant="ghost" className="min-h-11 text-primary" onClick={()=>navigate({area:'movements',movementSection:'accounts'})}>Administrar</Button>
            </div>
            <Card className="rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total en efectivo y bancos</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{money(accountTotal)}</p>
                  </div>
                  <div className="border-l pl-4">
                    <p className="text-sm text-muted-foreground">Cuenta más usada</p>
                    <p className="mt-1 break-words font-semibold">{accountRows[0]?.name||'Sin cuentas registradas'}</p>
                    {accountRows[0]?.uses ? <p className="text-xs text-muted-foreground">{accountRows[0].uses} movimientos</p> : null}
                  </div>
                </div>
                {accountRows.length ? (
                  <ul className="divide-y divide-border">
                    {accountRows.slice(0,3).map(account=>(
                      <li key={account.id} className="flex items-center justify-between gap-3 py-3 last:pb-0">
                        <span className="min-w-0 break-words text-sm font-medium">{account.name}</span>
                        <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums">{money(account.balance)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="pt-4 text-sm text-muted-foreground">Aún no tienes cuentas.</p>}
              </CardContent>
            </Card>
          </section>

          <section className="report-analysis-access flex flex-wrap items-center justify-between gap-3" data-report-section="analysis-access">
  
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
              <div className="grid gap-4">
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
              <SectionHeader title={<span id="detail-title">Movimientos de mayor importe</span>} />
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


          </div>
        </>
      )}
    </div>
  );
}

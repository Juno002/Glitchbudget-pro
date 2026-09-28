'use client';

import { useState } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { resolveReportRange, type ReportRangePreset } from '@/domain/reports';
import { localDate } from '@/lib/finance-calculations';
import { usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { useCategoryResolver } from '@/hooks/use-categories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, MetricCard, PageHeader, SectionHeader } from '@/components/finance-ui';
import { cn } from '@/lib/utils';
import { useTabs } from '@/contexts/tabs-context';

const presets: Array<{ value:ReportRangePreset; label:string }> = [
  { value:'7d', label:'7D' },
  { value:'30d', label:'30D' },
  { value:'3m', label:'3M' },
  { value:'6m', label:'6M' },
  { value:'1y', label:'1Y' },
  { value:'custom', label:'Custom' },
];

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

function ComparisonValue({ value }: { value:number|null }) {
  return <span className="text-xs text-muted-foreground">{percentLabel(value)}</span>;
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
    {label:'Flujo neto de efectivo',data:report.comparison.netCashFlow},
    {label:'Patrimonio neto',data:report.comparison.netWorth},
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reportes"
        description="Spending, cash flow y patrimonio calculados desde los mismos selectors que usa Resumen."
      />

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
              onClick={()=>setPreset(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        {preset==='custom' && (
          <div className="grid max-w-xl gap-3 sm:grid-cols-2">
            <label className="text-sm">Desde
              <Input type="date" max={customEnd || today} value={customStart} onChange={event=>setCustomStart(event.target.value)} />
            </label>
            <label className="text-sm">Hasta
              <Input type="date" min={customStart} max={today} value={customEnd} onChange={event=>setCustomEnd(event.target.value)} />
            </label>
          </div>
        )}
        <p className={cn('text-xs',rangeError?'text-bad':'text-muted-foreground')}>
          {rangeError || 'Actual: '+currentLabel+' · Comparable: '+previousLabel}
        </p>
      </section>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted/20" />
      ) : (
        <>
          <section className="space-y-4" aria-labelledby="spending-title">
            <SectionHeader
              title={<span id="spending-title">Spending</span>}
              description="Gasto real registrado dentro del rango. Una compra con tarjeta cuenta una vez como gasto."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total gastado" amount={report.spending.total} tone="negative" supporting={currentLabel} />
              <MetricCard
                label="Período comparable"
                amount={report.spending.previousTotal}
                tone="neutral"
                supporting={previousLabel}
              />
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Tendencia</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{percentLabel(report.spending.percentChange)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Cambio del gasto frente al rango comparable.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Transacciones</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{report.spending.transactionCount}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Gastos reales en el rango.</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Categorías</CardTitle>
                  <CardDescription>Una sola dimensión: categoría. La naturaleza del gasto se muestra aparte.</CardDescription>
                </CardHeader>
                <CardContent>
                  {report.spending.categories.length ? (
                    <Table>
                      <TableHeader><TableRow><TableHead>Categoría</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {report.spending.categories.map(row=>{
                          const category=getCategoryInfo(row.categoryId);
                          const percentage=report.spending.total>0 ? row.value/report.spending.total*100 : 0;
                          return <TableRow key={row.categoryId}>
                            <TableCell>{category?.name || row.categoryId}</TableCell>
                            <TableCell className="text-right font-mono">{money(row.value)}</TableCell>
                            <TableCell className="text-right">{percentage.toFixed(1)}%</TableCell>
                          </TableRow>;
                        })}
                      </TableBody>
                    </Table>
                  ) : <EmptyState title="Sin gastos" description="No hay gastos registrados dentro de este rango." />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fixed / Variable / Occasional</CardTitle>
                  <CardDescription>Clasificación separada de las categorías.</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Largest transactions</CardTitle><CardDescription>Los gastos individuales más grandes del rango.</CardDescription></CardHeader>
              <CardContent>
                {report.spending.largestTransactions.length ? (
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
                ) : <EmptyState title="Sin transacciones" description="No hay gastos para ordenar en este rango." />}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4" aria-labelledby="cashflow-title">
            <SectionHeader
              title={<span id="cashflow-title">Cash Flow</span>}
              description="Entradas y salidas reales de efectivo; una compra a crédito no sale de caja hasta que pagas la tarjeta."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Income" amount={report.cashFlow.income} tone="positive" />
              <MetricCard label="Cash expenses" amount={report.cashFlow.cashExpenses} tone="negative" />
              <MetricCard label="Debt payments" amount={report.cashFlow.debtPayments} tone="negative" />
              <MetricCard label="Net cash flow" amount={report.cashFlow.netCashFlow} tone={report.cashFlow.netCashFlow<0?'negative':'positive'} />
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="networth-title">
            <SectionHeader
              title={<span id="networth-title">Net Worth</span>}
              description={'Posición registrada al '+range.end+'. Las proyecciones futuras de inversiones no se incluyen.'}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard label="Cash" amount={report.netWorth.cash} tone="neutral" />
              <MetricCard label="Banks" amount={report.netWorth.banks} tone="neutral" />
              <MetricCard label="Investments" amount={report.netWorth.investments} tone="neutral" />
              <MetricCard label="Credit-card liabilities" amount={report.netWorth.creditCardLiabilities} tone={report.netWorth.creditCardLiabilities>0?'negative':'neutral'} />
              <MetricCard label="Net worth" amount={report.netWorth.netWorth} tone={report.netWorth.netWorth<0?'negative':'positive'} />
            </div>
            {report.netWorth.cardPositiveBalance>0 && (
              <p className="text-xs text-muted-foreground">El patrimonio también incluye {money(report.netWorth.cardPositiveBalance)} de saldo a favor real en tarjetas; el crédito disponible nunca se trata como activo.</p>
            )}
          </section>

          <section className="space-y-4" aria-labelledby="comparison-title">
            <SectionHeader
              title={<span id="comparison-title">Comparison</span>}
              description="Rango actual frente al período inmediatamente anterior de duración comparable."
            />
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
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

          <section className="space-y-4" aria-labelledby="budget-followup-title">
            <SectionHeader
              title={<span id="budget-followup-title">Presupuestos actuales</span>}
              description="Seguimiento secundario de límites del período financiero actual; no altera el rango analítico de arriba."
            />
            <Card>
              <CardContent className="pt-6">
                {budgetDetails.length ? (
                  <div className="space-y-3">
                    {budgetDetails.slice(0,5).map(row=>(
                      <div key={row.categoryId} className="flex items-center justify-between gap-3 rounded-lg border p-3">
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

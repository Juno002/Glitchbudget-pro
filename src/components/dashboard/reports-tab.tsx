'use client';

import { selectCardSignedBalance, selectCardAvailableLimit } from '@/domain/ledger';
import { localDate } from '@/lib/finance-calculations';
import { previousComparablePeriod } from '@/domain/periods';
import { formatPeriodRange } from '@/lib/period-format';
import { useFinances } from "@/contexts/finance-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { cn } from "@/lib/utils";
import { usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { useCategoryResolver } from '@/hooks/use-categories';
import { Progress } from "../ui/progress";
import { useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import MonthlyResultChart from "./charts/monthly-result-chart";
import { EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/finance-ui';

const BreakdownTable = ({ title, data }: { title: string, data: { name: string, value: number }[] }) => {
  const money = usePrivateCurrency();
  const getCategoryInfo = useCategoryResolver();
    const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent>
                {data.length > 0 ? (
                  <div className="overflow-x-auto">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Categoría</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                  <TableHead className="text-right">%</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {data.map(item => (
                                  <TableRow key={item.name}>
                                      <TableCell>{getCategoryInfo(item.name)?.name || item.name}</TableCell>
                                      <TableCell className="text-right">{money(item.value)}</TableCell>
                                      <TableCell className="text-right">{((item.value / total) * 100).toFixed(1)}%</TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </div>
                ) : (
                  <EmptyState title="Sin datos para este período" description="Registra movimientos para ver este desglose." />
                )}
            </CardContent>
        </Card>
    );
}

const MonthlyComparisonTable = () => {
    const money = usePrivateCurrency();
    const { getTotals, currentMonth, currentPeriod, periodStartDay } = useFinances();

    const { previousPeriod, currentTotals, prevTotals } = useMemo(() => {
        const previousPeriod = previousComparablePeriod(currentPeriod, { periodStartDay });
        const currentTotals = getTotals(currentMonth);
        const prevTotals = getTotals(previousPeriod.id);
        return { previousPeriod, currentTotals, prevTotals };
    }, [currentMonth, currentPeriod, periodStartDay, getTotals]);


    const rows = [
        { label: 'Ingresos', prev: prevTotals.recordedIncome, curr: currentTotals.recordedIncome },
        { label: 'Gastos', prev: prevTotals.spending, curr: currentTotals.spending },
        { label: 'Resultado (ingresos − gastos)', prev: prevTotals.monthlyResult, curr: currentTotals.monthlyResult },
        { label: 'Pagos de tarjeta', prev: prevTotals.cardPayments, curr: currentTotals.cardPayments },
        { label: 'Flujo de efectivo del período', prev: prevTotals.cashFlow, curr: currentTotals.cashFlow }
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>📊 Comparativa de períodos</CardTitle>
                <CardDescription>Operaciones registradas. Las compras a crédito son gastos; sus pagos solo afectan al flujo de efectivo.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead></TableHead>
                                <TableHead className="text-right">{formatPeriodRange(previousPeriod)}</TableHead>
                                <TableHead className="text-right">{formatPeriodRange(currentPeriod)}</TableHead>
                                <TableHead className="text-right">Diferencia</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map(row => {
                                const diff = (row.curr || 0) - (row.prev || 0);
                                const improves = row.label === 'Gastos' ? diff < 0 : diff > 0;
                                const diffColor = diff === 0 ? 'text-muted-foreground' : improves ? 'text-green-600' : 'text-red-600';
                                return (
                                    <TableRow key={row.label}>
                                        <TableCell>{row.label}</TableCell>
                                        <TableCell className="text-right">{money(row.prev)}</TableCell>
                                        <TableCell className="text-right">{money(row.curr)}</TableCell>
                                        <TableCell className={cn("text-right font-semibold", diffColor)}>{diff >= 0 ? '+' : ''}{money(diff)}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

const ExpenseByTypeTable = () => {
    const money = usePrivateCurrency();
    const { getExpensesByType, currentMonth } = useFinances();
    const data = getExpensesByType(currentMonth);

    return (
        <Card>
            <CardHeader><CardTitle>📊 Resumen por tipo de gasto</CardTitle></CardHeader>
            <CardContent>
                {data.length > 0 ? (
                  <div className="overflow-x-auto">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Tipo de gasto</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                  <TableHead className="text-right">Promedio</TableHead>
                                  <TableHead className="text-right">#</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {data.map(item => (
                                  <TableRow key={item.name}>
                                      <TableCell>{item.name}</TableCell>
                                      <TableCell className="text-right">{money(item.total)}</TableCell>
                                      <TableCell className="text-right">{money(item.avg)}</TableCell>
                                      <TableCell className="text-right">{item.count}</TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </div>
                ) : (
                  <EmptyState title="Sin gastos por clasificar" description="Cuando registres gastos, aquí aparecerá el resumen por naturaleza." />
                )}
            </CardContent>
        </Card>
    );
}

const BudgetStatusReport = () => {
  const money = usePrivateCurrency();
  const getCategoryInfo = useCategoryResolver();
    const { getBudgetStatusDetails, currentMonth } = useFinances();
    const budgetDetails = getBudgetStatusDetails(currentMonth).filter(b => b.limit > 0);

    const statusFor = (status: 'ok' | 'alert' | 'over' | 'unbudgeted') => ({
        kind: status === 'over' ? 'danger' : status === 'alert' ? 'warning' : status === 'ok' ? 'success' : 'neutral',
        label: status === 'over' ? 'Excedido' : status === 'alert' ? 'Cerca del límite' : status === 'ok' ? 'En presupuesto' : 'Sin presupuesto',
    } as const);

    return (
        <Card>
            <CardHeader>
                <CardTitle>📝 Estado de Presupuestos</CardTitle>
                <CardDescription>Un resumen detallado del rendimiento de tus presupuestos para el período seleccionado.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* MOBILE VIEW: Expandable Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {budgetDetails.length > 0 ? budgetDetails.map(b => {
                        const category = getCategoryInfo(b.categoryId);
                        const progress = b.limit > 0 ? Math.min((b.spent / b.limit) * 100, 100) : 0;
                        return (
                            <div key={b.categoryId} className="bg-black/5 dark:bg-white/5 border border-[rgba(255,255,255,0.04)] dark:border-white/10 p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-semibold text-base">
                                        {category?.icon && <category.icon className="h-5 w-5 text-muted-foreground" />}
                                        {category?.name}
                                    </div>
                                    <StatusBadge status={statusFor(b.status).kind} label={statusFor(b.status).label} />
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm mt-1">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Planificado</span>
                                        <span className="font-mono">{money(b.limit)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Gastado</span>
                                        <span className="font-mono">{money(b.spent)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Restante</span>
                                        <span className={cn("font-mono font-semibold", b.remaining < 0 ? "text-bad" : "")}>{money(b.remaining)}</span>
                                    </div>
                                </div>
                                <Progress 
                                    value={progress} 
                                    className={cn('h-1.5 mt-2 transition-all', 
                                        b.status === 'over' ? '[&>div]:bg-bad' :
                                        b.status === 'alert' ? '[&>div]:bg-warning' : '[&>div]:bg-good'
                                    )}
                                />
                            </div>
                        )
                    }) : (
                        <div className="text-center text-muted-foreground p-6 bg-black/5 dark:bg-white/5 rounded-xl border border-dashed border-border/50">
                            No hay presupuestos configurados para este período.
                        </div>
                    )}
                </div>

                {/* DESKTOP VIEW: Pro Table */}
                <div className="hidden md:block overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="py-4">Categoría</TableHead>
                                <TableHead className="text-right py-4">Planificado</TableHead>
                                <TableHead className="text-right py-4">Gastado</TableHead>
                                <TableHead className="text-right py-4">Restante</TableHead>
                                <TableHead className="py-4">Progreso</TableHead>
                                <TableHead className="py-4">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {budgetDetails.length > 0 ? budgetDetails.map(b => {
                                const category = getCategoryInfo(b.categoryId);
                                const progress = b.limit > 0 ? Math.min((b.spent / b.limit) * 100, 100) : 0;
                                return (
                                    <TableRow key={b.categoryId}>
                                        <TableCell className="py-5 font-medium flex items-center gap-3 text-base">
                                            {category?.icon && <category.icon className="h-5 w-5 text-muted-foreground" />}
                                            {category?.name}
                                        </TableCell>
                                        <TableCell className="text-right py-5 font-mono text-base">{money(b.limit)}</TableCell>
                                        <TableCell className="text-right py-5 font-mono text-base">{money(b.spent)}</TableCell>
                                        <TableCell className={cn("text-right py-5 font-semibold font-mono text-base", b.remaining < 0 ? "text-bad" : "text-muted-foreground")}>
                                            {money(b.remaining)}
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <Progress 
                                                value={progress} 
                                                className={cn('h-2', 
                                                    b.status === 'over' ? '[&>div]:bg-bad' :
                                                    b.status === 'alert' ? '[&>div]:bg-warning' : '[&>div]:bg-good'
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <StatusBadge status={statusFor(b.status).kind} label={statusFor(b.status).label} />
                                        </TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-lg">No hay presupuestos configurados para este período.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}

const CreditCardStatusReport = () => {
    const money = usePrivateCurrency();
    const { debts, debtPayments, expenses } = useFinances();
    const activeCards = (debts || []).filter(d => d.type === 'credit_card' && d.status === 'active');

    const getDaysUntil = (targetDay?: number) => {
        if (!targetDay) return null;
        const today = new Date();
        const currDay = today.getDate();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        if (currDay <= targetDay) return targetDay - currDay;
        return (daysInMonth - currDay) + targetDay;
    };

    if (activeCards.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>💳 Estado de Tarjetas</CardTitle>
                <CardDescription>Seguimiento de saldos, límites y fechas clave para este periodo.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* MOBILE VIEW */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {activeCards.map(debt => {
                        const currentDebt = selectCardSignedBalance(debt, expenses || [], debtPayments || [], localDate());
                        const available = selectCardAvailableLimit(debt.principal, currentDebt);
                        const daysToCut = getDaysUntil(debt.billingCycleDay);
                        const daysToPay = getDaysUntil(debt.paymentDueDay);

                        return (
                            <div key={debt.id} className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 rounded-xl flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-base leading-none">{debt.name}</h4>
                                    <div className="flex flex-col items-end gap-1">
                                        {daysToCut !== null && (
                                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border leading-none font-medium", daysToCut <= 3 ? "border-bad/50 text-bad bg-bad/5" : "border-muted-foreground/30 text-muted-foreground")}>
                                                Corte: {daysToCut}d
                                            </span>
                                        )}
                                        {daysToPay !== null && (
                                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border leading-none font-bold", daysToPay <= 3 ? "border-bad text-bad bg-bad/10" : "border-primary/40 text-primary bg-primary/5")}>
                                                Pago: {daysToPay}d
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Deuda Actual</span>
                                        <span className={cn("font-mono font-bold text-sm", currentDebt > 0 ? "text-bad" : "text-good")}>
                                            {money(currentDebt)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Crédito Disp.</span>
                                        <span className="font-mono font-bold text-sm text-primary">
                                            {money(available)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* DESKTOP VIEW */}
                <div className="hidden md:block overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="py-4">Tarjeta</TableHead>
                                <TableHead className="text-right py-4">Balance Actual</TableHead>
                                <TableHead className="text-right py-4">Límite Disp.</TableHead>
                                <TableHead className="text-center py-4">Corte (Día)</TableHead>
                                <TableHead className="text-center py-4">Pago (Día)</TableHead>
                                <TableHead className="text-right py-4">Vencimiento</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeCards.map(debt => {
                                const currentDebt = selectCardSignedBalance(debt, expenses || [], debtPayments || [], localDate());
                                const available = selectCardAvailableLimit(debt.principal, currentDebt);
                                const daysToPay = getDaysUntil(debt.paymentDueDay);

                                return (
                                    <TableRow key={debt.id}>
                                        <TableCell className="py-5 font-semibold text-base">{debt.name}</TableCell>
                                        <TableCell className={cn("text-right py-5 font-mono text-base font-bold", currentDebt > 0 ? "text-bad" : "text-good")}>
                                            {money(currentDebt)}
                                        </TableCell>
                                        <TableCell className="text-right py-5 font-mono text-base text-primary">
                                            {money(available)}
                                        </TableCell>
                                        <TableCell className="text-center py-5 text-muted-foreground">{debt.billingCycleDay || '-'}</TableCell>
                                        <TableCell className="text-center py-5 text-muted-foreground font-medium">{debt.paymentDueDay || '-'}</TableCell>
                                        <TableCell className="text-right py-5">
                                            {daysToPay !== null ? (
                                                <span className={cn("text-xs font-bold px-2 py-1 rounded-md", daysToPay <= 3 ? "bg-bad/20 text-bad" : "bg-primary/10 text-primary")}>
                                                    Faltan {daysToPay} días
                                                </span>
                                            ) : '-'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default function ReportsTab() {
  const { getIncomesByCategory, getExpensesByCategory, currentMonth } = useFinances();

  const incomeData = getIncomesByCategory(currentMonth);
  const expenseData = getExpensesByCategory(currentMonth);

  return (
    <div className="space-y-8">
        <PageHeader title="Reportes" description="Analiza resultados, tendencias, deuda y presupuestos sin mezclarlo con las tareas diarias." />

        <section className="space-y-4" aria-labelledby="results-analysis-title">
          <SectionHeader
            title={<span id="results-analysis-title">Resultado y comparación</span>}
            description="Qué ocurrió en el período y cómo se compara con el anterior."
          />
          <MonthlyResultChart />
          <MonthlyComparisonTable />
        </section>

        <section className="space-y-4" aria-labelledby="commitments-analysis-title">
          <SectionHeader
            title={<span id="commitments-analysis-title">Deuda y presupuestos</span>}
            description="Seguimiento de compromisos y límites registrados."
          />
          <CreditCardStatusReport />
          <BudgetStatusReport />
        </section>

        <section className="space-y-4" aria-labelledby="breakdowns-title">
          <SectionHeader
            title={<span id="breakdowns-title">Desgloses</span>}
            description="Dónde se concentraron tus ingresos y gastos."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BreakdownTable title="💰 Desglose de ingresos" data={incomeData} />
              <BreakdownTable title="💸 Desglose de gastos" data={expenseData} />
          </div>
          <ExpenseByTypeTable />
        </section>
    </div>
  );
}

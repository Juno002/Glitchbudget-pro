'use client';

import { useFinances } from "@/contexts/finance-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { formatCurrency, cn } from "@/lib/utils";
import { getCategoryInfo } from "@/lib/categories";
import { Progress } from "../ui/progress";
import { useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import CashFlowChart from "./charts/cash-flow-chart";

const BreakdownTable = ({ title, data }: { title: string, data: { name: string, value: number }[] }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent>
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
                            {data.length > 0 ? data.map(item => (
                                <TableRow key={item.name}>
                                    <TableCell>{getCategoryInfo(item.name)?.name || item.name}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                                    <TableCell className="text-right">{((item.value / total) * 100).toFixed(1)}%</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sin datos</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

const MonthlyComparisonTable = () => {
    const { getTotals, currentMonth } = useFinances();
    
    const { prevMonth, currentTotals, prevTotals } = useMemo(() => {
        const parts = currentMonth.split('-').map(Number);
        let py = parts[0], pm = parts[1] - 1;
        if (pm <= 0) { pm = 12; py -= 1; }
        const prevMonth = `${py}-${String(pm).padStart(2, '0')}`;

        const currentTotals = getTotals(currentMonth);
        const prevTotals = getTotals(prevMonth);
        
        return { prevMonth, currentTotals, prevTotals };
    }, [currentMonth, getTotals]);

    const [insight, setInsight] = useState<string | null>(null);

    useEffect(() => {
        setInsight(null); // Limpiar previo si se cambia el mes
        // Analizamos solo si de verdad hay data en ambos
        if (currentTotals.totalIncome > 0 && prevTotals.totalIncome > 0) {
            fetch('/api/ai-insight-monthly', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentMonth: {
                        income: currentTotals.totalIncome,
                        expenses: currentTotals.totalExpenses,
                        balance: currentTotals.balance,
                        available: currentTotals.available
                    },
                    previousMonth: {
                        income: prevTotals.totalIncome,
                        expenses: prevTotals.totalExpenses,
                        balance: prevTotals.balance,
                        available: prevTotals.available
                    }
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.insight) setInsight(data.insight);
            })
            .catch(() => {});
        }
    }, [currentTotals, prevTotals]);

    const rows = [
        { label: 'Ingresos', prev: prevTotals.totalIncome, curr: currentTotals.totalIncome },
        { label: 'Gastos', prev: prevTotals.totalExpenses, curr: currentTotals.totalExpenses },
        { label: 'Balance', prev: prevTotals.balance, curr: currentTotals.balance },
        { label: 'Disponible', prev: prevTotals.available, curr: currentTotals.available }
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>📊 Comparativa mensual</CardTitle>
                <CardDescription>Compara tus finanzas con el mes anterior.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead></TableHead>
                                <TableHead className="text-right">{prevMonth}</TableHead>
                                <TableHead className="text-right">{currentMonth}</TableHead>
                                <TableHead className="text-right">Diferencia</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map(row => {
                                const diff = (row.curr || 0) - (row.prev || 0);
                                const diffColor = diff > 0 ? 'text-green-600' : (diff < 0 ? 'text-red-600' : 'text-muted-foreground');
                                return (
                                    <TableRow key={row.label}>
                                        <TableCell>{row.label}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(row.prev)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(row.curr)}</TableCell>
                                        <TableCell className={cn("text-right font-semibold", diffColor)}>{diff >= 0 ? '+' : ''}{formatCurrency(diff)}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            {insight && (
                <div className="px-6 pb-6 pt-2">
                    <div className="flex items-start gap-2 animate-in fade-in duration-700 bg-[rgba(0,255,136,0.04)] border border-[rgba(0,255,136,0.12)] rounded-[14px] px-[14px] py-[10px]">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <p className="text-sm text-[rgba(255,255,255,0.5)] leading-relaxed font-medium">{insight}</p>
                    </div>
                </div>
            )}
        </Card>
    );
}

const ExpenseByTypeTable = () => {
    const { getExpensesByType, currentMonth } = useFinances();
    const data = getExpensesByType(currentMonth);

    return (
        <Card>
            <CardHeader><CardTitle>📊 Resumen por tipo de gasto</CardTitle></CardHeader>
            <CardContent>
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
                            {data.length > 0 ? data.map(item => (
                                <TableRow key={item.name}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.avg)}</TableCell>
                                    <TableCell className="text-right">{item.count}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sin datos</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

const BudgetStatusReport = () => {
    const { getBudgetStatusDetails, currentMonth } = useFinances();
    const budgetDetails = getBudgetStatusDetails(currentMonth).filter(b => b.limit > 0);

    const statusColors = {
        ok: 'bg-green-500',
        alert: 'bg-yellow-500',
        over: 'bg-red-500',
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>📝 Estado de Presupuestos</CardTitle>
                <CardDescription>Un resumen detallado del rendimiento de tus presupuestos para el mes.</CardDescription>
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
                                    <div className="flex items-center gap-1.5 text-xs font-medium">
                                        <span className={cn("h-2 w-2 rounded-full", statusColors[b.status as keyof typeof statusColors])}></span>
                                        <span className="capitalize">{b.status}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm mt-1">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Planificado</span>
                                        <span className="font-mono">{formatCurrency(b.limit)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Gastado</span>
                                        <span className="font-mono">{formatCurrency(b.spent)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Restante</span>
                                        <span className={cn("font-mono font-semibold", b.remaining < 0 ? "text-bad" : "")}>{formatCurrency(b.remaining)}</span>
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
                            No hay presupuestos configurados para este mes.
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
                                        <TableCell className="text-right py-5 font-mono text-base">{formatCurrency(b.limit)}</TableCell>
                                        <TableCell className="text-right py-5 font-mono text-base">{formatCurrency(b.spent)}</TableCell>
                                        <TableCell className={cn("text-right py-5 font-semibold font-mono text-base", b.remaining < 0 ? "text-bad" : "text-muted-foreground")}>
                                            {formatCurrency(b.remaining)}
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
                                            <div className="flex items-center gap-2">
                                                <span className={cn("h-2.5 w-2.5 rounded-full", statusColors[b.status as keyof typeof statusColors])}></span>
                                                <span className="capitalize font-medium">{b.status}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-lg">No hay presupuestos configurados para este mes.</TableCell>
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
                        const ccExpenses = (expenses || []).filter(e => e.debtId === debt.id).reduce((sum, e) => sum + e.amount, 0);
                        const ccPayments = (debtPayments || []).filter(p => p.debtId === debt.id).reduce((sum, p) => sum + p.amount, 0);
                        const currentDebt = ccExpenses - ccPayments;
                        const available = debt.principal - currentDebt;
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
                                            {formatCurrency(currentDebt)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Crédito Disp.</span>
                                        <span className="font-mono font-bold text-sm text-primary">
                                            {formatCurrency(available)}
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
                                const ccExpenses = (expenses || []).filter(e => e.debtId === debt.id).reduce((sum, e) => sum + e.amount, 0);
                                const ccPayments = (debtPayments || []).filter(p => p.debtId === debt.id).reduce((sum, p) => sum + p.amount, 0);
                                const currentDebt = ccExpenses - ccPayments;
                                const available = debt.principal - currentDebt;
                                const daysToPay = getDaysUntil(debt.paymentDueDay);

                                return (
                                    <TableRow key={debt.id}>
                                        <TableCell className="py-5 font-semibold text-base">{debt.name}</TableCell>
                                        <TableCell className={cn("text-right py-5 font-mono text-base font-bold", currentDebt > 0 ? "text-bad" : "text-good")}>
                                            {formatCurrency(currentDebt)}
                                        </TableCell>
                                        <TableCell className="text-right py-5 font-mono text-base text-primary">
                                            {formatCurrency(available)}
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
    <div className="space-y-6">
        <h2 className="text-2xl font-bold">Reportes</h2>
        <CashFlowChart />
        <MonthlyComparisonTable />
        <CreditCardStatusReport />
        <BudgetStatusReport />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BreakdownTable title="💰 Desglose de ingresos" data={incomeData} />
            <BreakdownTable title="💸 Desglose de gastos" data={expenseData} />
        </div>
        <ExpenseByTypeTable />
    </div>
  );
}

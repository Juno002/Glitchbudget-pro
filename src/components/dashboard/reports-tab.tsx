'use client';

import { useFinances } from "@/contexts/finance-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { formatCurrency, cn } from "@/lib/utils";
import { getCategoryInfo } from "@/lib/categories";
import { Progress } from "../ui/progress";
import { useMemo } from "react";
import TransactionHistoryClient from "../transactions/transaction-history-client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";

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
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Categoría</TableHead>
                                <TableHead className="text-right">Planificado</TableHead>
                                <TableHead className="text-right">Gastado</TableHead>
                                <TableHead className="text-right">Restante</TableHead>
                                <TableHead>Progreso</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {budgetDetails.length > 0 ? budgetDetails.map(b => {
                                const category = getCategoryInfo(b.categoryId);
                                const progress = b.limit > 0 ? Math.min((b.spent / b.limit) * 100, 100) : 0;
                                return (
                                    <TableRow key={b.categoryId}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            {category?.icon && <category.icon className="h-4 w-4 text-muted-foreground" />}
                                            {category?.name}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(b.limit)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(b.spent)}</TableCell>
                                        <TableCell className={cn("text-right font-semibold", b.remaining < 0 ? "text-destructive" : "text-muted-foreground")}>
                                            {formatCurrency(b.remaining)}
                                        </TableCell>
                                        <TableCell>
                                            <Progress 
                                                value={progress} 
                                                className={cn('h-2', 
                                                    b.status === 'over' ? '[&>div]:bg-destructive' :
                                                    b.status === 'alert' ? '[&>div]:bg-yellow-500' : ''
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("h-2 w-2 rounded-full", statusColors[b.status as keyof typeof statusColors])}></span>
                                                <span className="capitalize">{b.status}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">No hay presupuestos configurados para este mes.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}

export default function ReportsTab() {
  const { getIncomesByCategory, getExpensesByCategory, currentMonth } = useFinances();

  const incomeData = getIncomesByCategory(currentMonth);
  const expenseData = getExpensesByCategory(currentMonth);

  return (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold">Reportes</h2>
        <MonthlyComparisonTable />
        <BudgetStatusReport />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BreakdownTable title="💰 Desglose de ingresos" data={incomeData} />
            <BreakdownTable title="💸 Desglose de gastos" data={expenseData} />
        </div>
        <ExpenseByTypeTable />
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger>
                    <h3 className="text-lg font-semibold">Ver Historial de Movimientos</h3>
                </AccordionTrigger>
                <AccordionContent>
                    <TransactionHistoryClient />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
  );
}

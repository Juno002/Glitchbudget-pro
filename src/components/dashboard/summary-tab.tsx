'use client';

import { useFinances } from "@/contexts/finance-context";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useState } from "react";
import BudgetStatus from "./budget-status";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';

function formatMonth(date: string) {
  const d = new Date(`${date}-02`); // Use day 2 to avoid timezone issues
  return format(d, 'MMMM', { locale: es });
}

const Ring = ({ pct, ok = true }: { pct: number, ok?: boolean }) => (
  <div className="relative h-9 w-9">
    <svg viewBox="0 0 36 36" className="h-9 w-9">
      <path
        d="M18 2 a16 16 0 1 1 0 32 a16 16 0 1 1 0-32"
        fill="none"
        stroke="currentColor"
        className="text-slate-200 dark:text-slate-700"
        strokeWidth="4"
      />
      <path
        d="M18 2 a16 16 0 1 1 0 32 a16 16 0 1 1 0-32"
        fill="none"
        stroke="currentColor"
        className={ok ? "text-emerald-500" : "text-rose-500"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${pct} ${100 - pct}`}
        transform="rotate(-90 18 18)"
      />
    </svg>
  </div>
);


function Snapshot({
  totalIncome, totalExpenses, available, suggestedSave, savePct, loading
}: {
  totalIncome: number; totalExpenses: number; available: number; suggestedSave: number; savePct: number; loading: boolean
}) {
  const spendingPct = Math.min(100, Math.round((totalExpenses / Math.max(1, totalIncome)) * 100));
  const currentSavePct = Math.min(100, Math.round((suggestedSave / Math.max(1, totalIncome)) * 100));

  if (loading) {
      return (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
      )
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {/* Disponible */}
      <Card className="p-3">
        <CardContent className="p-0 flex items-center gap-3 min-w-0">
          <div className="shrink-0"><Ring pct={100} ok /></div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">Disponible</div>
            <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-500 truncate tabular-nums">{formatCurrency(available)}</div>
          </div>
          <Tooltip>
            <TooltipTrigger className="shrink-0 text-slate-400 text-sm">ℹ️</TooltipTrigger>
            <TooltipContent>Libre para gastar tras presupuestos, metas y colchón.</TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>

      {/* Ahorro sugerido */}
      <Card className="p-3">
        <CardContent className="p-0 flex items-center gap-3 min-w-0">
          <div className="shrink-0"><Ring pct={currentSavePct} ok /></div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">Ahorro sugerido</div>
            <div className="text-lg font-semibold text-amber-600 dark:text-amber-500 truncate tabular-nums">{formatCurrency(suggestedSave)}</div>
          </div>
          <Tooltip>
            <TooltipTrigger className="shrink-0 text-slate-400 text-sm">ℹ️</TooltipTrigger>
            <TooltipContent>
              Recomendación basada en {Math.round(savePct * 100)}% del ingreso, limitado por lo disponible.
            </TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>

      {/* Ingresos */}
      <Card className="p-3">
        <CardContent className="p-0 flex items-center gap-3 min-w-0">
          <div className="shrink-0"><Ring pct={100 - spendingPct} ok /></div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">Ingresos</div>
            <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-600 truncate tabular-nums">{formatCurrency(totalIncome)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Gastos */}
      <Card className="p-3">
        <CardContent className="p-0 flex items-center gap-3 min-w-0">
          <div className="shrink-0"><Ring pct={spendingPct} ok={spendingPct <= 70} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">Gastos</div>
            <div className="text-lg font-semibold text-rose-600 dark:text-rose-500 truncate tabular-nums">{formatCurrency(totalExpenses)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


const DonutChart = ({ data, title }: { data: { name: string, value: number }[], title: string }) => {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true) }, []);
    
    const COLORS = [
        'hsl(var(--chart-1))',
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))',
    ];
    
    if(!isClient) return <Skeleton className="h-64 w-full" />;

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="h-64 w-full">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <RechartsTooltip formatter={(value: number) => [formatCurrency(value), title]} />
                                <Legend />
                                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} labelLine={false} label>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">Sin datos para mostrar.</div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

const SaveStrategyChips = () => {
    const { savePct, updateSettings } = useFinances();
    return (
        <div className="flex gap-2 pt-2">
            {[
                {label:'Conservador 5%',  val:0.05},
                {label:'Estándar 10%',   val:0.10},
                {label:'Agresivo 20%',   val:0.20},
            ].map(opt => (
                <button key={opt.val}
                onClick={() => updateSettings({ savePct: opt.val })}
                className={`px-2 py-1 text-xs rounded border ${savePct===opt.val ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent' : 'border-slate-300 dark:border-slate-700'}`}>
                {opt.label}
                </button>
            ))}
        </div>
    )
}


export default function SummaryTab() {
  const { getTotals, getExpensesByCategory, getIncomesByCategory, loading, currentMonth, savePct } = useFinances();
  const [monthName, setMonthName] = useState('');

  useEffect(() => {
    setMonthName(formatMonth(currentMonth));
  }, [currentMonth]);

  const totals = getTotals(currentMonth);
  const expenseData = getExpensesByCategory(currentMonth);
  const incomeData = getIncomesByCategory(currentMonth);


  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Resumen de {monthName}</h2>
        </div>
        
        <Snapshot 
            totalIncome={totals.totalIncome}
            totalExpenses={totals.totalExpenses}
            available={totals.available}
            suggestedSave={totals.suggestedSave}
            savePct={savePct}
            loading={loading}
        />

        <SaveStrategyChips />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
            <DonutChart data={expenseData} title="Gastos" />
            <DonutChart data={incomeData} title="Ingresos" />
        </div>

        <BudgetStatus />
        
      </div>
    </TooltipProvider>
  );
}
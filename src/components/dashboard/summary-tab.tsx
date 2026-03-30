'use client';

import { useFinances } from "@/contexts/finance-context";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { playAIInsight } from '@/lib/sounds';
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useState } from "react";
import { motion } from 'framer-motion';
import BudgetStatus from "./budget-status";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1, y: 0, scale: 1,
      transition: { delay: i * 0.08, type: 'spring' as const, stiffness: 260, damping: 20 }
    }),
  };

  const cards = [
    { label: 'Disponible', value: available, color: 'text-emerald-600 dark:text-emerald-500', ring: <Ring pct={100} ok />, info: 'Libre para gastar tras presupuestos, metas y colchón.' },
    { label: 'Ahorro sugerido', value: suggestedSave, color: 'text-amber-600 dark:text-amber-500', ring: <Ring pct={currentSavePct} ok />, info: `Recomendación basada en ${Math.round(savePct * 100)}% del ingreso, limitado por lo disponible.` },
    { label: 'Ingresos', value: totalIncome, color: 'text-emerald-700 dark:text-emerald-600', ring: <Ring pct={100 - spendingPct} ok /> },
    { label: 'Gastos', value: totalExpenses, color: 'text-rose-600 dark:text-rose-500', ring: <Ring pct={spendingPct} ok={spendingPct <= 70} /> },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          custom={i}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <Card className="p-3 hover:shadow-lg hover:shadow-[rgba(0,255,136,0.04)] transition-shadow duration-300">
            <CardContent className="p-0 flex items-center gap-3 min-w-0">
              <div className="shrink-0">{card.ring}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{card.label}</div>
                <div className={`text-2xl font-semibold tabular-nums break-words leading-tight ${card.color}`}>{formatCurrency(card.value)}</div>
              </div>
              {card.info && (
                <Popover>
                  <PopoverTrigger className="shrink-0 text-slate-400 text-sm focus:outline-none">ℹ️</PopoverTrigger>
                  <PopoverContent>{card.info}</PopoverContent>
                </Popover>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}


function AmbientInsight({ totals, budgetStatus, currentMonth }: { totals: any, budgetStatus: any[], currentMonth: string }) {
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    // Only call if there are real financial data
    if (totals.totalIncome <= 0) return;

    let active = true;
    async function fetchInsight() {
      try {
        const selectedDate = new Date(`${currentMonth}-02`);
        const today = new Date();
        let daysLeft = 0;
        
        // Calculate days left only if we are in the current month
        if (selectedDate.getMonth() === today.getMonth() && selectedDate.getFullYear() === today.getFullYear()) {
          daysLeft = differenceInDays(endOfMonth(today), today);
        }

        const plannedBudgets = budgetStatus.map((b) => ({ 
          category: b.categoryId, 
          limit: b.limit / 100, 
          spent: b.spent / 100 
        }));
        
        const res = await fetch('/api/ai-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            income: totals.totalIncome / 100,
            expenses: totals.totalExpenses / 100,
            plannedBudgets,
            available: totals.available / 100,
            daysLeft
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (active && data.insight && data.insight.trim() !== 'NO_ALERT') {
            setInsight(data.insight);
            playAIInsight();
          }
        }
      } catch (e) {
        // Silently ignore errors
      }
    }

    // Small delay to avoid blocking render
    const timer = setTimeout(() => {
      fetchInsight();
    }, 500);

    return () => { 
      active = false; 
      clearTimeout(timer);
    };
  }, [totals.totalIncome, totals.totalExpenses, totals.available, currentMonth, budgetStatus]);

  if (!insight) return null;

  return (
    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-700 bg-amber-500/10 border border-amber-500/30 rounded-[14px] px-4 py-3 shadow-[0_4px_20px_rgba(245,158,11,0.1)]">
      <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0 animate-pulse" />
      <div className="flex-1 min-w-0">
        <h4 className="text-amber-500 font-semibold text-sm mb-0.5">Alerta de Gastos</h4>
        <p className="text-sm text-amber-200/80 leading-snug">{insight}</p>
      </div>
    </div>
  );
}


const DonutChart = ({ data, title, colors, delay = 0 }: { data: { name: string, value: number }[], title: string, colors?: string[], delay?: number }) => {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true) }, []);
    
    // Default palette if none provided
    const COLORS = colors || [
        'hsl(var(--chart-1))',
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))',
    ];
    
    if(!isClient) return <Skeleton className="h-64 w-full" />;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
        >
        <Card className="hover:shadow-lg hover:shadow-[rgba(0,255,136,0.04)] transition-shadow duration-300">
            <CardContent className="pt-6">
                <div className="h-64 w-full">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <RechartsTooltip 
                                    formatter={(value: number) => [formatCurrency(value), title]}
                                    contentStyle={{
                                        backgroundColor: 'rgba(10,10,20,0.9)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        backdropFilter: 'blur(12px)',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                    }}
                                    itemStyle={{ color: 'rgba(255,255,255,0.8)' }}
                                />
                                <Legend />
                                <Pie 
                                    data={data} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={80} 
                                    innerRadius={50} 
                                    labelLine={false}
                                    animationBegin={delay * 1000}
                                    animationDuration={800}
                                    animationEasing="ease-out"
                                >
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
        </motion.div>
    );
}

const SaveStrategyChips = () => {
    const { savePct, updateSettings } = useFinances();
    return (
        <div className="flex flex-wrap gap-2 pt-2">
            {[
                {label:'Ninguno 0%',  val:0.00},
                {label:'Conservador 5%',  val:0.05},
                {label:'Estándar 10%',   val:0.10},
                {label:'Agresivo 20%',   val:0.20},
            ].map(opt => {
                const isActive = Math.abs(savePct - opt.val) < 0.01;
                return (
                  <button key={opt.val}
                  onClick={() => updateSettings({ savePct: opt.val })}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-300 ${
                    isActive 
                      ? 'bg-[rgba(0,255,136,0.12)] border-[rgba(0,255,136,0.3)] text-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.1)]' 
                      : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[rgba(255,255,255,0.8)]'
                  }`}>
                  {opt.label}
                  </button>
                )
            })}
        </div>
    )
}


export default function SummaryTab() {
  const { getTotals, getExpensesByCategory, getIncomesByCategory, getBudgetStatusDetails, loading, currentMonth, savePct } = useFinances();
  const [monthName, setMonthName] = useState('');

  useEffect(() => {
    setMonthName(formatMonth(currentMonth));
  }, [currentMonth]);

  const totals = getTotals(currentMonth);
  const expenseData = getExpensesByCategory(currentMonth);
  const incomeData = getIncomesByCategory(currentMonth);
  const budgetStatus = getBudgetStatusDetails(currentMonth);


  return (
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
        
        {!loading && <AmbientInsight totals={totals} budgetStatus={budgetStatus} currentMonth={currentMonth} />}

        <SaveStrategyChips />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
            <DonutChart 
                data={expenseData} 
                title="Gastos" 
                colors={['#f43f5e', '#fb923c', '#fbbf24', '#a78bfa', '#f472b6']} 
            />
            <DonutChart 
                data={incomeData} 
                title="Ingresos" 
                colors={['#10b981', '#3b82f6', '#06b6d4', '#8b5cf6', '#14b8a6']} 
            />
        </div>

        <BudgetStatus />
        
      </div>
  );
}
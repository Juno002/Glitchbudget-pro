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
    { label: 'Disponible', value: available, color: 'text-emerald-600 dark:text-emerald-500', ring: <Ring pct={100} ok />, info: 'Libre para gastar tras presupuestos, metas y ahorro.' },
    { label: 'Ahorro', value: suggestedSave, color: 'text-amber-600 dark:text-amber-500', ring: <Ring pct={currentSavePct} ok />, info: `${Math.round(savePct * 100)}% del ingreso apartado como ahorro. Se resta del disponible.` },
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
        
        {/* Ambient AI Insight disabled internally */}

        <div className="pt-2">
            <SaveStrategyChips />
        </div>

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
'use client';

import { useState, useMemo } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { getCategoryInfo } from '@/lib/categories';
import { formatCurrency, cn } from '@/lib/utils';
import type { Expense, Income } from '@/lib/db';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Pin } from 'lucide-react';
import TransactionModal from './TransactionModal';

type UnifiedItem = {
  id: string;
  kind: 'income' | 'expense';
  label: string;         // concept or description
  amount: number;        // in cents
  categoryId: string;
  date: string;
  isFixed: boolean;
  raw: Expense | Income;
};

export default function MovementsView() {
  const { incomes, expenses, currentMonth, expenseCategories, incomeCategories } = useFinances();

  // Local filters
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [editingIncome, setEditingIncome] = useState<Income | undefined>();

  // Merge into unified list
  const items: UnifiedItem[] = useMemo(() => {
    const incomeItems: UnifiedItem[] = (incomes || [])
      .filter(i => i.month === filterMonth)
      .map(i => ({
        id: i.id,
        kind: 'income' as const,
        label: i.description || 'Ingreso',
        amount: i.amount,
        categoryId: i.categoryId,
        date: i.date,
        isFixed: false,
        raw: i,
      }));

    const expenseItems: UnifiedItem[] = (expenses || [])
      .filter(e => e.type === 'Fijo' || e.month === filterMonth)
      .map(e => ({
        id: e.id,
        kind: 'expense' as const,
        label: e.concept || 'Gasto',
        amount: e.amount,
        categoryId: e.categoryId,
        date: e.date,
        isFixed: e.type === 'Fijo',
        raw: e,
      }));

    let merged = [...incomeItems, ...expenseItems];

    // Apply filters
    if (filterType !== 'all') {
      merged = merged.filter(i => i.kind === filterType);
    }
    if (filterCategory !== 'all') {
      merged = merged.filter(i => i.categoryId === filterCategory);
    }

    // Sort: fixed first (pinned), then by date desc
    merged.sort((a, b) => {
      if (a.isFixed && !b.isFixed) return -1;
      if (!a.isFixed && b.isFixed) return 1;
      return b.date.localeCompare(a.date);
    });

    return merged;
  }, [incomes, expenses, filterMonth, filterType, filterCategory]);

  // Unique categories present in current data
  const presentCategories = useMemo(() => {
    const ids = new Set(items.map(i => i.categoryId));
    return Array.from(ids).map(id => getCategoryInfo(id)).filter(Boolean) as NonNullable<ReturnType<typeof getCategoryInfo>>[];
  }, [items]);

  const handleItemClick = (item: UnifiedItem) => {
    if (item.kind === 'expense') {
      setEditingExpense(item.raw as Expense);
      setEditingIncome(undefined);
    } else {
      setEditingIncome(item.raw as Income);
      setEditingExpense(undefined);
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingExpense(undefined);
    setEditingIncome(undefined);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Historial de Movimientos</h3>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-end">
        <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)} className="flex-1 min-w-[200px]">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="income">Ingresos</TabsTrigger>
            <TabsTrigger value="expense">Gastos</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {presentCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="w-auto"
        />
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <Card className="flex items-center justify-center p-8 text-muted-foreground text-sm">
          No hay movimientos para este periodo.
        </Card>
      ) : (
        <div className="space-y-1.5">
          {items.map(item => {
            const cat = getCategoryInfo(item.categoryId);
            const Icon = cat?.icon;
            const isIncome = item.kind === 'income';

            return (
              <button
                key={`${item.kind}-${item.id}`}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.04)] transition-colors text-left"
              >
                {/* Icon */}
                <div className={cn(
                  "shrink-0 flex items-center justify-center w-9 h-9 rounded-lg",
                  isIncome ? "bg-[rgba(0,255,136,0.08)]" : "bg-[rgba(255,45,120,0.08)]"
                )}>
                  {Icon && <Icon className={cn("h-4 w-4", isIncome ? "text-emerald-500" : "text-rose-500")} />}
                </div>

                {/* Label + Category */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.label}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="truncate">{cat?.name}</span>
                    {item.isFixed && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[10px] font-medium">
                        <Pin className="h-2.5 w-2.5" /> Fijo
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount + Date */}
                <div className="shrink-0 text-right">
                  <div className={cn(
                    "text-sm font-semibold tabular-nums",
                    isIncome ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {item.isFixed ? 'Recurrente' : new Date(item.date + 'T00:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      <TransactionModal
        open={modalOpen}
        onClose={closeModal}
        mode="edit"
        editingExpense={editingExpense}
        editingIncome={editingIncome}
      />
    </div>
  );
}

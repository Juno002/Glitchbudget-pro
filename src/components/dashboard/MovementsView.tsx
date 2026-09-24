'use client';

import { recordedExpenseForMonth as expenseForMonth } from '@/lib/finance-calculations';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useState, useMemo, useEffect } from 'react';
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
  kind: 'income' | 'expense' | 'transfer' | 'payment' | 'saving' | 'opening';
  detail?: string;
  label: string;         // concept or description
  amount: number;        // in cents
  categoryId: string;
  date: string;
  isFixed: boolean;
  raw?: Expense | Income;
};

export default function MovementsView() {
  const { incomes, expenses, currentMonth, debtPayments, debts, goalContributions, goals } = useFinances();

  const accountData = useLiveQuery(() => db.transaction('r', db.accounts, db.account_transfers, async () => ({ accounts: await db.accounts.toArray(), transfers: await db.account_transfers.toArray() })));
  const [detailItem, setDetailItem] = useState<UnifiedItem | null>(null);
  // Local filters
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'other'>('all');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  useEffect(() => { setFilterMonth(currentMonth); }, [currentMonth]);

  // Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [editingIncome, setEditingIncome] = useState<Income | undefined>();

  // Merge into unified list
  const periodItems: UnifiedItem[] = useMemo(() => {
    const incomeItems: UnifiedItem[] = (incomes || [])
      .filter(i => i.date.slice(0, 7) === filterMonth)
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
      .filter(e => expenseForMonth(e, filterMonth) > 0)
      .map(e => ({
        id: e.id,
        kind: 'expense' as const,
        label: e.concept || 'Gasto',
        amount: expenseForMonth(e, filterMonth),
        categoryId: e.categoryId,
        date: e.date,
        isFixed: e.type === 'Fijo',
        raw: e,
      }));

    const name = (id?: string) => accountData?.accounts.find(a => a.id === id)?.name || 'Sin cuenta';
    const others: UnifiedItem[] = [
      ...(accountData?.transfers || []).map(t => ({ id:t.id, kind:'transfer' as const, label:t.note || 'Transferencia', amount:t.amount, categoryId:'', date:t.date, isFixed:false, detail:name(t.fromAccountId)+' → '+name(t.toAccountId)+' · No es ingreso ni gasto.' })),
      ...(debtPayments || []).map(p => ({ id:p.id, kind:'payment' as const, label:'Pago de '+((debts || []).find(d=>d.id===p.debtId)?.name || 'tarjeta'), amount:p.amount, categoryId:'', date:p.date.slice(0,10), isFixed:false, detail:name(p.accountId)+' · Reduce el saldo y la deuda; no repite el gasto de la compra.' })),
      ...(goalContributions || []).map(c => ({ id:c.id, kind:'saving' as const, label:'Aporte a '+((goals || []).find(g=>g.id===c.goalId)?.name || 'meta'), amount:c.amount, categoryId:'', date:c.date.slice(0,10), isFixed:false, detail:'Reserva para una meta. No es un gasto ni una transferencia entre cuentas.' })),
      ...(accountData?.accounts || []).filter(a=>a.openingBalance!==0).map(a => ({ id:a.id, kind:'opening' as const, label:'Saldo inicial · '+a.name, amount:a.openingBalance, categoryId:'', date:a.startDate, isFixed:false, detail:'Dinero existente al iniciar el seguimiento. Se incluye en el saldo, no en los ingresos del mes.' })),
    ].filter(t => t.date.slice(0,7) === filterMonth);
    const merged = [...incomeItems, ...expenseItems, ...others];

    // Sort: fixed first (pinned), then by date desc
    merged.sort((a, b) => {
      return b.date.localeCompare(a.date);
    });

    return merged;
  }, [incomes, expenses, filterMonth, accountData, debtPayments, debts, goalContributions, goals]);

  const items = useMemo(() => periodItems.filter(i =>
    (filterType === 'all' || i.kind === filterType || (filterType === 'other' && i.kind !== 'income' && i.kind !== 'expense')) && (filterCategory === 'all' || i.categoryId === filterCategory) && (i.label+' '+(i.detail || '')).toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))
  ), [periodItems, filterType, filterCategory, search]);

  // Unique categories present in current data
  const presentCategories = useMemo(() => {
    const ids = new Set(periodItems.map(i => i.categoryId));
    return Array.from(ids).map(id => getCategoryInfo(id)).filter(Boolean) as NonNullable<ReturnType<typeof getCategoryInfo>>[];
  }, [periodItems]);

  useEffect(() => {
    if (filterCategory !== 'all' && !presentCategories.some(c => c.id === filterCategory)) setFilterCategory('all');
  }, [presentCategories, filterCategory]);

  const handleItemClick = (item: UnifiedItem) => {
    if (item.kind !== 'income' && item.kind !== 'expense') { setDetailItem(item); return; }
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

      <Input aria-label="Buscar movimientos" placeholder="Buscar movimientos…" value={search} onChange={e => setSearch(e.target.value)} />
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)} className="w-full sm:flex-1">
          <TabsList className="flex w-full overflow-x-auto gap-1 no-scrollbar justify-start border bg-black/5 dark:bg-white/5 p-1 rounded-xl">
            <TabsTrigger className="flex-1 whitespace-nowrap" value="all">Todos</TabsTrigger>
            <TabsTrigger className="flex-1 whitespace-nowrap" value="income">Ingresos</TabsTrigger>
            <TabsTrigger className="flex-1 whitespace-nowrap" value="expense">Gastos</TabsTrigger>
            <TabsTrigger className="flex-1 whitespace-nowrap" value="other">Otros</TabsTrigger>
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
          aria-label="Mes del historial"
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
            const neutral = item.kind !== 'income' && item.kind !== 'expense';

            return (
              <button
                key={`${item.kind}-${item.id}`}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
              >
                {/* Icon */}
                <div className={cn(
                  "shrink-0 flex items-center justify-center w-9 h-9 rounded-lg",
                  isIncome ? "bg-good/10" : "bg-bad/10"
                )}>
                  {Icon && <Icon strokeWidth={1.75} className={cn("h-4 w-4", isIncome ? "text-good" : "text-bad")} />}
                </div>

                {/* Label + Category */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.label}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="truncate">{item.detail || cat?.name}{item.kind === 'expense' && (item.raw as Expense)?.paymentMethod === 'credit' ? ' · Tarjeta' : ''}</span>
                    {item.isFixed && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[10px] font-medium">
                        <Pin className="h-2.5 w-2.5" /> Fijo
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount + Date */}
                <div className="shrink-0 text-right">
                  <div className={cn(
                    "text-sm font-semibold tabular-nums",
                    neutral ? 'text-foreground' : isIncome ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {neutral ? '' : isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(item.date + 'T00:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!detailItem} onOpenChange={open => { if (!open) setDetailItem(null); }}><DialogContent><DialogHeader><DialogTitle>{detailItem?.label}</DialogTitle><DialogDescription>{detailItem?.detail}</DialogDescription></DialogHeader><p>{formatCurrency(detailItem?.amount || 0)} · {detailItem?.date}</p>{detailItem?.kind === 'transfer' && <p className="text-sm text-muted-foreground">Puedes editar la transferencia en Mi dinero hoy, abriendo la cuenta de origen o destino.</p>}</DialogContent></Dialog>
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

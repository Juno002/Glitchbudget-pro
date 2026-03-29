'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { getCategoryInfo } from '@/lib/categories';
import { formatCurrency, cn } from '@/lib/utils';
import type { Expense, Income } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Grid3X3, CalendarDays, SlidersHorizontal, Trash2 } from 'lucide-react';
import { playAIInsight } from '@/lib/sounds';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'new' | 'edit';
  editingExpense?: Expense;
  editingIncome?: Income;
}

type TransactionType = 'income' | 'expense';

export default function TransactionModal({ open, onClose, mode, editingExpense, editingIncome }: TransactionModalProps) {
  const {
    addExpense, updateExpense, deleteExpense,
    addIncomeItem, updateIncomeItem, deleteIncomeItem,
    expenseCategories, incomeCategories,
    strictMode, getTotals, currentMonth, getBudgetStatusDetails,
  } = useFinances();

  // --- State ---
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseSubtype, setExpenseSubtype] = useState<'Fijo' | 'Variable' | 'Ocasional'>('Variable');
  const [incomeSubtype, setIncomeSubtype] = useState<'extra' | 'gift'>('extra');
  const [frequency, setFrequency] = useState<'mensual' | 'quincenal' | 'semanal'>('mensual');

  // AI insight state
  const [insight, setInsight] = useState<string | null>(null);
  const [isFetchingInsight, setIsFetchingInsight] = useState(false);
  const [saved, setSaved] = useState(false);
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Popover toggles
  const [typeOpen, setTypeOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [subtypeOpen, setSubtypeOpen] = useState(false);

  const dateInputRef = useRef<HTMLInputElement>(null);

  const isEditing = mode === 'edit';

  // Reset state on open
  useEffect(() => {
    if (!open) {
      // Cleanup on close
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
      setSaved(false);
      setInsight(null);
      setIsFetchingInsight(false);
      return;
    }

    if (mode === 'edit' && editingExpense) {
      setTxType('expense');
      setAmount(String(editingExpense.amount / 100));
      setCategoryId(editingExpense.categoryId);
      setConcept(editingExpense.concept);
      setDate(editingExpense.date);
      setExpenseSubtype(editingExpense.type);
      setFrequency(editingExpense.frequency || 'mensual');
    } else if (mode === 'edit' && editingIncome) {
      setTxType('income');
      setAmount(String(editingIncome.amount / 100));
      setCategoryId(editingIncome.categoryId);
      setConcept(editingIncome.description);
      setDate(editingIncome.date);
      setIncomeSubtype(editingIncome.type);
    } else {
      setTxType('expense');
      setAmount('');
      setCategoryId('');
      setConcept('');
      setDate(new Date().toISOString().slice(0, 10));
      setExpenseSubtype('Variable');
      setIncomeSubtype('extra');
      setFrequency('mensual');
    }
    setSaved(false);
    setInsight(null);
  }, [open, mode, editingExpense, editingIncome]);

  const categories = useMemo(() => {
    const ids = txType === 'income' ? incomeCategories : expenseCategories;
    return ids.map(id => getCategoryInfo(id)).filter(Boolean) as NonNullable<ReturnType<typeof getCategoryInfo>>[];
  }, [txType, incomeCategories, expenseCategories]);

  const selectedCat = getCategoryInfo(categoryId);
  const canSave = Number(amount) > 0 && categoryId && !saved;

  // --- AI Insight fetch ---
  const fetchInsight = async (numAmount: number) => {
    setIsFetchingInsight(true);
    try {
      const budgets = getBudgetStatusDetails(currentMonth);
      const budget = budgets.find(b => b.categoryId === categoryId);
      const catInfo = getCategoryInfo(categoryId);
      const { available } = getTotals(currentMonth);

      const res = await fetch('/api/ai-insight-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: concept || catInfo?.name || categoryId,
          amount: numAmount,
          category: catInfo?.name || categoryId,
          budgetForCategory: budget ? { limit: budget.limit / 100, spent: budget.spent / 100 } : null,
          available: (available - numAmount * 100) / 100,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.insight) {
          setInsight(data.insight);
          playAIInsight();
        }
      }
    } catch { /* silent */ }
    finally { setIsFetchingInsight(false); }
  };

  // --- Save ---
  const handleSave = async () => {
    const numAmount = Number(amount);
    if (numAmount <= 0 || !categoryId) return;

    // Strict mode check (only for new expenses)
    if (!isEditing && txType === 'expense' && strictMode) {
      const { available } = getTotals(currentMonth);
      if (numAmount * 100 > available) {
        // Can't use toast here directly, but addExpense won't be called
        // The context's own strict mode toast won't fire since we block here
        // We need to show feedback — use the insight area
        setInsight('⚠️ Modo estricto: el monto excede tu saldo disponible. Reduce el monto o desactiva el modo estricto en configuración.');
        return;
      }
    }

    if (isEditing) {
      if (editingExpense) {
        updateExpense({
          ...editingExpense,
          concept,
          amount: numAmount,
          categoryId,
          date,
          type: expenseSubtype,
          frequency: expenseSubtype === 'Fijo' ? frequency : undefined,
        });
      } else if (editingIncome) {
        updateIncomeItem({
          ...editingIncome,
          description: concept,
          amount: numAmount,
          categoryId,
          date,
          type: incomeSubtype,
        });
      }
      onClose();
      return;
    }

    // New mode
    if (txType === 'expense') {
      addExpense({
        concept,
        amount: numAmount,
        categoryId,
        date,
        type: expenseSubtype,
        frequency: expenseSubtype === 'Fijo' ? frequency : undefined,
      });
    } else {
      addIncomeItem({
        description: concept,
        amount: numAmount,
        categoryId,
        date,
        type: incomeSubtype,
      });
    }

    setSaved(true);

    // Fetch AI insight for expenses
    if (txType === 'expense') {
      await fetchInsight(numAmount);
    }

    // Auto-close after delay
    autoCloseTimer.current = setTimeout(() => {
      onClose();
    }, txType === 'expense' ? 5000 : 1500);
  };

  const handleDelete = () => {
    if (editingExpense) deleteExpense(editingExpense.id);
    else if (editingIncome) deleteIncomeItem(editingIncome.id);
    onClose();
  };

  // --- Toolbar item component ---
  const ToolbarItem = ({ icon, label, active, children, popoverOpen, setPopoverOpen }: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    children: React.ReactNode;
    popoverOpen: boolean;
    setPopoverOpen: (open: boolean) => void;
  }) => (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button className={cn(
          "flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-colors text-xs",
          active ? "text-[#00ff88]" : "text-muted-foreground hover:text-foreground"
        )}>
          {icon}
          <span className="truncate max-w-[70px]">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="center">
        {children}
      </PopoverContent>
    </Popover>
  );

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{isEditing ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
        </DialogHeader>

        {/* Hero Amount Card */}
        <div className={cn(
          "px-6 py-8 flex flex-col items-center gap-2 transition-colors",
          txType === 'expense'
            ? "bg-[rgba(255,45,120,0.08)]"
            : "bg-[rgba(0,255,136,0.08)]"
        )}>
          <label className="text-xs text-muted-foreground">
            {saved ? (txType === 'expense' ? 'Gasto registrado' : 'Ingreso registrado') : (isEditing ? 'Editando' : 'Nuevo movimiento')}
          </label>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-lg font-medium",
              txType === 'expense' ? "text-rose-400" : "text-emerald-400"
            )}>RD$</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={saved}
              placeholder="0.00"
              className={cn(
                "bg-transparent border-none outline-none text-center font-bold tabular-nums w-[180px]",
                "text-4xl",
                txType === 'expense' ? "text-rose-400 placeholder:text-rose-400/30" : "text-emerald-400 placeholder:text-emerald-400/30"
              )}
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex border-b border-[rgba(255,255,255,0.06)] px-2">
          {/* Type selector */}
          <ToolbarItem
            icon={txType === 'expense'
              ? <TrendingDown className="h-5 w-5 text-rose-500" />
              : <TrendingUp className="h-5 w-5 text-emerald-500" />
            }
            label={txType === 'expense' ? 'Gasto' : 'Ingreso'}
            active
            popoverOpen={typeOpen}
            setPopoverOpen={setTypeOpen}
          >
            <div className="flex flex-col gap-1 min-w-[120px]">
              <button
                onClick={() => { setTxType('expense'); setCategoryId(''); setTypeOpen(false); }}
                className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  txType === 'expense' ? "bg-[rgba(255,45,120,0.1)] text-rose-400" : "hover:bg-[rgba(255,255,255,0.04)]"
                )}
              >
                <TrendingDown className="h-4 w-4" /> Gasto
              </button>
              <button
                onClick={() => { setTxType('income'); setCategoryId(''); setTypeOpen(false); }}
                className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  txType === 'income' ? "bg-[rgba(0,255,136,0.1)] text-emerald-400" : "hover:bg-[rgba(255,255,255,0.04)]"
                )}
              >
                <TrendingUp className="h-4 w-4" /> Ingreso
              </button>
            </div>
          </ToolbarItem>

          {/* Category selector */}
          <ToolbarItem
            icon={selectedCat ? <selectedCat.icon className="h-5 w-5" /> : <Grid3X3 className="h-5 w-5" />}
            label={selectedCat?.name || 'Categoría'}
            active={!!categoryId}
            popoverOpen={catOpen}
            setPopoverOpen={setCatOpen}
          >
            <div className="grid grid-cols-3 gap-1.5 max-h-[240px] overflow-y-auto min-w-[220px]">
              {categories.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setCategoryId(cat.id); setCatOpen(false); }}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] transition-colors",
                      categoryId === cat.id
                        ? "bg-[rgba(0,255,136,0.1)] text-[#00ff88]"
                        : "hover:bg-[rgba(255,255,255,0.06)]"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="truncate w-full text-center">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </ToolbarItem>

          {/* Date — uses ref to trigger native picker */}
          <button
            type="button"
            onClick={() => {
              const el = dateInputRef.current;
              if (el) {
                try { el.showPicker(); } catch { el.focus(); }
              }
            }}
            className="flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-colors text-xs text-muted-foreground hover:text-foreground relative"
          >
            <CalendarDays className="h-5 w-5" />
            <span className="truncate max-w-[70px]">{formattedDate}</span>
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              onChange={(e) => { if (e.target.value) setDate(e.target.value); }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 opacity-0 pointer-events-none"
              tabIndex={-1}
            />
          </button>

          {/* Subtype selector */}
          <ToolbarItem
            icon={<SlidersHorizontal className="h-5 w-5" />}
            label={txType === 'expense' ? expenseSubtype : (incomeSubtype === 'extra' ? 'Extra' : 'Regalo')}
            popoverOpen={subtypeOpen}
            setPopoverOpen={setSubtypeOpen}
          >
            <div className="flex flex-col gap-1 min-w-[130px]">
              {txType === 'expense' ? (
                <>
                  {(['Variable', 'Ocasional', 'Fijo'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => { setExpenseSubtype(t); setSubtypeOpen(false); }}
                      className={cn("px-3 py-2 rounded-lg text-sm text-left transition-colors",
                        expenseSubtype === t ? "bg-[rgba(255,255,255,0.08)]" : "hover:bg-[rgba(255,255,255,0.04)]"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                  {expenseSubtype === 'Fijo' && (
                    <div className="border-t border-[rgba(255,255,255,0.06)] mt-1 pt-1">
                      {(['mensual', 'quincenal', 'semanal'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => { setFrequency(f); setSubtypeOpen(false); }}
                          className={cn("px-3 py-1.5 rounded-lg text-xs w-full text-left transition-colors capitalize",
                            frequency === f ? "bg-[rgba(255,255,255,0.08)]" : "hover:bg-[rgba(255,255,255,0.04)]"
                          )}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setIncomeSubtype('extra'); setSubtypeOpen(false); }}
                    className={cn("px-3 py-2 rounded-lg text-sm text-left transition-colors",
                      incomeSubtype === 'extra' ? "bg-[rgba(255,255,255,0.08)]" : "hover:bg-[rgba(255,255,255,0.04)]"
                    )}
                  >
                    Adicional
                  </button>
                  <button
                    onClick={() => { setIncomeSubtype('gift'); setSubtypeOpen(false); }}
                    className={cn("px-3 py-2 rounded-lg text-sm text-left transition-colors",
                      incomeSubtype === 'gift' ? "bg-[rgba(255,255,255,0.08)]" : "hover:bg-[rgba(255,255,255,0.04)]"
                    )}
                  >
                    Regalo / Otro
                  </button>
                </>
              )}
            </div>
          </ToolbarItem>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3">
          {/* Concept input */}
          {!saved && (
            <Input
              placeholder={txType === 'expense' ? 'Concepto (opcional)' : 'Descripción (opcional)'}
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="h-11"
            />
          )}

          {/* Action buttons */}
          {!saved && (
            <div className="flex gap-2">
              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-rose-500 border-rose-500/30 hover:bg-rose-500/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertTitle>¿Eliminar este registro?</AlertTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button
                className={cn(
                  "flex-1 h-12 text-base font-semibold transition-all",
                  txType === 'expense'
                    ? "bg-[rgba(255,45,120,0.12)] border border-[rgba(255,45,120,0.3)] text-[rgba(255,45,120,0.9)] hover:bg-[rgba(255,45,120,0.2)]"
                    : "bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]"
                )}
                disabled={!canSave}
                onClick={handleSave}
              >
                {isEditing ? 'Guardar Cambios' : (txType === 'expense' ? 'Crear Gasto' : 'Crear Ingreso')}
              </Button>
            </div>
          )}

          {/* AI Insight / Strict mode warning */}
          {isFetchingInsight && (
            <div className="flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 bg-[rgba(0,255,136,0.04)] border border-[rgba(0,255,136,0.12)] rounded-[14px] px-[14px] py-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm text-[rgba(255,255,255,0.5)] italic">Analizando impacto...</p>
            </div>
          )}

          {insight && !isFetchingInsight && (
            <div className="flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2 duration-700 bg-[rgba(0,255,136,0.04)] border border-[rgba(0,255,136,0.12)] rounded-[14px] px-[14px] py-[10px]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <p className="text-sm text-[rgba(255,255,255,0.5)] leading-snug">{insight}</p>
            </div>
          )}

          {/* Post-save confirmation */}
          {saved && !insight && !isFetchingInsight && (
            <div className="flex items-center justify-center py-4 animate-in fade-in duration-300">
              <p className="text-sm text-muted-foreground">
                {txType === 'expense' ? '✅ Gasto registrado' : '✅ Ingreso registrado'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

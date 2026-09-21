'use client';

import { AccountSelect } from './account-select';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { getCategoryInfo } from '@/lib/categories';
import { formatCurrency, cn } from '@/lib/utils';
import type { Expense, Income } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Grid3X3, CalendarDays, SlidersHorizontal, Trash2, CreditCard, Banknote } from 'lucide-react';
import { localDate, isValidDate } from '@/lib/finance-calculations';
import { motion, AnimatePresence } from 'framer-motion';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'new' | 'edit';
  editingExpense?: Expense;
  editingIncome?: Income;
}

type TransactionType = 'income' | 'expense';

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
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
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


export default function TransactionModal({ open, onClose, mode, editingExpense, editingIncome }: TransactionModalProps) {
  const {
    addExpense, updateExpense, deleteExpense,
    addIncomeItem, updateIncomeItem, deleteIncomeItem,
    expenseCategories, incomeCategories,
    debts: allDebts,
  } = useFinances();

  const debts = allDebts?.filter(d => d.status === 'active' && d.type === 'credit_card');
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  // --- State ---
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(localDate());
  const [expenseSubtype, setExpenseSubtype] = useState<'Fijo' | 'Variable' | 'Ocasional'>('Variable');
  const [incomeSubtype, setIncomeSubtype] = useState<'extra' | 'gift'>('extra');
  const [frequency, setFrequency] = useState<'mensual' | 'quincenal' | 'semanal'>('mensual');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [debtId, setDebtId] = useState('');
  const [accountId, setAccountId] = useState('');

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

    setAccountId(editingExpense?.accountId || editingIncome?.accountId || '');
    if (mode === 'edit' && editingExpense) {
      setTxType('expense');
      setAmount(String(editingExpense.amount / 100));
      setCategoryId(editingExpense.categoryId);
      setConcept(editingExpense.concept);
      setDate(editingExpense.date);
      setExpenseSubtype(editingExpense.type);
      setFrequency(editingExpense.frequency || 'mensual');
      setPaymentMethod(editingExpense.paymentMethod || 'cash');
      setDebtId(editingExpense.debtId || '');
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
      setDate(localDate());
      setExpenseSubtype('Variable');
      setIncomeSubtype('extra');
      setFrequency('mensual');
      setPaymentMethod('cash');
      setDebtId('');
    }
    setSaved(false);
    setInsight(null);
  }, [open, mode, editingExpense, editingIncome]);

  const categories = useMemo(() => {
    const ids = txType === 'income' ? incomeCategories : expenseCategories;
    return ids.map(id => getCategoryInfo(id)).filter(Boolean) as NonNullable<ReturnType<typeof getCategoryInfo>>[];
  }, [txType, incomeCategories, expenseCategories]);

  const selectedCat = categoryId ? getCategoryInfo(categoryId) : undefined;
  const canSave = Number.isFinite(Number(amount)) && Number(amount) >= 0.01 && categoryId && isValidDate(date) && !saved && !isSaving && (txType !== 'expense' || paymentMethod !== 'credit' || !!debtId);

  const handleSave = async () => {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setInsight(null);
    try {
      const numAmount = Number(amount);
      let success: boolean;
      if (txType === 'expense') {
        const fields = {
          accountId: accountId || undefined, concept, amount: numAmount, categoryId, date, type: expenseSubtype,
          frequency: expenseSubtype === 'Fijo' ? frequency : undefined,
          paymentMethod, debtId: paymentMethod === 'credit' ? debtId : undefined,
        };
        success = editingExpense
          ? await updateExpense({ ...editingExpense, ...fields })
          : await addExpense(fields);
      } else {
        const fields = { accountId: accountId || undefined, description: concept, amount: numAmount, categoryId, date, type: incomeSubtype };
        success = editingIncome
          ? await updateIncomeItem({ ...editingIncome, ...fields })
          : await addIncomeItem(fields);
      }
      if (!success) {
        setInsight('No se guardó el movimiento. Revisa el aviso y corrige los datos; el formulario conserva lo que escribiste.');
        return;
      }
      setSaved(true);
      autoCloseTimer.current = setTimeout(onClose, 900);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const success = editingExpense ? await deleteExpense(editingExpense.id)
        : editingIncome ? await deleteIncomeItem(editingIncome.id) : false;
      if (success) onClose();
      else setInsight('No se pudo eliminar el movimiento. Inténtalo de nuevo.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !savingRef.current) onClose(); }}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogDescription>Completa el monto, la categoría y la fecha del movimiento.</DialogDescription>
          <DialogTitle>{isEditing ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
        </DialogHeader>

        <fieldset disabled={isSaving || saved} className="contents">
        {/* Hero Amount Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
          className={cn(
            "px-6 py-8 flex flex-col items-center gap-2 transition-colors",
            txType === 'expense'
              ? "bg-[hsl(var(--bad)_/_0.08)]"
              : "bg-[hsl(var(--primary)_/_0.08)]"
          )}
        >
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
              aria-label="Monto"
              min="0.01"
              step="0.01"
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
        </motion.div>

        {/* Toolbar */}
        <div className="flex border-b border-black/10 dark:border-white/10 px-2">
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
                disabled={isEditing}
                onClick={() => { setTxType('expense'); setCategoryId(''); setTypeOpen(false); }}
                className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  txType === 'expense' ? "bg-[hsl(var(--bad)_/_0.1)] text-rose-400" : "hover:bg-black/10 dark:hover:bg-white/10"
                )}
              >
                <TrendingDown className="h-4 w-4" /> Gasto
              </button>
              <button
                disabled={isEditing}
                onClick={() => { setTxType('income'); setCategoryId(''); setTypeOpen(false); }}
                className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  txType === 'income' ? "bg-primary/10 text-emerald-400" : "hover:bg-black/10 dark:hover:bg-white/10"
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
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-black/10 dark:bg-white/10"
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
              aria-label="Fecha del movimiento"
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
                        expenseSubtype === t ? "bg-[rgba(255,255,255,0.08)]" : "hover:bg-black/10 dark:hover:bg-white/10"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                  {expenseSubtype === 'Fijo' && (
                    <div className="border-t border-black/10 dark:border-white/10 mt-1 pt-1">
                      {(['mensual', 'quincenal', 'semanal'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => { setFrequency(f); setSubtypeOpen(false); }}
                          className={cn("px-3 py-1.5 rounded-lg text-xs w-full text-left transition-colors capitalize",
                            frequency === f ? "bg-[rgba(255,255,255,0.08)]" : "hover:bg-black/10 dark:hover:bg-white/10"
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
                      incomeSubtype === 'extra' ? "bg-[rgba(255,255,255,0.08)]" : "hover:bg-black/10 dark:hover:bg-white/10"
                    )}
                  >
                    Adicional
                  </button>
                  <button
                    onClick={() => { setIncomeSubtype('gift'); setSubtypeOpen(false); }}
                    className={cn("px-3 py-2 rounded-lg text-sm text-left transition-colors",
                      incomeSubtype === 'gift' ? "bg-[rgba(255,255,255,0.08)]" : "hover:bg-black/10 dark:hover:bg-white/10"
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
          
          {/* Payment Method Selector (Only when there are debts and it's an expense) */}
          {!saved && txType === 'expense' && debts && debts.length > 0 && (
            <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.03)] border border-black/10 dark:border-white/10 rounded-lg p-1">
               <button
                 type="button"
                 className={cn("flex-1 flex gap-2 items-center justify-center text-xs py-2 rounded-md transition-colors", paymentMethod === 'cash' ? "bg-black/10 dark:bg-white/10 text-foreground shadow-sm" : "hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground")}
                 onClick={() => { setPaymentMethod('cash'); setDebtId(''); }}
               >
                 <Banknote className="h-4 w-4" /> Efectivo / banco
               </button>
               
               {/* Dropdown for credit cards if more than 1, otherwise just a button */}
               {debts.length === 1 ? (
                 <button
                   type="button"
                   className={cn("flex-1 flex gap-2 items-center justify-center text-xs py-2 rounded-md transition-colors", paymentMethod === 'credit' ? "bg-black/10 dark:bg-white/10 text-foreground shadow-sm" : "hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground")}
                   onClick={() => { setPaymentMethod('credit'); setDebtId(debts[0].id); }}
                 >
                   <CreditCard className="h-4 w-4" /> Tarjeta
                 </button>
               ) : (
                 <Popover>
                   <PopoverTrigger asChild>
                     <button
                       type="button"
                       className={cn("flex-1 flex gap-2 items-center justify-center text-xs py-2 rounded-md transition-colors", paymentMethod === 'credit' ? "bg-black/10 dark:bg-white/10 text-foreground shadow-sm" : "hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground")}
                     >
                       <CreditCard className="h-4 w-4" /> {paymentMethod === 'credit' && debtId ? debts.find(d => d.id === debtId)?.name || 'Tarjeta' : 'Pagar con Tarjeta'}
                     </button>
                   </PopoverTrigger>
                   <PopoverContent className="w-56 p-1" align="end">
                     <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 border-b border-black/10 dark:border-white/10 mb-1">Elige una tarjeta</div>
                     <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto">
                       {debts.map(d => (
                         <button
                           key={d.id}
                           type="button"
                           className={cn("text-left px-2 py-2 text-sm rounded-md transition-colors flex items-center gap-2", paymentMethod === 'credit' && debtId === d.id ? "bg-primary/10 text-emerald-400" : "hover:bg-black/10 dark:bg-white/10 text-foreground")}
                           onClick={() => { setPaymentMethod('credit'); setDebtId(d.id); }}
                         >
                           <CreditCard className="h-4 w-4" /> {d.name}
                         </button>
                       ))}
                     </div>
                   </PopoverContent>
                 </Popover>
               )}
            </div>
          )}

          {!saved && (txType === 'income' || paymentMethod !== 'credit') && <AccountSelect value={accountId} onChange={setAccountId} label={txType === 'income' ? 'Cuenta de destino' : 'Cuenta de origen'} disabled={isSaving} />}
          {/* Concept input */}
          {!saved && (
            <Input
              aria-label={txType === 'expense' ? 'Concepto' : 'Descripción'}
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
                    <Button aria-label="Eliminar movimiento" variant="outline" size="sm" className="text-rose-500 border-rose-500/30 hover:bg-rose-500/10">
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
              <motion.div className="flex-1" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}>
              <Button
                className={cn(
                  "flex-1 h-12 text-base font-semibold transition-all w-full",
                  txType === 'expense'
                    ? "bg-[hsl(var(--bad)_/_0.12)] border border-[hsl(var(--bad)_/_0.3)] text-[hsl(var(--bad)_/_0.9)] hover:bg-[hsl(var(--bad)_/_0.2)]"
                    : "bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20"
                )}
                disabled={!canSave}
                onClick={handleSave}
              >
                {isSaving ? 'Guardando…' : isEditing ? 'Guardar Cambios' : (txType === 'expense' ? 'Crear Gasto' : 'Crear Ingreso')}
              </Button>
              </motion.div>
            </div>
          )}

          {insight && <p role="alert" className="text-sm text-destructive">{insight}</p>}

          {/* Post-save confirmation */}
          {saved && !insight && !isFetchingInsight && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 20 }}
              className="flex items-center justify-center py-4"
            >
              <p className="text-sm text-muted-foreground">
                {txType === 'expense' ? '✅ Gasto registrado' : '✅ Ingreso registrado'}
              </p>
            </motion.div>
          )}
        </div>
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}

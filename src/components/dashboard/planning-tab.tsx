'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';
import { Wallet, Info, CheckCircle2, Loader2, ArrowRightLeft, Plus } from 'lucide-react';
import { getCategoryInfo } from '@/lib/categories';
import { Skeleton } from '../ui/skeleton';
import ExpenseCategoryManager from './expense-category-manager';
import TransferDialog from './transfer-dialog';
import GoalsManager from './goals-manager';
import IncomeCategoryManager from './income-category-manager';
import SubscriptionsManager from './subscriptions-manager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { playIncome } from '@/lib/sounds';
import { motion, AnimatePresence } from 'framer-motion';

// --- Compact Budget Item with Auto-Save ---
function BudgetItem({ categoryId, currentPlan, spent, onSave }: { 
  categoryId: string;
  currentPlan: number;
  spent: number;
  onSave: (val: number) => Promise<void>;
}) {
  const category = getCategoryInfo(categoryId);
  const [inputValue, setInputValue] = useState(String(currentPlan / 100));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync if external changes happen
  useEffect(() => {
    if (status === 'idle') {
      setInputValue(String(currentPlan / 100));
    }
  }, [currentPlan, status]);

  if (!category) return null;

  const handleSave = async (valStr: string) => {
    const num = parseFloat(valStr) || 0;
    if (num * 100 === currentPlan) return; // No change

    setStatus('saving');
    await onSave(num);
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 2000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setStatus('idle');
    
    // Optional: Auto-save on stop typing (debounce)
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
       handleSave(e.target.value);
    }, 1000);
  };

  const handleBlur = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    handleSave(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const plan = currentPlan;
  const left = Math.max(0, plan - spent);
  const pct = plan ? Math.min(100, Math.round((spent / plan) * 100)) : 0;
  const over = plan > 0 && spent > plan;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-md",
        over ? "border-amber-500/30 bg-amber-500/5 hover:shadow-amber-500/10" : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.12)] hover:shadow-[rgba(0,255,136,0.04)]"
    )}>
      {/* Category Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
            "shrink-0 flex items-center justify-center w-10 h-10 rounded-lg",
            over ? "bg-amber-500/20 text-amber-500" : "bg-[rgba(255,255,255,0.08)] text-muted-foreground"
        )}>
          <category.icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
             <span className="font-medium text-sm truncate">{category.name}</span>
             {over && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">Excedido</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>Gastado: {formatCurrency(spent)}</span>
            <span>•</span>
            <span className={cn(left === 0 && plan > 0 && "text-amber-500")}>Resta: {formatCurrency(left)}</span>
          </div>
        </div>
      </div>

      {/* Input & Status */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">RD$</span>
            <Input
                type="number"
                inputMode="decimal"
                value={inputValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={cn(
                    "w-[130px] h-10 pl-10 pr-4 text-right font-medium",
                    status === 'saving' && "opacity-50"
                )}
                placeholder="0.00"
            />
        </div>
        
        <div className="w-5 flex justify-center">
            {status === 'saving' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {status === 'saved' && <CheckCircle2 className="h-4 w-4 text-emerald-500 animate-in zoom-in" />}
        </div>
      </div>

      {/* Mini Progress Bar (Mobile only, beneath input) */}
      {plan > 0 && (
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden sm:hidden mt-1">
              <div className={cn("h-full rounded-full transition-all", over ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
          </div>
      )}
    </motion.div>
  );
}

// --- New Budget Modal ---
function NewBudgetDialog({ inactiveCategories, onSave }: { inactiveCategories: string[], onSave: (categoryId: string, amount: number) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // Group inactive by their mapped models for easy rendering
  const inactiveInfo = inactiveCategories
      .map(id => getCategoryInfo(id))
      .filter(Boolean) as NonNullable<ReturnType<typeof getCategoryInfo>>[];

  const selectedInfo = getCategoryInfo(selectedCatId);

  const handleSave = async () => {
    const num = parseFloat(amount) || 0;
    if (num <= 0 || !selectedCatId) return;
    setSaving(true);
    await onSave(selectedCatId, num);
    playIncome();
    setSaving(false);
    setOpen(false);
    setSelectedCatId('');
    setAmount('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-4 flex items-center justify-center gap-2 text-sm font-medium w-full py-4 rounded-xl border border-dashed border-[rgba(255,255,255,0.1)] text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all font-bold group"
        >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" /> Nuevo Presupuesto
        </motion.button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden gap-0">
         <DialogHeader className="p-6 pb-2">
            <DialogTitle>Añadir Presupuesto</DialogTitle>
            <DialogDescription>Asigna un límite de gasto a una de tus categorías libres.</DialogDescription>
         </DialogHeader>

         <div className="px-6 pb-6 space-y-6">
             {/* Category Grid */}
             <div className="space-y-2">
                 <label className="text-xs text-muted-foreground font-medium">1. Selecciona categoría</label>
                 {inactiveInfo.length === 0 ? (
                     <div className="text-center p-4 border border-dashed rounded-xl bg-muted/5 text-sm text-muted-foreground">
                         No hay categorías disponibles.
                     </div>
                 ) : (
                     <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[160px] overflow-y-auto pr-2">
                        {inactiveInfo.map(cat => {
                            const Icon = cat.icon;
                            const isSelected = selectedCatId === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCatId(cat.id)}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all border",
                                        isSelected 
                                            ? "border-[#00ff88] bg-[rgba(0,255,136,0.1)] text-[#00ff88]" 
                                            : "border-transparent hover:bg-[rgba(255,255,255,0.06)] text-muted-foreground"
                                    )}
                                >
                                    <Icon className="h-6 w-6" />
                                    <span className="text-[10px] truncate w-full text-center leading-tight">{cat.name}</span>
                                </button>
                            );
                        })}
                     </div>
                 )}
             </div>

             {/* Amount Input */}
             <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">2. Establece el límite mensual</label>
                <div className="flex items-center gap-3">
                    {selectedInfo ? (
                        <div className="w-12 h-12 shrink-0 rounded-xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
                            <selectedInfo.icon className="h-6 w-6 text-emerald-400" />
                        </div>
                    ) : (
                        <div className="w-12 h-12 shrink-0 rounded-xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
                            <span className="text-muted-foreground">?</span>
                        </div>
                    )}
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">RD$</span>
                        <Input
                            type="number"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="h-12 pl-12 text-lg font-bold bg-transparent"
                            disabled={!selectedCatId}
                        />
                    </div>
                </div>
             </div>

             {/* Save Button */}
             <button
                disabled={!selectedCatId || !amount || parseFloat(amount) <= 0 || saving}
                onClick={handleSave}
                className={cn(
                     "w-full h-12 rounded-xl font-bold flex items-center justify-center transition-all",
                     selectedCatId && parseFloat(amount) > 0 && !saving
                        ? "bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]"
                        : "bg-[rgba(255,255,255,0.04)] text-muted-foreground cursor-not-allowed"
                )}
             >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Guardar Presupuesto"}
             </button>
         </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PlanningTab() {
  const { currentMonth, updateAllBudgets, getBudgetStatusDetails, expenseCategories, loading } = useFinances();
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState('budgets');
  
  const budgetDetails = useMemo(() => getBudgetStatusDetails(currentMonth), [currentMonth, getBudgetStatusDetails]);

  // Handle single budget save
  const handleSaveBudget = async (categoryId: string, limitValue: number) => {
    // updateAllBudgets expects an array of all updates. A bit heavy, but it's what we have.
    // To preserve others, we map the current state and replace the changed one.
    const currentPlans = budgetDetails.map(b => ({ categoryId: b.categoryId, limit: b.limit / 100 }));
    const existingIdx = currentPlans.findIndex(p => p.categoryId === categoryId);
    
    if (existingIdx >= 0) {
        currentPlans[existingIdx].limit = limitValue;
    } else {
        currentPlans.push({ categoryId, limit: limitValue });
    }

    await updateAllBudgets(currentMonth, currentPlans);
  };
  
  const { active, inactive } = useMemo(() => {
      const activeIds = new Set<string>();
      const inactiveIds = new Set<string>();
      
      expenseCategories.forEach(catId => {
          const detail = budgetDetails.find(b => b.categoryId === catId);
          if ((detail?.limit ?? 0) > 0 || (detail?.spent ?? 0) > 0) {
              activeIds.add(catId);
          } else {
              inactiveIds.add(catId);
          }
      });
      return { active: Array.from(activeIds), inactive: Array.from(inactiveIds) };
  }, [expenseCategories, budgetDetails]);

  const displayedCategories = showAll ? [...active, ...inactive] : active;

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Planificación Mensual</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="budgets" className="text-[11px] sm:text-sm">Presupuestos</TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-[11px] sm:text-sm">Suscripciones</TabsTrigger>
          <TabsTrigger value="categories" className="text-[11px] sm:text-sm">Categorías</TabsTrigger>
        </TabsList>

        {/* --- METAS TAB --- */}
        <TabsContent value="goals" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
           <GoalsManager />
        </TabsContent>

        {/* --- PRESUPUESTOS TAB --- */}
        <TabsContent value="budgets" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg">Límites de Gasto</CardTitle>
                        <CardDescription>
                            Tus presupuestos se guardan automáticamente al editar.
                        </CardDescription>
                    </div>
                    {/* Wrapped to prevent squash */}
                    <div className="shrink-0 w-full sm:w-auto flex justify-end">
                        <TransferDialog />
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                        </div>
                    ) : (
                    <>
                    <div className="flex flex-col gap-3">
                    {displayedCategories.map(catId => {
                        const detail = budgetDetails.find(b => b.categoryId === catId);
                        return (
                            <BudgetItem 
                                key={catId} 
                                categoryId={catId}
                                currentPlan={detail?.limit ?? 0}
                                spent={detail?.spent ?? 0}
                                onSave={(val) => handleSaveBudget(catId, val)}
                            />
                        )
                    })}
                    </div>
                    {/* Fixed 'New Budget' UX */}
                    <NewBudgetDialog inactiveCategories={inactive} onSave={handleSaveBudget} />
                    </>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        {/* --- SUSCRIPCIONES TAB --- */}
        <TabsContent value="subscriptions" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <Card>
                <CardContent className="pt-6">
                    <SubscriptionsManager />
                </CardContent>
            </Card>
        </TabsContent>

        {/* --- CATEGORIAS TAB --- */}
        <TabsContent value="categories" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Gestión de Categorías</CardTitle>
                    <CardDescription>Añade o restaura las categorías base.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <ExpenseCategoryManager />
                    <IncomeCategoryManager />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
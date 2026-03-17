'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';
import { Wallet } from 'lucide-react';
import { getCategoryInfo } from '@/lib/categories';
import { Skeleton } from '../ui/skeleton';
import ExpenseCategoryManager from './expense-category-manager';
import TransferDialog from './transfer-dialog';
import GoalsManager from './goals-manager';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import IncomeCategoryManager from './income-category-manager';

function BudgetCard({ categoryId, onPlanChange, initialPlan, initialSpent }: { 
  categoryId: string;
  onPlanChange: (value: number) => void;
  initialPlan: number;
  initialSpent: number;
}) {
  const category = getCategoryInfo(categoryId);
  const [inputValue, setInputValue] = useState(initialPlan / 100);

  useEffect(() => {
    setInputValue(initialPlan / 100);
  }, [initialPlan]);

  const spent = initialSpent;
  const plan = initialPlan;
  const left = Math.max(0, plan - spent);
  const pct = plan ? Math.min(100, Math.round((spent / plan) * 100)) : 0;
  const over = plan > 0 && spent > plan;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(Number(e.target.value));
  };
  
  const handleBlur = () => {
    onPlanChange(inputValue);
  };

  if (!category) return null;

  return (
    <div className={cn("rounded-xl border p-3", over ? "border-amber-400 dark:border-amber-600" : "border-slate-200 dark:border-slate-700")}>
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <category.icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="font-medium text-sm truncate flex-1">{category.name}</div>
        <span className={cn(
          "ml-auto text-[10px] px-1.5 py-0.5 rounded font-semibold",
          plan === 0 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : 
          over ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" : 
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
        )}>
          {plan === 0 ? "sin plan" : over ? "alerta" : "ok"}
        </span>
      </div>

      <Input
        type="number"
        inputMode="numeric"
        className="w-full h-8 text-sm rounded border px-2 mb-2"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder="Plan"
      />

      <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded overflow-hidden mb-2">
        <div className={cn("h-2 rounded", over ? "bg-rose-500" : "bg-sky-500")} style={{ width: `${pct}%` }} />
      </div>

      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
        <span className="truncate">Gastado: {formatCurrency(spent)}</span>
        <span className={cn("truncate", left === 0 && plan > 0 && "text-amber-500")}>
            Resta: {formatCurrency(left)}
        </span>
      </div>
    </div>
  );
}


export default function PlanningTab() {
  const { 
    currentMonth, 
    updateAllBudgets, 
    getBudgetStatusDetails, 
    expenseCategories,
    loading
  } = useFinances();
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const [planInputs, setPlanInputs] = useState<{[key: string]: number}>({});
  
  const budgetDetails = useMemo(() => getBudgetStatusDetails(currentMonth), [currentMonth, getBudgetStatusDetails]);
  
  useEffect(() => {
    // Reset local plan inputs when month or details change
    const initialPlans: {[key: string]: number} = {};
    budgetDetails.forEach(b => {
      initialPlans[b.categoryId] = b.limit / 100;
    });
    setPlanInputs(initialPlans);
  }, [budgetDetails]);


  const handlePlanChange = (categoryId: string, value: number) => {
    setPlanInputs(prev => ({...prev, [categoryId]: value}));
  };

  const onSaveBudgets = () => {
    const budgetsToUpdate = Object.entries(planInputs).map(([categoryId, limit]) => ({
      categoryId,
      limit,
    }));
    updateAllBudgets(currentMonth, budgetsToUpdate);
    toast({
        title: "Planes guardados!",
        description: "Tus nuevos límites de presupuesto han sido actualizados.",
    })
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
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Planificación Mensual</h2>
        <TransferDialog />
      </div>
      
      <GoalsManager />

      <Accordion type="multiple" className="w-full space-y-6">
        <AccordionItem value="budgets">
           <Card>
            <AccordionTrigger className="px-6 data-[state=closed]:py-2 data-[state=open]:border-b">
              <CardHeader className="p-0">
                <CardTitle className="flex items-center gap-2"><Wallet className="h-6 w-6" /> Planes por Categoría</CardTitle>
                <CardDescription className="text-left">
                  Establece tus límites de gasto para cada categoría.
                </CardDescription>
              </CardHeader>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-6">
                {loading ? (
                    [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                ) : (
                  <>
                  <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                  {displayedCategories.map(catId => {
                      const detail = budgetDetails.find(b => b.categoryId === catId);
                      return (
                          <BudgetCard 
                              key={catId} 
                              categoryId={catId}
                              onPlanChange={(val) => handlePlanChange(catId, val)}
                              initialPlan={detail?.limit ?? 0}
                              initialSpent={detail?.spent ?? 0}
                          />
                      )
                  })}
                  </div>
                   {inactive.length > 0 && (
                        <button
                          onClick={() => setShowAll(v => !v)}
                          className="mt-4 text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700"
                        >
                          {showAll ? "Ocultar inactivas" : `Ver ${inactive.length} categorías inactivas`}
                        </button>
                    )}
                  </>
                )}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="categories">
           <Card>
            <AccordionTrigger className="px-6 data-[state=closed]:py-2 data-[state=open]:border-b">
               <CardHeader className="p-0">
                  <CardTitle className="flex items-center gap-2">🏷️ Gestión de Categorías</CardTitle>
                  <CardDescription className="text-left">
                    Añade o restaura las categorías de ingresos y gastos.
                  </CardDescription>
              </CardHeader>
            </AccordionTrigger>
            <AccordionContent className='p-6 flex flex-col gap-4'>
               <ExpenseCategoryManager />
               <IncomeCategoryManager />
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>
      <div className="sticky bottom-4 z-10 w-full px-4 md:px-0">
          <Button onClick={onSaveBudgets} className="w-full h-12 text-base shadow-[0_0_15px_rgba(0,255,136,0.1)] bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]">Guardar Planes</Button>
      </div>
    </div>
  );
}
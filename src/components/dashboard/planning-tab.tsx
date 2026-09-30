'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { useCategoryResolver } from '@/hooks/use-categories';
import { usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { useBudgetPeriod } from '@/hooks/use-budget-period';
import { BudgetPeriodControls } from './budget-period-controls';
import { Button } from '@/components/ui/button';
import { monthlyAmount } from '@/lib/finance-calculations';
import { formatPeriodRange } from '@/lib/period-format';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader, StatusBadge } from '@/components/finance-ui';
import { PLAN_SECTIONS } from '@/components/layout/plan-navigation';
import { useTabs } from '@/contexts/tabs-context';
import TransferDialog from './transfer-dialog';
import GoalsManager from './goals-manager';
import SubscriptionsManager from './subscriptions-manager';
import { selectBudgetCategoryGroups } from '@/domain/budgets';


const STATUS_LABELS = {
  ok: 'En presupuesto',
  alert: 'Cerca del límite',
  over: 'Excedido',
  unbudgeted: 'Sin presupuesto',
} as const;

function BudgetItem({
  categoryId,
  currentPlan,
  spent,
  remaining,
  percentage,
  budgetStatus,
  onSave,
}: {
  categoryId: string;
  currentPlan: number;
  spent: number;
  remaining: number;
  percentage: number;
  budgetStatus: keyof typeof STATUS_LABELS;
  onSave: (val: number) => Promise<boolean>;
}) {
  const money = usePrivateCurrency();
  const getCategoryInfo = useCategoryResolver();
  const category = getCategoryInfo(categoryId);
  const [inputValue, setInputValue] = useState(String(currentPlan / 100));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  useEffect(() => { if (!editing) setInputValue(String(currentPlan / 100)); }, [currentPlan, editing]);
  if (!category) return null;

  const statusTone = budgetStatus === 'over' ? 'danger' : budgetStatus === 'alert' ? 'warning' : budgetStatus === 'ok' ? 'success' : 'neutral';
  const progress = currentPlan > 0 ? Math.min(100, Math.max(0, percentage)) : 0;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(inputValue);
    if (savingRef.current || inputValue.trim() === '' || !Number.isFinite(amount) || amount < 0) return;
    savingRef.current = true;
    setSaving(true);
    try { if (await onSave(amount)) setEditing(false); }
    finally { savingRef.current = false; setSaving(false); }
  };

  return (
    <motion.article initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.16 }} className="space-y-4 rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)]" data-budget-row="prisma">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 font-display text-lg font-normal tracking-[-0.02em]"><category.icon className="h-5 w-5 shrink-0 text-muted-foreground" />{category.name}</h3>
        <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => setEditing(value => !value)} aria-label={'Editar límite de ' + category.name}>{editing ? 'Cancelar' : 'Editar límite'}</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-5">
        <div><span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Límite</span><strong className="mt-1 block font-display text-lg font-normal tabular-nums">{money(currentPlan)}</strong></div>
        <div><span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Gastado</span><strong className="mt-1 block font-display text-lg font-normal tabular-nums">{money(spent)}</strong></div>
        <div><span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Restante</span><strong className={cn('mt-1 block font-display text-lg font-normal tabular-nums', remaining < 0 && 'text-bad')}>{money(remaining)}</strong></div>
        <div><span className="block text-xs text-muted-foreground">Porcentaje</span><strong className="tabular-nums">{currentPlan > 0 ? percentage + '%' : '—'}</strong></div>
        <div className="col-span-2 lg:col-span-1"><span className="block text-xs text-muted-foreground">Estado</span><StatusBadge status={statusTone} label={STATUS_LABELS[budgetStatus]} /></div>
      </div>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={percentage + '% utilizado'} aria-label={'Presupuesto de ' + category.name} className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', budgetStatus === 'over' ? 'bg-bad' : budgetStatus === 'alert' ? 'bg-warning' : 'bg-good')} style={{ width:progress + '%' }} />
      </div>
      {editing && <form onSubmit={event => void save(event)} className="flex flex-wrap items-end gap-2 border-t pt-3">
        <label className="min-w-0 flex-1 space-y-1 text-sm"><span>Nuevo límite (RD$)</span><Input type="number" aria-label={'Límite de ' + category.name} required min="0" step="0.01" inputMode="decimal" value={inputValue} disabled={saving} onChange={event => setInputValue(event.target.value)} /></label>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar límite'}</Button>
        <p className="w-full text-xs text-muted-foreground">Un límite de 0 mantiene el presupuesto activo sin margen para gastar. Se aplica tu política de excesos.</p>
      </form>}
    </motion.article>
  );
}

function NewBudgetDialog({
  inactiveCategories,
  onSave,
}: {
  inactiveCategories: string[];
  onSave: (categoryId: string, amount: number) => Promise<boolean>;
}) {
  const getCategoryInfo = useCategoryResolver();
  const [open, setOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const inactiveInfo = inactiveCategories.map(id => getCategoryInfo(id)).filter(Boolean) as NonNullable<ReturnType<typeof getCategoryInfo>>[];

  const handleSave = async () => {
    const numberValue = Number(amount);
    if (saving || !selectedCatId || !Number.isFinite(numberValue) || numberValue <= 0) return;
    setSaving(true);
    const success = await onSave(selectedCatId, numberValue);
    setSaving(false);
    if (!success) return;
    setOpen(false);
    setSelectedCatId('');
    setAmount('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-interactive)] border border-dashed text-sm font-semibold text-primary transition-colors hover:bg-primary/10">
          <Plus className="h-4 w-4" /> Nuevo presupuesto
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">Añadir presupuesto</DialogTitle>
          <DialogDescription>Asigna un límite a una categoría para el rango seleccionado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span>Categoría</span>
            <select
              value={selectedCatId}
              onChange={event => setSelectedCatId(event.target.value)}
              className="h-11 w-full rounded-[var(--radius-interactive)] border border-input bg-background px-3 shadow-[var(--shadow-control)]"
            >
              <option value="">Selecciona una categoría</option>
              {inactiveInfo.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Límite</span>
            <Input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" />
          </label>
          <button
            disabled={!selectedCatId || !(parseFloat(amount) > 0) || saving}
            onClick={() => void handleSave()}
            className="h-11 w-full rounded-[var(--radius-interactive)] bg-primary font-semibold text-primary-foreground shadow-[var(--shadow-control)] disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar presupuesto'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PlanningTab() {
  const money = usePrivateCurrency();
  const {
    currentMonth,
    currentPeriod,
    baseIncome,
    getTotals,
    updateAllBudgets,
    getBudgetStatusDetails,
    prepareBudgetPeriod,
    expenseCategories,
    loading,
  } = useFinances();
  const { planningTab, setPlanningTab } = useTabs();
  const [showAll, setShowAll] = useState(false);
  const selection = useBudgetPeriod();
  const budgetPeriod = selection.range;
  const budgetPeriodKind = selection.kind;

  useEffect(() => {
    if (budgetPeriod && planningTab === 'budgets') void prepareBudgetPeriod(budgetPeriod);
  }, [budgetPeriod, prepareBudgetPeriod, planningTab]);

  const budgetDetails = useMemo(
    () => budgetPeriod ? getBudgetStatusDetails(currentMonth, budgetPeriod) : [],
    [currentMonth, budgetPeriod, getBudgetStatusDetails],
  );

  const handleSaveBudget = async (categoryId: string, limitValue: number) => {
    if (!budgetPeriod) return false;
    return updateAllBudgets(currentMonth, [{ categoryId, limit: limitValue }], budgetPeriod);
  };

  const { active, inactive } = useMemo(
    () => selectBudgetCategoryGroups(expenseCategories, budgetDetails),
    [expenseCategories, budgetDetails],
  );

  const displayedCategories = showAll ? [...active, ...inactive] : active;
  const monthlyTotals = getTotals(currentMonth);

  return (
    <div className="space-y-7 pb-24 md:pb-8" data-plan-prisma="true">
      <PageHeader title={<><span>Plan</span><span className="text-[hsl(var(--brand-coral))]">.</span></>} description={<>Presupuestos, metas y movimientos planificados · <strong className="font-semibold text-foreground">{formatPeriodRange(currentPeriod)}</strong></>} />

      <Tabs value={planningTab} onValueChange={value => setPlanningTab(value as typeof planningTab)} className="w-full">
        <TabsList className="mb-6 grid h-auto w-full grid-cols-3 gap-1 rounded-[var(--radius-card)] border bg-card p-1.5 shadow-[var(--shadow-card)]" data-plan-navigation="prisma">
          {PLAN_SECTIONS.map(section => (
            <TabsTrigger key={section.value} value={section.value} className="min-h-10 whitespace-nowrap rounded-[var(--radius-interactive)] text-xs font-semibold">
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="goals" className="space-y-4">
          <GoalsManager />
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          {budgetPeriodKind === 'monthly' && (
            <div className="space-y-3 rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)]" data-plan-monthly-summary="prisma">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[var(--radius-interactive)] bg-muted/45 p-3"><span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ingreso previsto</span><strong className="mt-1 block font-display text-lg font-normal">{money(monthlyAmount(baseIncome.freq, baseIncome.amount))}</strong></div>
                <div className="rounded-[var(--radius-interactive)] bg-muted/45 p-3"><span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ingresos registrados</span><strong className="mt-1 block font-display text-lg font-normal">{money(monthlyTotals.recordedIncome)}</strong></div>
                <div className="rounded-[var(--radius-interactive)] bg-muted/45 p-3"><span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Margen tras reservas</span><strong className="mt-1 block font-display text-lg font-normal">{money(monthlyTotals.monthlyPlanningMargin)}</strong></div>
              </div>
              <p className="text-xs text-muted-foreground">Este margen pertenece al período financiero mensual. Los presupuestos semanales, anuales y únicos mantienen su propio rango.</p>
            </div>
          )}

          <Card className="border bg-card shadow-[var(--shadow-card)]" data-plan-budgets="prisma">
            <CardHeader className="space-y-4">
              <div>
                <CardTitle className="font-display text-2xl font-normal">Presupuestos</CardTitle>
                <CardDescription>Define cuánto quieres gastar por categoría y sigue tu progreso.</CardDescription>
              </div>

              <BudgetPeriodControls selection={selection} />
              {budgetPeriod && <TransferDialog key={budgetPeriod.id} budgetPeriod={budgetPeriod} />}
            </CardHeader>

            <CardContent>
              {!budgetPeriod ? (
                <p role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">La fecha inicial debe ser igual o anterior a la final.</p>
              ) : loading ? (
                <div className="space-y-3">{[...Array(4)].map((_, index) => <Skeleton key={index} className="h-36 w-full rounded-xl" />)}</div>
              ) : (
                <>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {displayedCategories.map(categoryId => {
                      const detail = budgetDetails.find(item => item.categoryId === categoryId);
                      return (
                        <BudgetItem
                          key={`${budgetPeriod.id}-${categoryId}`}
                          categoryId={categoryId}
                          currentPlan={detail?.limit ?? 0}
                          spent={detail?.spent ?? 0}
                          remaining={detail?.remaining ?? 0}
                          percentage={detail?.percentage ?? 0}
                          budgetStatus={detail?.status ?? 'unbudgeted'}
                          onSave={value => handleSaveBudget(categoryId, value)}
                        />
                      );
                    })}
                  </div>

                  {active.length === 0 && !showAll && (
                    <div className="rounded-[var(--radius-card)] border border-dashed p-5 text-center text-sm text-muted-foreground">
                      No hay límites configurados en este rango. Añade un presupuesto o muestra todas las categorías.
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className="min-h-11 rounded-[var(--radius-interactive)] border px-3 text-sm font-medium transition-colors hover:bg-muted/35" onClick={() => setShowAll(value => !value)}>
                      {showAll ? 'Ocultar categorías sin presupuesto' : 'Mostrar todas las categorías'}
                    </button>
                  </div>
                  <NewBudgetDialog key={budgetPeriod.id} inactiveCategories={inactive.filter(id => expenseCategories.includes(id))} onSave={handleSaveBudget} />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card className="border bg-card shadow-[var(--shadow-card)]" data-plan-planned="prisma"><CardContent className="p-5 sm:p-6"><SubscriptionsManager /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

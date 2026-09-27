'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { useCategoryResolver } from '@/hooks/use-categories';
import { usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { currentBudgetRange } from '@/domain/budgets';
import type { BudgetPeriodKind, BudgetPeriodRange } from '@/domain/periods';
import { monthlyAmount } from '@/lib/finance-calculations';
import { formatPeriodRange } from '@/lib/period-format';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle2, Loader2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader, StatusBadge } from '@/components/finance-ui';
import { PLAN_SECTIONS } from '@/components/layout/plan-navigation';
import { useTabs } from '@/contexts/tabs-context';
import TransferDialog from './transfer-dialog';
import GoalsManager from './goals-manager';
import SubscriptionsManager from './subscriptions-manager';

const BUDGET_PERIODS: Array<{ value: BudgetPeriodKind; label: string }> = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
  { value: 'one_time', label: 'Único' },
];

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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  useEffect(() => {
    if (saveStatus === 'idle') setInputValue(String(currentPlan / 100));
  }, [currentPlan, saveStatus]);

  if (!category) return null;

  const handleSave = async (value: string) => {
    const numberValue = parseFloat(value) || 0;
    if (Math.round(numberValue * 100) === currentPlan) return;
    setSaveStatus('saving');
    const success = await onSave(numberValue);
    setSaveStatus(success ? 'saved' : 'idle');
    if (success) setTimeout(() => setSaveStatus('idle'), 1800);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    setSaveStatus('idle');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { void handleSave(event.target.value); }, 900);
  };

  const statusTone = budgetStatus === 'over' ? 'danger' : budgetStatus === 'alert' ? 'warning' : budgetStatus === 'ok' ? 'success' : 'neutral';
  const progress = currentPlan > 0 ? Math.min(100, Math.max(0, percentage)) : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
      className="space-y-3 rounded-xl border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/40">
            <category.icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">{category.name}</h3>
            <StatusBadge status={statusTone} label={STATUS_LABELS[budgetStatus]} />
          </div>
        </div>
        <div className="flex items-center gap-2" aria-live="polite">
          {saveStatus === 'saving' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />}
          {saveStatus === 'saved' && <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />}
          <span className="sr-only">{saveStatus === 'saving' ? 'Guardando presupuesto' : saveStatus === 'saved' ? 'Presupuesto guardado' : ''}</span>
        </div>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-5">
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Límite</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">RD$</span>
            <Input
              type="number"
              aria-label={`Límite de ${category.name}`}
              min="0"
              step="0.01"
              inputMode="decimal"
              value={inputValue}
              onChange={handleChange}
              onBlur={() => { if (debounceTimer.current) clearTimeout(debounceTimer.current); void handleSave(inputValue); }}
              onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              className={cn('h-9 pl-9 text-right tabular-nums', saveStatus === 'saving' && 'opacity-60')}
            />
          </div>
        </label>
        <div><span className="block text-xs text-muted-foreground">Gastado</span><strong className="tabular-nums">{money(spent)}</strong></div>
        <div><span className="block text-xs text-muted-foreground">Restante</span><strong className={cn('tabular-nums', remaining < 0 && 'text-bad')}>{money(remaining)}</strong></div>
        <div><span className="block text-xs text-muted-foreground">Porcentaje</span><strong className="tabular-nums">{percentage}%</strong></div>
        <div><span className="block text-xs text-muted-foreground">Estado</span><strong>{STATUS_LABELS[budgetStatus]}</strong></div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-label={`${percentage}% del presupuesto utilizado`}>
        <div className={cn('h-full rounded-full', budgetStatus === 'over' ? 'bg-bad' : budgetStatus === 'alert' ? 'bg-warning' : 'bg-good')} style={{ width: `${progress}%` }} />
      </div>
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
    const numberValue = parseFloat(amount) || 0;
    if (!selectedCatId || numberValue <= 0) return;
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
        <button className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-semibold text-primary hover:bg-primary/10">
          <Plus className="h-4 w-4" /> Nuevo presupuesto
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Añadir presupuesto</DialogTitle>
          <DialogDescription>Asigna un límite a una categoría para el rango seleccionado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span>Categoría</span>
            <select
              value={selectedCatId}
              onChange={event => setSelectedCatId(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3"
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
            className="h-11 w-full rounded-md bg-primary/10 font-semibold text-primary disabled:opacity-50"
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
    periodStartDay,
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
  const [budgetPeriodKind, setBudgetPeriodKind] = useState<BudgetPeriodKind>('monthly');
  const [oneTimeStart, setOneTimeStart] = useState(currentPeriod.start);
  const [oneTimeEnd, setOneTimeEnd] = useState(currentPeriod.end);

  useEffect(() => {
    setOneTimeStart(currentPeriod.start);
    setOneTimeEnd(currentPeriod.end);
  }, [currentPeriod.start, currentPeriod.end]);

  const budgetPeriod = useMemo<BudgetPeriodRange | null>(() => {
    try {
      const oneTime = budgetPeriodKind === 'one_time' ? { start: oneTimeStart, end: oneTimeEnd } : undefined;
      const anchor = budgetPeriodKind === 'one_time' ? oneTimeStart : currentPeriod.end;
      return currentBudgetRange(anchor, budgetPeriodKind, { periodStartDay }, oneTime);
    } catch {
      return null;
    }
  }, [budgetPeriodKind, oneTimeStart, oneTimeEnd, currentPeriod.end, periodStartDay]);

  useEffect(() => {
    if (budgetPeriod) void prepareBudgetPeriod(budgetPeriod);
  }, [budgetPeriod, prepareBudgetPeriod]);

  const budgetDetails = useMemo(
    () => budgetPeriod ? getBudgetStatusDetails(currentMonth, budgetPeriod) : [],
    [currentMonth, budgetPeriod, getBudgetStatusDetails],
  );

  const handleSaveBudget = async (categoryId: string, limitValue: number) => {
    if (!budgetPeriod) return false;
    return updateAllBudgets(currentMonth, [{ categoryId, limit: limitValue }], budgetPeriod);
  };

  const { active, inactive } = useMemo(() => {
    const activeIds = new Set<string>();
    const inactiveIds = new Set<string>();
    for (const categoryId of new Set([...expenseCategories, ...budgetDetails.map(detail => detail.categoryId)])) {
      const detail = budgetDetails.find(item => item.categoryId === categoryId);
      if ((detail?.limit ?? 0) > 0 || (detail?.spent ?? 0) > 0) activeIds.add(categoryId);
      else inactiveIds.add(categoryId);
    }
    return { active: Array.from(activeIds), inactive: Array.from(inactiveIds) };
  }, [expenseCategories, budgetDetails]);

  const displayedCategories = showAll ? [...active, ...inactive] : active;
  const monthlyTotals = getTotals(currentMonth);

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <PageHeader title="Plan" description={<>Presupuestos, metas y movimientos planificados · {formatPeriodRange(currentPeriod)}</>} />

      <Tabs value={planningTab} onValueChange={value => setPlanningTab(value as typeof planningTab)} className="w-full">
        <TabsList className="mb-6 flex w-full justify-start gap-1 overflow-x-auto pb-2 sm:justify-center sm:pb-0">
          {PLAN_SECTIONS.map(section => (
            <TabsTrigger key={section.value} value={section.value} className="shrink-0 whitespace-nowrap text-xs">
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="goals" className="space-y-4">
          <GoalsManager />
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          {budgetPeriodKind === 'monthly' && (
            <div className="space-y-2 rounded-xl border p-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <p>Ingreso previsto: <strong>{money(monthlyAmount(baseIncome.freq, baseIncome.amount))}</strong></p>
                <p>Ingresos registrados: <strong>{money(monthlyTotals.recordedIncome)}</strong></p>
                <p>Margen del período tras reservas: <strong>{money(monthlyTotals.monthlyPlanningMargin)}</strong></p>
              </div>
              <p className="text-xs text-muted-foreground">Este margen pertenece al período financiero mensual. Los presupuestos semanales, anuales y únicos mantienen su propio rango.</p>
            </div>
          )}

          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>Presupuestos 2.0</CardTitle>
                <CardDescription>Un solo motor de rangos para límites semanales, mensuales, anuales y únicos.</CardDescription>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Tipo de período del presupuesto">
                {BUDGET_PERIODS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={budgetPeriodKind === option.value}
                    onClick={() => setBudgetPeriodKind(option.value)}
                    className={cn(
                      'min-h-11 rounded-lg border px-3 text-sm font-medium',
                      budgetPeriodKind === option.value ? 'border-primary/40 bg-primary/10 text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {budgetPeriodKind === 'one_time' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm"><span>Inicio</span><Input type="date" value={oneTimeStart} onChange={event => setOneTimeStart(event.target.value)} /></label>
                  <label className="space-y-1 text-sm"><span>Fin</span><Input type="date" value={oneTimeEnd} onChange={event => setOneTimeEnd(event.target.value)} /></label>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/30 p-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Rango:</span>{' '}
                  <strong>{budgetPeriod ? formatPeriodRange(budgetPeriod) : 'Selecciona un rango válido'}</strong>
                </div>
                {budgetPeriod && <TransferDialog budgetPeriod={budgetPeriod} />}
              </div>
            </CardHeader>

            <CardContent>
              {!budgetPeriod ? (
                <p role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">La fecha inicial debe ser igual o anterior a la final.</p>
              ) : loading ? (
                <div className="space-y-3">{[...Array(4)].map((_, index) => <Skeleton key={index} className="h-36 w-full rounded-xl" />)}</div>
              ) : (
                <>
                  <div className="space-y-3">
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
                    <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                      No hay límites configurados en este rango. Añade un presupuesto o muestra todas las categorías.
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className="min-h-11 rounded-md border px-3 text-sm" onClick={() => setShowAll(value => !value)}>
                      {showAll ? 'Ocultar categorías sin presupuesto' : 'Mostrar todas las categorías'}
                    </button>
                  </div>
                  <NewBudgetDialog inactiveCategories={inactive} onSave={handleSaveBudget} />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card><CardContent className="pt-6"><SubscriptionsManager /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

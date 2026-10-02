'use client';

import { AccountSelect } from './account-select';
import { localDate } from '@/lib/finance-calculations';
import { useMemo, useState } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CalendarDays, CirclePause, CirclePlay, Plus } from 'lucide-react';
import { cn, toCents } from '@/lib/utils';
import { usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { ContextHelp, EmptyState, PlannedPaymentRow, StatusBadge } from '@/components/finance-ui';
import { useTabs } from '@/contexts/tabs-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategoryResolver } from '@/hooks/use-categories';
import { selectPlannedPaymentsManagerReadModel, type UpcomingBucket } from '@/domain/upcoming';
import type { PlannedOccurrence, RecurringRule } from '@/domain/models';

const GROUPS: Array<{ key: UpcomingBucket; label: string }> = [
  { key: 'overdue', label: 'Vencidos' },
  { key: 'today', label: 'Hoy' },
  { key: 'tomorrow', label: 'Mañana' },
  { key: 'next7', label: 'Próximos 7 días' },
  { key: 'later', label: 'Después' },
];

function cadenceLabel(cadence: RecurringRule['cadence']) {
  if (cadence === 'weekly') return 'Semanal';
  if (cadence === 'biweekly') return 'Quincenal';
  return 'Mensual';
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('es-DO', { day:'numeric', month:'short' }).format(new Date(`${value}T12:00:00`));
}

export default function SubscriptionsManager() {
  const money = usePrivateCurrency();
  const { setActiveTab, requestMovementFocus } = useTabs();
  const getCategoryInfo = useCategoryResolver();
  const {
    recurringRules,
    plannedOccurrences,
    addRecurringRule,
    updateRecurringRule,
    confirmPlannedOccurrenceItem,
    skipPlannedOccurrenceItem,
    expenseCategories,
    incomeCategories,
  } = useFinances();

  const [accountOverride, setAccountOverride] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    title: '',
    amount: '',
    direction: 'expense' as RecurringRule['direction'],
    cadence: 'monthly' as RecurringRule['cadence'],
    day: String(new Date().getDate()),
    startDate: localDate(),
    categoryId: '',
    defaultAccountId: '',
  });

  const today = localDate();
  const { grouped, rulesById, sortedRules, unresolvedCount, recentResolved } = useMemo(
    () => selectPlannedPaymentsManagerReadModel(plannedOccurrences || [], recurringRules || [], today),
    [plannedOccurrences, recurringRules, today],
  );
  const categoryIds = newRule.direction === 'expense' ? expenseCategories : incomeCategories;

  const handleAddSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amountCents = toCents(newRule.amount);
    if (!newRule.title.trim() || amountCents <= 0 || !newRule.categoryId || !newRule.startDate) return;

    const success = await addRecurringRule({
      title: newRule.title.trim(),
      amount: amountCents,
      day: newRule.cadence === 'monthly' ? Number(newRule.day) : undefined,
      cadence: newRule.cadence,
      startDate: newRule.startDate,
      categoryId: newRule.categoryId,
      defaultAccountId: newRule.defaultAccountId || undefined,
      direction: newRule.direction,
      active: true,
    });
    if (!success) return;

    setIsAddOpen(false);
    setNewRule({
      title: '',
      amount: '',
      direction: 'expense',
      cadence: 'monthly',
      day: String(new Date().getDate()),
      startDate: localDate(),
      categoryId: '',
      defaultAccountId: '',
    });
  };

  const confirm = async (occurrence: PlannedOccurrence) => {
    if (workingId) return;
    setWorkingId(occurrence.id);
    try {
      await confirmPlannedOccurrenceItem(occurrence.id, {
        accountId: accountOverride || undefined,
      });
    } finally {
      setWorkingId(null);
    }
  };

  const skip = async (occurrence: PlannedOccurrence) => {
    if (workingId) return;
    setWorkingId(occurrence.id);
    try {
      await skipPlannedOccurrenceItem(occurrence.id);
    } finally {
      setWorkingId(null);
    }
  };

  const toggleRule = async (rule: RecurringRule) => {
    if (workingId) return;
    setWorkingId(rule.id);
    try {
      await updateRecurringRule({ ...rule, active: !rule.active });
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="space-y-6" data-plan-planned-manager="prisma">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-1">
          <h3 className="font-display text-2xl font-normal tracking-[-0.025em]">Movimientos planificados</h3>
          <ContextHelp label="Acerca de los movimientos planificados">Las reglas generan ocurrencias locales. Solo confirmar una ocurrencia crea un ingreso o gasto real.</ContextHelp>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="min-h-11 rounded-[var(--radius-interactive)] border-primary/30 text-primary hover:bg-primary/10 sm:min-h-9">
              <Plus className="mr-2 h-4 w-4" /> Añadir regla
            </Button>
          </DialogTrigger>
          <DialogContent data-recurring-rule-dialog="prisma">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-normal">Nueva planificación recurrente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={newRule.title}
                  onChange={e => setNewRule({ ...newRule, title:e.target.value })}
                  placeholder="Ej. Internet, nómina"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newRule.direction}
                    onValueChange={(value: RecurringRule['direction']) =>
                      setNewRule({ ...newRule, direction:value, categoryId:'' })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Gasto</SelectItem>
                      <SelectItem value="income">Ingreso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monto (RD$)</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={newRule.amount}
                    onChange={e => setNewRule({ ...newRule, amount:e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Frecuencia</Label>
                  <Select
                    value={newRule.cadence}
                    onValueChange={(value: RecurringRule['cadence']) => setNewRule({ ...newRule, cadence:value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quincenal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fecha inicial</Label>
                  <Input
                    type="date"
                    value={newRule.startDate}
                    onChange={e => setNewRule({ ...newRule, startDate:e.target.value })}
                    required
                  />
                </div>
              </div>

              {newRule.cadence === 'monthly' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label>Día preferido</Label>
                    <ContextHelp label="Cómo funciona el día preferido">Si el mes no contiene ese día, se usa su último día válido.</ContextHelp>
                  </div>
                  <Select value={newRule.day} onValueChange={day => setNewRule({ ...newRule, day })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length:31 }, (_, index) => index + 1).map(day => (
                        <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={newRule.categoryId} onValueChange={categoryId => setNewRule({ ...newRule, categoryId })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {categoryIds.map(id => {
                      const info = getCategoryInfo(id);
                      return info ? <SelectItem key={id} value={id}>{info.name}</SelectItem> : null;
                    })}
                  </SelectContent>
                </Select>
              </div>

              <AccountSelect
                value={newRule.defaultAccountId}
                onChange={defaultAccountId => setNewRule({ ...newRule, defaultAccountId })}
                label="Cuenta predeterminada al confirmar (opcional)"
              />

              <Button type="submit" className="w-full">Guardar regla</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="max-w-md" data-plan-confirmation-account="prisma">
        <AccountSelect
          value={accountOverride}
          onChange={setAccountOverride}
          label="Reemplazar cuenta al confirmar (opcional)"
        />
      </div>

      <section className="space-y-3" aria-labelledby="upcoming-title">
        <div className="flex items-center justify-between gap-3">
          <h4 id="upcoming-title" className="font-display text-xl font-normal">Próximos movimientos</h4>
          <CalendarDays className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>

        {unresolvedCount === 0 ? (
          <EmptyState title="Nada pendiente" />
        ) : (
          GROUPS.map(group => {
            const rows = grouped[group.key];
            if (!rows.length) return null;
            return (
              <div key={group.key} className="space-y-2 rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)]" data-planned-group={group.key}>
                <h5 className={cn("text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground", group.key === 'overdue' && "text-warning")}>
                  {group.label}
                </h5>
                {rows.map(occurrence => {
                  const rule = rulesById.get(occurrence.ruleId);
                  if (!rule) return null;
                  const category = getCategoryInfo(rule.categoryId);
                  return (
                    <PlannedPaymentRow
                      key={occurrence.id}
                      title={rule.title}
                      amount={rule.amount}
                      dateLabel={dateLabel(occurrence.scheduledDate)}
                      kindLabel={rule.direction === 'expense' ? 'Gasto' : 'Ingreso'}
                      status={group.key === 'overdue' ? 'overdue' : 'pending'}
                      meta={category?.name}
                      actions={{
                        confirm: () => { void confirm(occurrence); },
                        skip: () => { void skip(occurrence); },
                        disabled: !!workingId,
                      }}
                    />
                  );
                })}
              </div>
            );
          })
        )}
      </section>

      {recentResolved.length > 0 && (
        <section className="space-y-3" aria-labelledby="recent-planned-title">
          <h4 id="recent-planned-title" className="font-display text-xl font-normal">Actividad planificada reciente</h4>
          <div className="grid gap-2 rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)]">
            {recentResolved.map(occurrence => {
              const rule = rulesById.get(occurrence.ruleId);
              return (
                <PlannedPaymentRow
                  key={occurrence.id}
                  title={rule?.title || 'Regla eliminada'}
                  amount={rule?.amount}
                  dateLabel={dateLabel(occurrence.scheduledDate)}
                  kindLabel={rule ? (rule.direction === 'expense' ? 'Gasto' : 'Ingreso') : undefined}
                  status={occurrence.status}
                  actions={occurrence.status === 'confirmed' && occurrence.transactionId ? {
                    viewMovement: () => {
                      requestMovementFocus(occurrence.transactionId!);
                      setActiveTab('movements');
                    },
                  } : undefined}
                />
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="rules-title">
        <div className="flex items-center gap-1">
          <h4 id="rules-title" className="font-display text-xl font-normal">Reglas recurrentes</h4>
          <ContextHelp label="Acerca de las reglas recurrentes">Pausar una regla detiene nuevas ocurrencias; las pendientes ya creadas se conservan.</ContextHelp>
        </div>

        {sortedRules.length === 0 ? (
          <EmptyState title="Aún no hay reglas recurrentes" />
        ) : (
          <div className="grid gap-2">
            {sortedRules.map(rule => {
              const category = getCategoryInfo(rule.categoryId);
              return (
                <div key={rule.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-interactive)] border bg-card p-3 shadow-[var(--shadow-control)]" data-recurring-rule="prisma">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{rule.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {cadenceLabel(rule.cadence)} · {money(rule.amount)}
                      {category ? ` · ${category.name}` : ''}
                    </p>
                    <div className="mt-1"><StatusBadge status={rule.active ? 'success' : 'neutral'} label={rule.active ? 'Activa' : 'Pausada'} /></div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!!workingId}
                    onClick={() => toggleRule(rule)}
                    aria-label={rule.active ? `Pausar ${rule.title}` : `Reactivar ${rule.title}`}
                  >
                    {rule.active ? <CirclePause className="mr-1 h-4 w-4" /> : <CirclePlay className="mr-1 h-4 w-4" />}
                    {rule.active ? 'Pausar' : 'Reactivar'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
'use client';

import { useMoneyFormatter } from "@/hooks/use-money-visibility";

import { StatusBadge } from '@/components/ui/financial-patterns';
import { occurrenceDisplayStatus } from '@/domain/occurrence-status';
import TransactionModal from './TransactionModal';
import { AccountSelect } from './account-select';
import { localDate } from '@/lib/finance-calculations';
import { useMemo, useState, useRef } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CalendarDays, CheckCircle2, CirclePause, CirclePlay, Clock3, Plus, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategoryResolver } from '@/hooks/use-categories';
import { groupUpcomingOccurrences, type UpcomingBucket } from '@/domain/upcoming';
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
  const formatCurrency = useMoneyFormatter();
  const getCategoryInfo = useCategoryResolver();
  const {
    recurringRules, incomes, expenses,
    plannedOccurrences,
    addRecurringRule,
    updateRecurringRule,
    confirmPlannedOccurrenceItem,
    skipPlannedOccurrenceItem,
    expenseCategories,
    incomeCategories,
  } = useFinances();

  const addingRef = useRef(false);
  const [isAdding, setIsAdding] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
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
  const grouped = useMemo(
    () => groupUpcomingOccurrences(plannedOccurrences || [], today),
    [plannedOccurrences, today],
  );
  const rulesById = useMemo(
    () => new Map((recurringRules || []).map(rule => [rule.id, rule])),
    [recurringRules],
  );
  const categoryIds = newRule.direction === 'expense' ? expenseCategories : incomeCategories;
  const sortedRules = useMemo(
    () => [...(recurringRules || [])].sort((a, b) =>
      Number(b.active) - Number(a.active) || a.title.localeCompare(b.title, 'es')),
    [recurringRules],
  );
  const unresolvedCount = Object.values(grouped).reduce((sum, rows) => sum + rows.length, 0);

  const handleAddSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (addingRef.current) return;
    const amountCents = Math.round(Number(newRule.amount) * 100);
    if (!newRule.title.trim() || amountCents <= 0 || !newRule.categoryId || !newRule.startDate) return;

    addingRef.current = true; setIsAdding(true);
    try {
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
    } finally { addingRef.current = false; setIsAdding(false); }
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold">Movimientos planificados</h3>
          <p className="text-sm text-muted-foreground">
            Programa cobros y pagos. Tu saldo cambia únicamente cuando confirmas el movimiento.
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={open => { if (!addingRef.current) setIsAddOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
              <Plus className="mr-2 h-4 w-4" /> Nuevo planificado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva planificación recurrente</DialogTitle><DialogDescription>Define el importe y la frecuencia. Confirmar cada cobro o pago actualizará tus cuentas.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4"><fieldset disabled={isAdding} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="planned-nombre">Nombre</Label>
                <Input id="planned-nombre"
                  value={newRule.title}
                  onChange={e => setNewRule({ ...newRule, title:e.target.value })}
                  placeholder="Ej. Internet, nómina"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planned-tipo">Tipo</Label>
                  <Select
                    value={newRule.direction}
                    onValueChange={(value: RecurringRule['direction']) =>
                      setNewRule({ ...newRule, direction:value, categoryId:'' })}
                  >
                    <SelectTrigger id="planned-tipo"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Gasto</SelectItem>
                      <SelectItem value="income">Ingreso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planned-monto-rd-">Monto (RD$)</Label>
                  <Input id="planned-monto-rd-"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planned-frecuencia">Frecuencia</Label>
                  <Select
                    value={newRule.cadence}
                    onValueChange={(value: RecurringRule['cadence']) => setNewRule({ ...newRule, cadence:value })}
                  >
                    <SelectTrigger id="planned-frecuencia"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quincenal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planned-fecha-inicial">Fecha inicial</Label>
                  <Input id="planned-fecha-inicial"
                    type="date"
                    value={newRule.startDate}
                    onChange={e => setNewRule({ ...newRule, startDate:e.target.value })}
                    required
                  />
                </div>
              </div>

              {newRule.cadence === 'monthly' && (
                <div className="space-y-2">
                  <Label htmlFor="planned-dia-preferido">Día preferido</Label>
                  <Select value={newRule.day} onValueChange={day => setNewRule({ ...newRule, day })}>
                    <SelectTrigger id="planned-dia-preferido"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length:31 }, (_, index) => index + 1).map(day => (
                        <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Si el mes no contiene ese día, se usa su último día válido.</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="planned-categoria">Categoría</Label>
                <Select value={newRule.categoryId} onValueChange={categoryId => setNewRule({ ...newRule, categoryId })}>
                  <SelectTrigger id="planned-categoria"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
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

              <Button type="submit" className="w-full">{isAdding ? 'Guardando…' : 'Guardar regla'}</Button>
            </fieldset></form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border p-4 space-y-2">
        <AccountSelect
          value={accountOverride}
          onChange={setAccountOverride}
          label="Reemplazar cuenta al confirmar (opcional)"
        />
        <p className="text-xs text-muted-foreground">
          Vacío usa la cuenta predeterminada de la regla; si tampoco existe, se utiliza Efectivo para ingresos y gastos en cuentas.
        </p>
      </div>

      <section className="space-y-3" aria-labelledby="upcoming-title">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 id="upcoming-title" className="font-semibold">Próximos movimientos</h4>
            <p className="text-xs text-muted-foreground">{unresolvedCount} movimientos pendientes.</p>
          </div>
          <CalendarDays className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>

        {unresolvedCount === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No tienes movimientos pendientes. Usa Nuevo planificado para programar uno.
          </div>
        ) : (
          GROUPS.map(group => {
            const rows = grouped[group.key];
            if (!rows.length) return null;
            return (
              <div key={group.key} className="space-y-2">
                <h5 className={cn("text-xs font-semibold uppercase tracking-wide text-muted-foreground", group.key === 'overdue' && "text-amber-600 dark:text-amber-400")}>
                  {group.label}
                </h5>
                {rows.map(occurrence => {
                  const rule = rulesById.get(occurrence.ruleId);
                  if (!rule) return null;
                  const category = getCategoryInfo(rule.categoryId);
                  const busy = workingId === occurrence.id;
                  return (
                    <div key={occurrence.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="truncate font-medium">{rule.title}</span><StatusBadge status={occurrenceDisplayStatus(occurrence, today)} />
                          <span className="text-xs text-muted-foreground">{rule.direction === 'expense' ? 'Gasto' : 'Ingreso'}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {dateLabel(occurrence.scheduledDate)} · {formatCurrency(rule.amount)}
                          {category ? ` · ${category.name}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={!!workingId} onClick={() => skip(occurrence)}>
                          <SkipForward className="mr-1 h-3.5 w-3.5" /> Omitir
                        </Button>
                        <Button size="sm" disabled={!!workingId} onClick={() => confirm(occurrence)}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {busy ? 'Guardando…' : 'Confirmar'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </section>

      <details className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">Historial de planificados</summary><div className="mt-3 space-y-3">{(plannedOccurrences ?? []).filter(o => o.status !== 'pending').slice().sort((a,b) => b.scheduledDate.localeCompare(a.scheduledDate)).map(o => <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"><div><p>{rulesById.get(o.ruleId)?.title || 'Planificado'}</p><p className="text-xs text-muted-foreground">{dateLabel(o.scheduledDate)}</p></div><StatusBadge status={o.status} />{o.status === 'confirmed' && o.transactionId && <Button variant="outline" onClick={() => setHistoryId(o.transactionId!)}>Ver movimiento</Button>}</div>)}{!(plannedOccurrences ?? []).some(o => o.status !== 'pending') && <p className="text-sm text-muted-foreground">Aquí aparecerán los movimientos confirmados y omitidos.</p>}</div></details>
      <TransactionModal open={!!historyId} onClose={() => setHistoryId(null)} mode="edit" editingIncome={incomes?.find(i => i.id === historyId)} editingExpense={expenses?.find(e => e.id === historyId)} />
      <section className="space-y-3" aria-labelledby="rules-title">
        <div>
          <h4 id="rules-title" className="font-semibold">Reglas recurrentes</h4>
          <p className="text-xs text-muted-foreground">Pausar una regla detiene los próximos recordatorios; los pendientes existentes se conservan.</p>
        </div>

        {sortedRules.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Aún no hay reglas recurrentes.</div>
        ) : (
          <div className="grid gap-2">
            {sortedRules.map(rule => {
              const category = getCategoryInfo(rule.categoryId);
              return (
                <div key={rule.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{rule.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {cadenceLabel(rule.cadence)} · {formatCurrency(rule.amount)}
                      {category ? ` · ${category.name}` : ''}
                      {!rule.active ? ' · Pausada' : ''}
                    </p>
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

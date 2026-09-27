'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFinances } from '@/contexts/finance-context';
import { formatPeriodRange } from '@/lib/period-format';
import { PageHeader, SectionHeader, MetricCard, EmptyState, PlannedPaymentRow, ProgressMetric, TransactionRow } from '@/components/finance-ui';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import BudgetStatus from './budget-status';
import { cn } from '@/lib/utils';
import { groupUpcomingOccurrences } from '@/domain/upcoming';
import { occurrenceDisplayStatus } from '@/domain/occurrence-status';
import { localDate } from '@/lib/finance-calculations';
import { useCategoryResolver } from '@/hooks/use-categories';
import { useTabs } from '@/contexts/tabs-context';

function formatMonth(value: string) {
  return format(new Date(`${value}-02`), 'MMMM', { locale:es });
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('es-DO', { day:'numeric', month:'short' }).format(new Date(`${value}T12:00:00`));
}

function SaveStrategy() {
  const { savePct, updateSettings } = useFinances();
  const options = [
    { label:'Ninguno 0%', value:0 },
    { label:'Conservador 5%', value:0.05 },
    { label:'Estándar 10%', value:0.10 },
    { label:'Agresivo 20%', value:0.20 },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => {
        const active = Math.abs(savePct - option.value) < 0.001;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => updateSettings({ savePct:option.value })}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function SummaryTab() {
  const {
    getPosition,
    loading,
    currentMonth,
    currentPeriod,
    periodStartDay,
    plannedOccurrences,
    recurringRules,
    confirmPlannedOccurrenceItem,
    skipPlannedOccurrenceItem,
    goals,
    incomes,
    expenses,
  } = useFinances();
  const { setActiveTab } = useTabs();
  const getCategoryInfo = useCategoryResolver();
  const [periodLabel, setPeriodLabel] = useState('');
  const today = localDate();

  useEffect(() => {
    setPeriodLabel(periodStartDay === 1 ? formatMonth(currentMonth) : formatPeriodRange(currentPeriod));
  }, [currentMonth, currentPeriod, periodStartDay]);

  const position = getPosition();
  const rulesById = useMemo(() => new Map((recurringRules || []).map(rule => [rule.id, rule])), [recurringRules]);
  const upcoming = useMemo(() => {
    const groups = groupUpcomingOccurrences(plannedOccurrences || [], today);
    return [...groups.overdue, ...groups.today, ...groups.tomorrow, ...groups.next7].slice(0, 3);
  }, [plannedOccurrences, today]);

  const goalHighlights = useMemo(
    () => [...(goals || [])]
      .filter(goal => goal.status === 'active')
      .sort((a, b) => (a.date || '9999-12-31').localeCompare(b.date || '9999-12-31') || a.name.localeCompare(b.name, 'es'))
      .slice(0, 2),
    [goals],
  );

  const recent = useMemo(() => {
    const rows = [
      ...(incomes || []).map(row => ({ id:row.id, kind:'income' as const, title:row.description || 'Ingreso', amount:row.amount, date:row.date, categoryId:row.categoryId })),
      ...(expenses || []).map(row => ({ id:row.id, kind:'expense' as const, title:row.concept || 'Gasto', amount:row.amount, date:row.date, categoryId:row.categoryId })),
    ];
    return rows.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 5);
  }, [incomes, expenses]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="Resumen"
        description={periodStartDay === 1 ? `Situación actual y actividad de ${periodLabel}.` : `Situación actual · ${periodLabel}.`}
      />

      <section className="space-y-3" aria-labelledby="position-title">
        <SectionHeader
          title={<span id="position-title">Posición financiera</span>}
          description="Lo que tienes disponible, lo que debes y tu patrimonio registrado."
        />
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {[0,1,2].map(index => <Skeleton key={index} className="h-24 w-full" />)}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              label="Disponible líquido"
              amount={position.liquidAssets}
              tone={position.liquidAssets < 0 ? 'negative' : 'positive'}
              supporting="Efectivo + bancos registrados. No incluye crédito disponible."
            />
            <MetricCard
              label="Deuda de tarjetas"
              amount={position.liabilities}
              tone={position.liabilities > 0 ? 'negative' : 'neutral'}
              supporting="Saldo adeudado en tarjetas registradas."
            />
            <MetricCard
              label="Patrimonio neto"
              amount={position.netWorth}
              tone={position.netWorth < 0 ? 'negative' : 'neutral'}
              supporting="Disponible líquido + saldo a favor en tarjetas − deuda."
            />
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="budget-title">
        <SectionHeader
          title={<span id="budget-title">Presupuesto disponible</span>}
          description="Prioriza cuánto te queda, no un gráfico decorativo."
        />
        <BudgetStatus />
      </section>

      <section className="space-y-3" aria-labelledby="upcoming-title">
        <SectionHeader
          title={<span id="upcoming-title">Próximos pagos</span>}
          description="Solo lo que viene pronto o ya requiere atención."
          actions={<Button type="button" variant="outline" size="sm" onClick={() => setActiveTab('planning')}>Ver Plan</Button>}
        />
        {upcoming.length ? (
          <div className="grid gap-2">
            {upcoming.map(occurrence => {
              const rule = rulesById.get(occurrence.ruleId);
              if (!rule) return null;
              const status = occurrenceDisplayStatus(occurrence, today);
              return (
                <PlannedPaymentRow
                  key={occurrence.id}
                  title={rule.title}
                  amount={rule.amount}
                  dateLabel={dateLabel(occurrence.scheduledDate)}
                  kindLabel={rule.direction === 'expense' ? 'Gasto' : 'Ingreso'}
                  status={status}
                  actions={{
                    confirm: () => { void confirmPlannedOccurrenceItem(occurrence.id); },
                    skip: () => { void skipPlannedOccurrenceItem(occurrence.id); },
                  }}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState title="Nada próximo" description="No hay pagos o ingresos planificados pendientes que requieran atención en los próximos 7 días." />
        )}
      </section>

      <section className="space-y-3" aria-labelledby="goals-title">
        <SectionHeader
          title={<span id="goals-title">Metas relevantes</span>}
          description="Solo objetivos activos que pueden requerir una acción."
          actions={<Button type="button" variant="outline" size="sm" onClick={() => setActiveTab('planning')}>Ver metas</Button>}
        />
        {goalHighlights.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {goalHighlights.map(goal => (
              <div key={goal.id} className="rounded-xl border p-4">
                <ProgressMetric
                  label={goal.name}
                  current={goal.saved}
                  total={goal.target}
                  remaining={Math.max(0, goal.target - goal.saved)}
                  status={goal.saved >= goal.target ? 'success' : 'neutral'}
                  statusLabel={goal.date ? `Para ${dateLabel(goal.date)}` : 'Sin fecha límite'}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Aún no tienes metas activas" description="Crea una meta en Plan → Metas para calcular y seguir tu progreso." />
        )}
      </section>

      <section className="space-y-3" aria-labelledby="recent-title">
        <SectionHeader
          title={<span id="recent-title">Movimientos recientes</span>}
          description="Un vistazo rápido a la actividad real más reciente."
          actions={<Button type="button" variant="outline" size="sm" onClick={() => setActiveTab('movements')}>Ver todos</Button>}
        />
        {recent.length ? (
          <div className="space-y-2">
            {recent.map(item => {
              const category = getCategoryInfo(item.categoryId);
              const Icon = category?.icon;
              return (
                <TransactionRow
                  key={`${item.kind}-${item.id}`}
                  title={item.title}
                  meta={category?.name}
                  amount={item.amount}
                  tone={item.kind === 'income' ? 'positive' : 'negative'}
                  dateLabel={dateLabel(item.date)}
                  icon={Icon ? <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', item.kind === 'income' ? 'bg-good/10 text-good' : 'bg-bad/10 text-bad')}><Icon className="h-4 w-4" /></div> : undefined}
                  onClick={() => setActiveTab('movements')}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState title="Aún no hay movimientos" description="El botón + está disponible desde cualquier área para registrar tu primera operación." />
        )}
      </section>

      <section className="space-y-3 border-t pt-6" aria-labelledby="saving-title">
        <SectionHeader
          title={<span id="saving-title">Preferencia de ahorro sugerido</span>}
          description="Una referencia de planificación; cambiarla no mueve dinero."
        />
        <SaveStrategy />
      </section>

      <p className="text-xs text-muted-foreground">
        El análisis histórico y por categoría vive en Reportes.
      </p>
    </div>
  );
}

'use client';

import { useFinances } from '@/contexts/finance-context';
import { useTabs } from '@/contexts/tabs-context';
import { formatPeriodRange } from '@/lib/period-format';
import { localDate } from '@/lib/finance-calculations';
import { occurrenceDisplayStatus } from '@/domain/occurrence-status';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, MetricCard, MoneyValue, PageHeader, SectionHeader, StatusBadge } from '@/components/ui/financial-patterns';
import BudgetStatus from './budget-status';

export default function SummaryTab() {
  const { getTotals, getPosition, currentMonth, currentPeriod, loading, plannedOccurrences, recurringRules, incomes, expenses, goals } = useFinances();
  const { setActiveTab, setPlanTab } = useTabs();
  const plan = (section: string) => { setPlanTab(section); setActiveTab('planning'); };
  const position = getPosition();
  const totals = getTotals(currentMonth);
  const today = localDate();
  const upcoming = (plannedOccurrences ?? []).filter(o => o.status === 'pending').slice().sort((a,b) => a.scheduledDate.localeCompare(b.scheduledDate)).slice(0,3);
  const recent = [
    ...(incomes ?? []).map(i => ({ id: i.id, date: i.date, label: i.description || 'Ingreso', amount: i.amount, direction: 'Ingreso' })),
    ...(expenses ?? []).map(e => ({ id: e.id, date: e.date, label: e.concept || 'Gasto', amount: -(e.amount), direction: 'Gasto' })),
  ].filter(row => row.date >= currentPeriod.start && row.date <= currentPeriod.end).sort((a,b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)).slice(0,3);
  const activeGoals = (goals ?? []).filter(g => g.status === 'active').slice(0,2);
  if (loading) return <div aria-label="Cargando resumen" className="grid gap-4 sm:grid-cols-3">{[0,1,2].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  return <div className="space-y-6">
    <PageHeader title="Resumen" context={formatPeriodRange(currentPeriod)} action={<Button variant="outline" onClick={() => setActiveTab('movements')}>Ver cuentas</Button>} />
    <section aria-label="Situación actual" className="grid gap-3 sm:grid-cols-3">
      <MetricCard label="Disponible líquido" amount={position.liquidAssets} help="Efectivo y bancos hoy. No incluye crédito." />
      <MetricCard label="Deuda" amount={position.liabilities} help="Saldo pendiente de las tarjetas registradas." />
      <MetricCard label="Patrimonio neto" amount={position.netWorth} help="Cuentas y saldos a favor registrados, menos deuda de tarjetas." />
    </section>
    <section className="ui-card space-y-3" aria-label="Actividad del período">
      <SectionHeader title="Este período" action={<Button variant="ghost" onClick={() => plan('budgets')}>Ver presupuesto</Button>} />
      <div className="grid gap-3 sm:grid-cols-3">{[
        { label: 'Ingresos registrados', value: totals.recordedIncome },
        { label: 'Gastos registrados', value: totals.spending },
        { label: 'Resultado del período', value: totals.monthlyResult },
      ].map(row => <div key={row.label}><p className="text-xs text-muted-foreground">{row.label}</p><MoneyValue amount={row.value} className="font-semibold" /></div>)}</div>
    </section>
    <BudgetStatus />
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="ui-card space-y-3"><SectionHeader title="Próximos movimientos" action={<Button variant="ghost" onClick={() => plan('subscriptions')}>Ver planificados</Button>} />
        {upcoming.length ? upcoming.map(o => { const rule = (recurringRules ?? []).find(r => r.id === o.ruleId); return rule ? <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"><div><p className="font-medium">{rule.title}</p><p className="text-xs text-muted-foreground">{o.scheduledDate} · {rule.direction === 'expense' ? 'Gasto previsto' : 'Ingreso previsto'}</p></div><MoneyValue amount={rule.amount} /><StatusBadge status={occurrenceDisplayStatus(o,today)} /></div> : null; }) : <EmptyState title="Sin pendientes" description="Planifica un cobro o pago. Solo afecta tu saldo cuando lo confirmas." action={<Button variant="outline" onClick={() => plan('subscriptions')}>Crear planificado</Button>} />}
      </section>
      <section className="ui-card space-y-3"><SectionHeader title="Metas" action={<Button variant="ghost" onClick={() => plan('goals')}>Ver metas</Button>} />
        {activeGoals.length ? activeGoals.map(g => <div key={g.id} className="border-t pt-3"><p className="font-medium">{g.name}</p><p className="text-sm"><MoneyValue amount={g.saved} /> de <MoneyValue amount={g.target} /></p><Button variant="ghost" onClick={() => plan('goals')}>Registrar aporte</Button></div>) : <EmptyState title="Tu próxima meta" description="Define un objetivo y registra tus aportes." action={<Button variant="outline" onClick={() => plan('goals')}>Crear meta</Button>} />}
      </section>
    </div>
    <section className="ui-card space-y-3"><SectionHeader title="Ingresos y gastos recientes" action={<Button variant="ghost" onClick={() => setActiveTab('movements')}>Ver todos los movimientos</Button>} />
      {recent.length ? recent.map(row => <div key={`${row.direction}-${row.id}`} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"><div><p className="font-medium break-words">{row.label}</p><p className="text-xs text-muted-foreground">{row.direction} · {row.date}</p></div><MoneyValue amount={row.amount} /></div>) : <EmptyState title="Todavía no hay ingresos ni gastos" description="Usa el botón + para registrar el primero en este período." />}
    </section>
  </div>;
}

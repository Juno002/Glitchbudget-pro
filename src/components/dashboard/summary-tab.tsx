'use client';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CreditCard,
  Landmark,
  Settings2,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { useFinances } from '@/contexts/finance-context';
import {
  EmptyState,
  MoneyValue,
  PageHeader,
  PlannedPaymentRow,
  ProgressMetric,
  SectionHeader,
  StatusBadge,
  type FinancialStatus,
  type MoneyTone,
} from '@/components/finance-ui';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { localDate } from '@/lib/finance-calculations';
import { useTabs } from '@/contexts/tabs-context';
import { usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { selectHomeReadModel, type HomeModuleId } from '@/domain/home';
import { occurrenceDisplayStatus } from '@/domain/occurrence-status';
import { useHomePreferences } from '@/hooks/use-home-preferences';
import { HOME_MODULES } from '@/lib/home-preferences';
import { formatPeriodRange } from '@/lib/period-format';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

function dateLabel(value:string) {
  return new Intl.DateTimeFormat('es-DO',{day:'numeric',month:'short'}).format(new Date(value+'T12:00:00'));
}

function HomePreferencesDialog({
  visibleOrder,
  hidden,
  defaultSection,
  onHiddenChange,
  onMove,
  onDefaultChange,
  onReset,
}: {
  visibleOrder:HomeModuleId[];
  hidden:HomeModuleId[];
  defaultSection:HomeModuleId;
  onHiddenChange:(id:HomeModuleId,hidden:boolean)=>void;
  onMove:(id:HomeModuleId,direction:-1|1)=>void;
  onDefaultChange:(id:HomeModuleId)=>void;
  onReset:()=>void;
}) {
  const visibleCount=HOME_MODULES.length-hidden.length;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm"><Settings2 className="mr-1 h-4 w-4" />Personalizar Home</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Personalizar Home</DialogTitle>
          <DialogDescription>La preferencia se guarda solo en este navegador. No cambia datos ni cálculos financieros.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium">Mostrar y ordenar módulos</p>
            {HOME_MODULES.map(module=>{
              const isHidden=hidden.includes(module.id);
              const orderIndex=visibleOrder.indexOf(module.id);
              return (
                <div key={module.id} className="flex items-center gap-2 rounded-[var(--radius-interactive)] border bg-card p-3">
                  <label className="flex min-w-0 flex-1 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={!isHidden}
                      disabled={!isHidden && visibleCount===1}
                      onChange={event=>onHiddenChange(module.id,!event.target.checked)}
                      aria-label={'Mostrar '+module.label}
                    />
                    <span>{module.label}</span>
                  </label>
                  <Button type="button" size="icon" variant="ghost" disabled={isHidden || orderIndex<=0} aria-label={'Subir '+module.label} onClick={()=>onMove(module.id,-1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" disabled={isHidden || orderIndex<0 || orderIndex===visibleOrder.length-1} aria-label={'Bajar '+module.label} onClick={()=>onMove(module.id,1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Sección inicial al abrir Home</span>
            <select
              className="h-10 w-full rounded-[var(--radius-interactive)] border border-input bg-card px-3"
              value={defaultSection}
              onChange={event=>onDefaultChange(event.target.value as HomeModuleId)}
            >
              {HOME_MODULES.filter(module=>!hidden.includes(module.id)).map(module=><option key={module.id} value={module.id}>{module.label}</option>)}
            </select>
            <span className="block text-xs text-muted-foreground">Al entrar a Home se enfoca esta sección. El orden general se conserva por separado.</span>
          </label>
          <Button type="button" variant="outline" onClick={onReset}>Restablecer Home</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HomeSection({id,children,className}:{id:HomeModuleId;children:ReactNode;className?:string}) {
  return (
    <section
      id={'home-'+id}
      className={cn('scroll-mt-24',className)}
      data-home-module={id}
    >
      {children}
    </section>
  );
}

function PositionCard({
  label,
  amount,
  supporting,
  icon:Icon,
  tone='neutral',
  variant='default',
}: {
  label:string;
  amount:number;
  supporting:string;
  icon:LucideIcon;
  tone?:MoneyTone;
  variant?:'default'|'featured'|'warm'|'mint';
}) {
  return (
    <Card className={cn(
      'relative overflow-hidden',
      variant==='featured' && 'border-primary bg-primary text-primary-foreground shadow-[var(--shadow-floating)]',
      variant==='warm' && 'border-[hsl(var(--brand-coral)/0.18)] bg-[hsl(var(--brand-coral)/0.07)]',
      variant==='mint' && 'border-[hsl(var(--brand-mint)/0.22)] bg-[hsl(var(--brand-mint)/0.08)]',
    )}>
      <CardContent className="p-5">
        <div className={cn(
          'flex items-center justify-between gap-3 text-xs font-semibold',
          variant==='featured' ? 'text-primary-foreground/70' : 'text-muted-foreground',
        )}>
          <span>{label}</span>
          <Icon className="h-[19px] w-[19px]" aria-hidden="true" />
        </div>
        <MoneyValue
          amount={amount}
          tone={tone}
          className={cn(
            'mt-4 block font-display text-[1.75rem] leading-none tracking-[-0.04em]',
            variant==='featured' && '!text-primary-foreground',
          )}
        />
        <p className={cn(
          'mt-3 text-[11px] leading-relaxed',
          variant==='featured' ? 'text-primary-foreground/65' : 'text-muted-foreground',
        )}>{supporting}</p>
      </CardContent>
    </Card>
  );
}

function PanelHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow:string;
  title:string;
  action?:ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-1 font-display text-xl font-normal tracking-[-0.025em]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function SummaryTab() {
  const {
    getReportSnapshot,
    getBudgetStatusDetails,
    loading,
    currentMonth,
    currentPeriod,
    periodStartDay,
    plannedOccurrences,
    recurringRules,
    confirmPlannedOccurrenceItem,
    skipPlannedOccurrenceItem,
    goals,
    investments,
  }=useFinances();
  const {activeTab,setActiveTab,setPlanningTab}=useTabs();
  const money=usePrivateCurrency();
  const today=localDate();
  const preferences=useHomePreferences();
  const previousActive=useRef<string|null>(null);

  const home=useMemo(()=>selectHomeReadModel({
    report:getReportSnapshot(currentPeriod, today),
    budgetDetails:getBudgetStatusDetails(currentMonth),
    plannedOccurrences:plannedOccurrences||[],
    recurringRules:recurringRules||[],
    goals:goals||[],
    investments:investments||[],
    today,
    periodStartDay,
  }),[
    getReportSnapshot,getBudgetStatusDetails,currentPeriod,currentMonth,plannedOccurrences,recurringRules,goals,investments,today,periodStartDay,
  ]);

  useEffect(()=>{
    const entering=activeTab==='summary' && previousActive.current!=='summary';
    previousActive.current=activeTab;
    if(!entering || !preferences.ready) return;
    const id=preferences.preferences.defaultSection;
    const timer=window.setTimeout(()=>document.getElementById('home-'+id)?.scrollIntoView({behavior:'smooth',block:'start'}),0);
    return ()=>window.clearTimeout(timer);
  },[activeTab,preferences.ready,preferences.preferences.defaultSection]);

  const goToAccounts=()=>{
    setActiveTab('movements');
    window.setTimeout(()=>document.getElementById('accounts-section')?.scrollIntoView({behavior:'smooth',block:'start'}),0);
  };
  const goToInvestments=()=>{
    setActiveTab('movements');
    window.setTimeout(()=>document.getElementById('investments-section')?.scrollIntoView({behavior:'smooth',block:'start'}),0);
  };

  const budgetStatus: { status:FinancialStatus; label:string } =
    home.budget.status==='over'
      ? {status:'danger',label:'Excedido'}
      : home.budget.status==='alert'
        ? {status:'warning',label:'Requiere atención'}
        : home.budget.status==='ok'
          ? {status:'success',label:'En presupuesto'}
          : {status:'neutral',label:'Sin presupuesto'};

  const modules:Record<HomeModuleId,ReactNode>={
    position:(
      <HomeSection id="position" className="space-y-3">
        <SectionHeader
          title="Posición financiera"
          description="Dinero líquido, activos registrados y deuda real."
          actions={<Button type="button" variant="ghost" size="sm" onClick={goToAccounts}>Ver cuentas <ArrowUpRight className="h-4 w-4" /></Button>}
        />
        {loading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map(i=><Skeleton key={i} className="h-[150px] w-full rounded-[var(--radius-card)]" />)}</div> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-home-layout="position-metrics">
            <PositionCard
              label="Disponible líquido"
              amount={home.position.liquidAssets}
              tone={home.position.liquidAssets<0?'negative':'neutral'}
              supporting="Efectivo + bancos. No incluye crédito disponible."
              icon={WalletCards}
              variant="featured"
            />
            <PositionCard
              label="Patrimonio neto"
              amount={home.position.netWorth}
              tone={home.position.netWorth<0?'negative':'neutral'}
              supporting="Activos reales menos pasivos registrados."
              icon={TrendingUp}
            />
            <PositionCard
              label="Deuda total"
              amount={home.position.liabilities}
              tone={home.position.liabilities>0?'negative':'neutral'}
              supporting="Pasivos registrados, incluidas tarjetas y compatibilidad histórica."
              icon={CreditCard}
              variant="warm"
            />
            <PositionCard
              label="Inversiones"
              amount={home.position.investments}
              tone="neutral"
              supporting="Valor registrado real; sin rendimiento proyectado."
              icon={Landmark}
              variant="mint"
            />
          </div>
        )}
      </HomeSection>
    ),
    budget:(
      <HomeSection id="budget">
        <Card className="h-full">
          <CardContent className="p-5 sm:p-6">
            <PanelHeading
              eyebrow="Seguimiento"
              title="Presupuesto disponible"
              action={<Button type="button" variant="ghost" size="sm" onClick={()=>{setPlanningTab('budgets');setActiveTab('planning');}}>Ver presupuestos <ArrowUpRight className="h-4 w-4" /></Button>}
            />
            {home.budget.configuredCount ? (
              <div className="mt-6 space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Te queda</p>
                    <MoneyValue
                      amount={home.budget.remaining}
                      tone={home.budget.remaining<0?'negative':'neutral'}
                      className="mt-1 block font-display text-[2rem] leading-none tracking-[-0.045em]"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">de {money(home.budget.limit)} presupuestados</p>
                  </div>
                  <StatusBadge status={budgetStatus.status} label={budgetStatus.label} />
                </div>
                <ProgressMetric
                  label="Uso del presupuesto"
                  current={home.budget.spent}
                  total={home.budget.limit}
                  remaining={home.budget.remaining}
                  currentLabel="Gastado"
                  totalLabel="Presupuestado"
                  status={budgetStatus.status}
                  statusLabel={home.budget.overCount>0
                    ? home.budget.overCount+' excedidos'
                    : home.budget.alertCount>0
                      ? home.budget.alertCount+' cerca del límite'
                      : 'Sin alertas'}
                />
              </div>
            ) : (
              <EmptyState
                className="mt-5"
                title="Aún no tienes presupuestos"
                description="Crea límites en Plan → Presupuestos para ver cuánto te queda en este período."
              />
            )}
          </CardContent>
        </Card>
      </HomeSection>
    ),
    upcoming:(
      <HomeSection id="upcoming">
        <Card className="h-full">
          <CardContent className="p-5 sm:p-6">
            <PanelHeading
              eyebrow="Lo que viene"
              title="Próximos pagos"
              action={<Button type="button" variant="ghost" size="sm" onClick={()=>{setPlanningTab('subscriptions');setActiveTab('planning');}}>Ver Plan <ArrowUpRight className="h-4 w-4" /></Button>}
            />
            {home.upcoming.rows.length ? (
              <div className="mt-5 grid gap-2">
                {home.upcoming.rows.map(({occurrence,rule})=>(
                  <PlannedPaymentRow
                    key={occurrence.id}
                    title={rule.title}
                    amount={rule.amount}
                    dateLabel={dateLabel(occurrence.scheduledDate)}
                    kindLabel={rule.direction==='expense'?'Gasto':'Ingreso'}
                    status={occurrenceDisplayStatus(occurrence,today)}
                    actions={{
                      confirm:()=>{void confirmPlannedOccurrenceItem(occurrence.id);},
                      skip:()=>{void skipPlannedOccurrenceItem(occurrence.id);},
                    }}
                  />
                ))}
                <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground">
                  <span>{home.upcoming.overdueCount>0 ? home.upcoming.overdueCount+' vencidos' : 'Sin pagos vencidos'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{home.upcoming.todayCount>0 ? home.upcoming.todayCount+' para hoy' : 'Nada adicional para hoy'}</span>
                </div>
              </div>
            ) : (
              <EmptyState
                className="mt-5"
                title="Nada próximo"
                description="No hay pagos o ingresos planificados pendientes en los próximos 7 días."
              />
            )}
          </CardContent>
        </Card>
      </HomeSection>
    ),
    goals:(
      <HomeSection id="goals">
        <Card className="h-full">
          <CardContent className="p-5 sm:p-6">
            <PanelHeading
              eyebrow="Objetivos"
              title="Metas relevantes"
              action={<Button type="button" variant="ghost" size="sm" onClick={()=>{setPlanningTab('goals');setActiveTab('planning');}}>Ver metas <ArrowUpRight className="h-4 w-4" /></Button>}
            />
            {home.goals.length ? (
              <div className="mt-5 grid gap-5">
                {home.goals.map(({goal,remaining,schedule})=>(
                  <ProgressMetric
                    key={goal.id}
                    label={goal.name}
                    current={goal.saved}
                    total={goal.target}
                    currentLabel="Ahorrado"
                    remaining={remaining}
                    supporting={schedule.requiredMonthly===null?'Sin fecha límite':schedule.overdue?'Fecha límite vencida':'Aporte mensual requerido: '+money(schedule.requiredMonthly)}
                    status={schedule.overdue?'danger':'neutral'}
                    statusLabel={goal.date?'Para '+dateLabel(goal.date):'Sin fecha límite'}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                className="mt-5"
                title="Aún no tienes metas activas"
                description="Crea una meta en Plan → Metas para seguirla desde Resumen."
              />
            )}
          </CardContent>
        </Card>
      </HomeSection>
    ),
    investments:(
      <HomeSection id="investments">
        <Card className="h-full">
          <CardContent className="p-5 sm:p-6">
            <PanelHeading
              eyebrow="Activos no líquidos"
              title="Inversiones"
              action={<Button type="button" variant="ghost" size="sm" onClick={goToInvestments}>Ver inversiones <ArrowUpRight className="h-4 w-4" /></Button>}
            />
            {home.investments.activeCount ? (
              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Valor registrado</p>
                  <MoneyValue amount={home.investments.totalRegistered} className="mt-1 block font-display text-[2rem] leading-none tracking-[-0.045em]" />
                  <p className="mt-2 text-xs text-muted-foreground">{home.investments.activeCount} inversiones activas · sin proyecciones futuras</p>
                </div>
                <div className="space-y-2 border-t border-border/70 pt-4">
                  {home.investments.rows.map(({investment,projection})=>(
                    <div key={investment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-interactive)] bg-muted/45 px-3 py-3 text-sm">
                      <div>
                        <p className="font-semibold">{investment.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{investment.maturityDate ? 'Vence '+dateLabel(investment.maturityDate) : 'Sin vencimiento registrado'}</p>
                      </div>
                      <StatusBadge
                        status={projection.maturityReached?'warning':'neutral'}
                        label={projection.maturityReached?'Revisar vencimiento':projection.daysRemaining===null?'Sin fecha':projection.daysRemaining+' días'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                className="mt-5"
                title="Aún no hay inversiones"
                description="Registra certificados o depósitos a plazo desde Movimientos → Inversiones."
              />
            )}
          </CardContent>
        </Card>
      </HomeSection>
    ),
  };

  return (
    <div className="space-y-7 pb-24 md:pb-8" data-home-prisma="true">
      <div className="space-y-3">
        <StatusBadge
          status={home.attentionCount>0?'warning':'success'}
          label={home.attentionCount>0 ? home.attentionCount+' elementos requieren atención' : 'Todo está en orden'}
          className="min-h-7 px-3"
        />
        <PageHeader
          title={<><span>Resumen</span><span className="text-[hsl(var(--brand-coral))]">.</span></>}
          description={<>Tu panorama financiero · <strong className="font-semibold text-foreground">{formatPeriodRange(currentPeriod)}</strong></>}
          actions={<HomePreferencesDialog
            visibleOrder={preferences.visibleOrder}
            hidden={preferences.preferences.hidden}
            defaultSection={preferences.preferences.defaultSection}
            onHiddenChange={preferences.setHidden}
            onMove={preferences.move}
            onDefaultChange={preferences.setDefaultSection}
            onReset={preferences.reset}
          />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-home-layout="module-grid">
        {preferences.visibleOrder.map(id=>(
          <div key={id} className={cn('min-w-0',id==='position' && 'lg:col-span-2')}>
            {modules[id]}
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Settings2, ArrowUp, ArrowDown } from 'lucide-react';
import { useFinances } from '@/contexts/finance-context';
import { PageHeader, SectionHeader, MetricCard, EmptyState, PlannedPaymentRow, ProgressMetric } from '@/components/finance-ui';
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
        <Button type="button" variant="outline" size="sm"><Settings2 className="mr-2 h-4 w-4" />Personalizar Home</Button>
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
                <div key={module.id} className="flex items-center gap-2 rounded-lg border p-3">
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
              className="h-10 w-full rounded-md border border-input bg-background px-3"
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

function HomeSection({id,children}:{id:HomeModuleId;children:ReactNode}) {
  return <section id={'home-'+id} className="scroll-mt-24 space-y-3" data-home-module={id}>{children}</section>;
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
    report:getReportSnapshot(currentPeriod,today),
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

  const modules:Record<HomeModuleId,ReactNode>={
    position:(
      <HomeSection id="position">
        <SectionHeader
          title="Posición"
          description="¿Cuánto tienes y cuánto debes ahora?"
          actions={<Button type="button" variant="outline" size="sm" onClick={goToAccounts}>Ver cuentas</Button>}
        />
        {loading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0,1,2,3].map(i=><Skeleton key={i} className="h-24 w-full" />)}</div> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Disponible líquido" amount={home.position.liquidAssets} tone={home.position.liquidAssets<0?'negative':'positive'} supporting="Efectivo + bancos. No incluye crédito disponible." />
            <MetricCard label="Inversiones" amount={home.position.investments} tone={home.position.investments>0?'positive':'neutral'} supporting="Valor registrado real; sin rendimiento estimado." />
            <MetricCard label="Debes" amount={home.position.liabilities} tone={home.position.liabilities>0?'negative':'neutral'} supporting="Pasivo real de tarjetas registradas." />
            <MetricCard label="Patrimonio neto" amount={home.position.netWorth} tone={home.position.netWorth<0?'negative':'neutral'} supporting="Misma fórmula compartida con Reportes." />
          </div>
        )}
      </HomeSection>
    ),
    budget:(
      <HomeSection id="budget">
        <SectionHeader
          title="Presupuesto"
          description="¿Cuánto puedes gastar dentro de tus límites actuales?"
          actions={<Button type="button" variant="outline" size="sm" onClick={()=>{setPlanningTab('budgets');setActiveTab('planning');}}>Ver presupuestos</Button>}
        />
        {home.budget.configuredCount ? (
          <Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
            <MetricCard label="Restante" amount={home.budget.remaining} tone={home.budget.remaining<0?'negative':'neutral'} supporting={'de '+money(home.budget.limit)+' presupuestados'} />
            <MetricCard label="Gastado" amount={home.budget.spent} tone={home.budget.overCount>0?'negative':'neutral'} supporting={home.budget.configuredCount+' categorías con límite'} />
            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">Estado</p>
              <p className="mt-2 text-lg font-semibold">{home.budget.status==='over'?'Excedido':home.budget.status==='alert'?'Requiere atención':'En presupuesto'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{home.budget.overCount>0?home.budget.overCount+' presupuestos excedidos':home.budget.alertCount>0?home.budget.alertCount+' cerca del límite':'Sin alertas de presupuesto'}</p>
            </div>
          </CardContent></Card>
        ) : <EmptyState title="Aún no tienes presupuestos" description="Crea límites en Plan → Presupuestos para que Home pueda responder cuánto te queda." />}
      </HomeSection>
    ),
    upcoming:(
      <HomeSection id="upcoming">
        <SectionHeader
          title="Próximos"
          description="¿Qué viene y qué ya requiere atención?"
          actions={<Button type="button" variant="outline" size="sm" onClick={()=>{setPlanningTab('subscriptions');setActiveTab('planning');}}>Ver Plan</Button>}
        />
        {home.upcoming.rows.length ? (
          <div className="grid gap-2">
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
          </div>
        ) : <EmptyState title="Nada próximo" description="No hay pagos o ingresos planificados pendientes en los próximos 7 días." />}
      </HomeSection>
    ),
    goals:(
      <HomeSection id="goals">
        <SectionHeader
          title="Metas"
          description="Objetivos activos que pueden requerir una acción."
          actions={<Button type="button" variant="outline" size="sm" onClick={()=>{setPlanningTab('goals');setActiveTab('planning');}}>Ver metas</Button>}
        />
        {home.goals.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {home.goals.map(({goal,remaining,schedule})=>(
              <Card key={goal.id}><CardContent className="pt-6">
                <ProgressMetric
                  label={goal.name}
                  current={goal.saved}
                  total={goal.target}
                  currentLabel="Ahorrado"
                  remaining={remaining}
                  supporting={schedule.requiredMonthly===null?'Sin fecha límite':schedule.overdue?'Fecha límite vencida':'Aporte mensual requerido: '+money(schedule.requiredMonthly)}
                  status={schedule.overdue?'danger':'neutral'}
                  statusLabel={goal.date?'Para '+dateLabel(goal.date):'Sin fecha límite'}
                />
              </CardContent></Card>
            ))}
          </div>
        ) : <EmptyState title="Aún no tienes metas activas" description="Crea una meta en Plan → Metas para seguirla desde Home." />}
      </HomeSection>
    ),
    investments:(
      <HomeSection id="investments">
        <SectionHeader
          title="Inversiones"
          description="Activos no líquidos y próximos vencimientos."
          actions={<Button type="button" variant="outline" size="sm" onClick={goToInvestments}>Ver inversiones</Button>}
        />
        {home.investments.activeCount ? (
          <Card><CardContent className="space-y-4 pt-6">
            <MetricCard label="Valor registrado" amount={home.investments.totalRegistered} tone="neutral" supporting={home.investments.activeCount+' inversiones activas · sin proyecciones futuras'} />
            <div className="space-y-2 border-t pt-4">
              {home.investments.rows.map(({investment,projection})=>(
                <div key={investment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{investment.name}</p>
                    <p className="text-xs text-muted-foreground">{investment.maturityDate ? 'Vence '+dateLabel(investment.maturityDate) : 'Sin vencimiento registrado'}</p>
                  </div>
                  <p className={projection.maturityReached?'font-medium text-warning':'text-muted-foreground'}>{projection.maturityReached?'Revisar vencimiento':projection.daysRemaining===null?'Sin fecha':projection.daysRemaining+' días'}</p>
                </div>
              ))}
            </div>
          </CardContent></Card>
        ) : <EmptyState title="Aún no hay inversiones" description="Registra certificados o depósitos a plazo desde Movimientos → Inversiones." />}
      </HomeSection>
    ),
  };

  return (
    <div className="space-y-7 pb-24 md:pb-8">
      <PageHeader
        title="Resumen"
        description={<>
          <span>Lo importante ahora · {formatPeriodRange(currentPeriod)}.</span>
          <span className="ml-2">{home.attentionCount>0 ? home.attentionCount+' elementos requieren atención.' : 'Sin alertas críticas.'}</span>
        </>}
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

      {preferences.visibleOrder.map(id=><div key={id}>{modules[id]}</div>)}

      <p className="text-xs text-muted-foreground">Home es un read model: análisis histórico y por categoría vive en Reportes; edición detallada vive en Plan y Movimientos.</p>
    </div>
  );
}

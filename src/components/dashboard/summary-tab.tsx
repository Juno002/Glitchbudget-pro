      </div>
      {action}
    </div>
  );
}

function SummaryPanelLoading() {
  return (
    <div className="mt-5 space-y-3" data-summary-loading="true" aria-label="Cargando sección">
      <Skeleton className="h-7 w-32 rounded-[var(--radius-interactive)]" />
      <Skeleton className="h-4 w-full rounded-[var(--radius-interactive)]" />
      <Skeleton className="h-4 w-2/3 rounded-[var(--radius-interactive)]" />
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
    today,
    locale,
    plannedOccurrences,
    recurringRules,
    confirmPlannedOccurrenceItem,
    skipPlannedOccurrenceItem,
    goals,
    investments,
    quarantinedDebtPayments,
  }=useFinances();
  const {activeTab,navigate}=useTabs();
  const money=usePrivateCurrency();
  const preferences=useHomePreferences();
  const previousActive=useRef<string|null>(null);
  const homeSectionRefs=useRef<Partial<Record<HomeModuleId,HTMLElement|null>>>({});

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
    homeSectionRefs.current[id]?.scrollIntoView({behavior:'smooth',block:'start'});
  },[activeTab,preferences.ready,preferences.preferences.defaultSection]);

  const goToAccounts=()=>navigate({area:'movements',movementSection:'accounts'});
  const goToInvestments=()=>navigate({area:'movements',movementSection:'investments'});

  const budgetState=loadableContentState(loading,home.budget.configuredCount>0);
  const upcomingState=loadableContentState(loading,home.upcoming.rows.length>0);
  const goalsState=loadableContentState(loading,home.goals.length>0);
  const investmentsState=loadableContentState(loading,home.investments.activeCount>0);

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
      <HomeSection id="position" sectionRef={node=>{homeSectionRefs.current.position=node;}} className="space-y-3">
        <SectionHeader
          title="Posición financiera"
          actions={<Button type="button" variant="ghost" size="sm" onClick={goToAccounts}>Ver cuentas <ArrowUpRight className="h-4 w-4" /></Button>}
        />
        {loading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map(i=><Skeleton key={i} className="h-[150px] w-full rounded-[var(--radius-card)]" />)}</div> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-home-layout="position-metrics">
            <PositionCard
              label="Disponible líquido"
              amount={home.position.liquidAssets}
              locale={locale}
              comparison={home.positionComparisons.liquidAvailable}
              tone={home.position.liquidAssets<0?'negative':'neutral'}
              help="Efectivo + bancos registrados en el ledger. No incluye crédito disponible."
              icon={WalletCards}
              variant="featured"
            />
            <PositionCard
              label="Patrimonio neto"
              amount={home.position.netWorth}
              locale={locale}
              comparison={home.positionComparisons.netWorth}
              tone={home.position.netWorth<0?'negative':'neutral'}
              help="Activos reales registrados menos pasivos registrados."
              icon={TrendingUp}
            />
            <PositionCard
              label="Deuda total"
              amount={home.position.liabilities}
              locale={locale}
              comparison={home.positionComparisons.totalDebt}
              tone={home.position.liabilities>0?'negative':'neutral'}
              help="Pasivos registrados, incluidas tarjetas y préstamos históricos compatibles."
              icon={CreditCard}
              variant="warm"
            />
            <PositionCard
              label="Inversiones"
              amount={home.position.investments}
              locale={locale}
              comparison={home.positionComparisons.investments}
              tone="neutral"
              help="Valor registrado de los activos de inversión. No incluye rendimiento proyectado."
              icon={Landmark}
              variant="mint"
            />
          </div>
        )}
      </HomeSection>
    ),
    budget:(
      <HomeSection id="budget" sectionRef={node=>{homeSectionRefs.current.budget=node;}}>
        <Card className="h-full">
          <CardContent className="p-5 sm:p-6">
            <PanelHeading
              title="Presupuesto disponible"
              action={<Button type="button" variant="ghost" size="sm" onClick={()=>navigate({area:'planning',planningTab:'budgets'})}>Ver presupuestos <ArrowUpRight className="h-4 w-4" /></Button>}
            />
            {budgetState==='loading' ? <SummaryPanelLoading /> : budgetState==='content' ? (
              <div className="mt-5 space-y-4" data-home-budget-summary="decision-first">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Disponible</p>
                    <MoneyValue
                      amount={home.budget.remaining}
                      tone={home.budget.remaining<0?'negative':'neutral'}
                      className="mt-1 block font-display text-[2rem] leading-none tracking-[-0.045em]"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Gastado {money(home.budget.spent)} · Presupuestado {money(home.budget.limit)}
                    </p>
                  </div>
                  <StatusBadge status={budgetStatus.status} label={budgetStatus.label} />
                </div>
                {home.budget.overCount>0 || home.budget.alertCount>0 ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border/70 pt-3 text-xs font-medium text-muted-foreground">
                    {home.budget.overCount>0 ? <span>{home.budget.overCount} {home.budget.overCount===1?'presupuesto excedido':'presupuestos excedidos'}</span> : null}
                    {home.budget.alertCount>0 ? <span>{home.budget.alertCount} {home.budget.alertCount===1?'presupuesto cerca del límite':'presupuestos cerca del límite'}</span> : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                className="mt-5"
                title="Aún no tienes presupuestos"
              />
            )}
          </CardContent>
        </Card>
      </HomeSection>
    ),
    upcoming:(
      <HomeSection id="upcoming" sectionRef={node=>{homeSectionRefs.current.upcoming=node;}}>
        <Card className="h-full">
          <CardContent className="p-5 sm:p-6">
            <PanelHeading
              title="Próximos pagos"
              action={<Button type="button" variant="ghost" size="sm" onClick={()=>navigate({area:'planning',planningTab:'subscriptions'})}>Ver Plan <ArrowUpRight className="h-4 w-4" /></Button>}
            />
            {upcomingState==='loading' ? <SummaryPanelLoading /> : upcomingState==='content' ? (
              <div className="mt-5 grid gap-2">
                {home.upcoming.rows.map(({occurrence,rule})=>(
                  <PlannedPaymentRow
                    key={occurrence.id}
                    title={rule.title}
                    amount={rule.amount}
                    dateLabel={dateLabel(occurrence.scheduledDate,locale)}
                    kindLabel={rule.direction==='expense'?'Gasto':'Ingreso'}
                    status={occurrenceDisplayStatus(occurrence,today)}
                    actions={{
                      confirm:()=>{void confirmPlannedOccurrenceItem(occurrence.id);},
                      skip:()=>{void skipPlannedOccurrenceItem(occurrence.id);},
                    }}
                  />
                ))}
                {home.upcoming.overdueCount>0 || home.upcoming.todayCount>0 ? (
                  <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-medium text-muted-foreground">
                    {home.upcoming.overdueCount>0 ? <span>{home.upcoming.overdueCount} vencidos</span> : null}
                    {home.upcoming.overdueCount>0 && home.upcoming.todayCount>0 ? <span aria-hidden="true">·</span> : null}
                    {home.upcoming.todayCount>0 ? <span>{home.upcoming.todayCount} para hoy</span> : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                className="mt-5"
                title="Nada próximo"
              />
            )}
          </CardContent>
        </Card>
      </HomeSection>
    ),
    goals:(
      <HomeSection id="goals" sectionRef={node=>{homeSectionRefs.current.goals=node;}}>
        <Card className="h-full">
          <CardContent className="p-5 sm:p-6">
            <PanelHeading
              title="Metas relevantes"
              action={<Button type="button" variant="ghost" size="sm" onClick={()=>navigate({area:'planning',planningTab:'goals'})}>Ver metas <ArrowUpRight className="h-4 w-4" /></Button>}
            />
            {goalsState==='loading' ? <SummaryPanelLoading /> : goalsState==='content' ? (
              <div className="mt-5 grid gap-5">
                {home.goals.map(({goal,remaining,schedule})=>(
                  <ProgressMetric
                    key={goal.id}
                    label={goal.name}
                    current={goal.saved}
                    total={goal.target}
                    currentLabel="Ahorrado"
                    remaining={remaining}
                    supporting={schedule.requiredMonthly===null?'Sin fecha límite':schedule.overdue?'Fecha límite vencida':'Aporta '+money(schedule.requiredMonthly)+'/mes'}
                    status={schedule.overdue?'danger':'neutral'}
                    statusLabel={goal.date?'Para '+dateLabel(goal.date,locale):'Sin fecha límite'}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                className="mt-5"
                title="Aún no tienes metas activas"
              />
            )}
          </CardContent>
        </Card>
      </HomeSection>
    ),
    investments:(
      <HomeSection id="investments" sectionRef={node=>{homeSectionRefs.current.investments=node;}}>
        <Card className="h-full">
          <CardContent className="p-5 sm:p-6">
            <PanelHeading
              title="Inversiones"
              action={<Button type="button" variant="ghost" size="sm" onClick={goToInvestments}>Ver inversiones <ArrowUpRight className="h-4 w-4" /></Button>}
            />
            {investmentsState==='loading' ? <SummaryPanelLoading /> : investmentsState==='content' ? (
              <div className="mt-5 space-y-3" data-home-investments="action-first">
                {home.investments.maturedCount>0 ? (
                  <StatusBadge
                    status="warning"
                    label={home.investments.maturedCount===1?'1 inversión requiere revisión':home.investments.maturedCount+' inversiones requieren revisión'}
                  />
                ) : null}
                <div className="space-y-2">
                  {home.investments.rows.map(({investment,projection})=>(
                    <div key={investment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-interactive)] bg-muted/45 px-3 py-3 text-sm">
                      <div>
                        <p className="font-semibold">{investment.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{investment.maturityDate ? 'Vence '+dateLabel(investment.maturityDate,locale) : 'Sin vencimiento registrado'}</p>
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
        {home.attentionCount>0 ? (
          <StatusBadge
            status="warning"
            label={home.attentionCount+' elementos requieren atención'}
            className="min-h-7 px-3"
          />
        ) : null}
        {(quarantinedDebtPayments?.length || 0)>0 ? (
          <StatusBadge
            status="warning"
            label={(quarantinedDebtPayments?.length || 0) === 1
              ? '1 pago tiene datos inválidos y no se incluye en saldos ni reportes'
              : (quarantinedDebtPayments?.length || 0)+' pagos tienen datos inválidos y no se incluyen en saldos ni reportes'}
            className="min-h-7 px-3"
          />
        ) : null}
        <PageHeader
          title={<><span>Resumen</span><span className="text-[hsl(var(--brand-coral))]">.</span></>}
          description={<strong className="font-semibold text-foreground">{formatPeriodRange(currentPeriod)}</strong>}
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
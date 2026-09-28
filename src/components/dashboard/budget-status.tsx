'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState, MetricCard, MoneyValue, ProgressMetric } from '@/components/finance-ui';
import { useFinances } from '@/contexts/finance-context';
import { useCategoryResolver } from '@/hooks/use-categories';
import { Skeleton } from '../ui/skeleton';
import { budgetRangeForPlan, budgetStatusForRange } from '@/domain/budgets';
import { contains } from '@/domain/periods';
import { localDate } from '@/lib/finance-calculations';
import { formatPeriodRange } from '@/lib/period-format';
import { BUDGET_PERIOD_LABELS } from './budget-period-controls';
import { useTabs } from '@/contexts/tabs-context';
import { Button } from '../ui/button';

export default function BudgetStatus() {
  const getCategoryInfo = useCategoryResolver();
  const { getBudgetStatusDetails, currentMonth, currentPeriod, periodStartDay, budgets, expenses, loading } = useFinances();
  const { setActiveTab } = useTabs();

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Presupuestos del período</CardTitle>
                <CardDescription>El progreso de tus gastos para el período seleccionado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i}>
                        <div className="flex justify-between mb-1">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-5 w-32" />
                        </div>
                        <Skeleton className="h-2 w-full" />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
  }

  const trackedBudgets = getBudgetStatusDetails(currentMonth).filter(b => b.configured);
  const totalLimit = trackedBudgets.reduce((sum, budget) => sum + budget.limit, 0);
  const totalSpent = trackedBudgets.reduce((sum, budget) => sum + budget.spent, 0);
  const totalRemaining = totalLimit - totalSpent;
  const anchor = contains(currentPeriod, localDate()) ? localDate() : currentPeriod.end;
  const otherBudgets = (budgets || [])
    .filter(plan => plan.periodType && plan.periodType !== 'monthly')
    .map(plan => budgetStatusForRange(plan, expenses || [], budgetRangeForPlan(plan, { periodStartDay })))
    .filter(detail => contains(detail.range, anchor))
    .sort((a, b) => b.percentage - a.percentage);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Presupuestos del período</CardTitle>
        <CardDescription>Límites mensuales · {formatPeriodRange(currentPeriod)}. Las asignaciones no cambian tus saldos.</CardDescription>
      </CardHeader>
      <CardContent>
        {trackedBudgets.length > 0 ? (
          <div className="space-y-6">
            <MetricCard
              label="Restante total"
              amount={totalRemaining}
              tone={totalRemaining < 0 ? 'negative' : 'neutral'}
              supporting={<>de <MoneyValue amount={totalLimit} className="text-xs" /> presupuestados · gastado <MoneyValue amount={totalSpent} className="text-xs" /></>}
            />
            {trackedBudgets.map((budget) => {
              const category = getCategoryInfo(budget.categoryId);
              if (!category) return null;
              
              const status = budget.status === 'over' ? 'danger' : budget.status === 'alert' ? 'warning' : 'success';
              const statusLabel = budget.status === 'over' ? 'Excedido' : budget.status === 'alert' ? 'Cerca del límite' : 'En presupuesto';

              return (
                <ProgressMetric
                  key={budget.categoryId}
                  label={<span className="inline-flex items-center gap-2"><category.icon className="h-4 w-4 text-muted-foreground" />{category.name}</span>}
                  current={budget.spent}
                  total={budget.limit}
                  currentLabel="Gastado"
                  totalLabel="Límite"
                  remaining={budget.limit - budget.spent}
                  status={status}
                  statusLabel={statusLabel}
                />
              );
            })}
          </div>
        ) : (
            <EmptyState
              title="Aún no tienes presupuestos mensuales"
              description="Ve a Plan → Presupuestos para definir límites y ver cuánto te queda en cada categoría."
            />
        )}
        {otherBudgets.length > 0 && <div className="mt-5 space-y-4 border-t pt-4">
          <p className="text-sm font-medium">Otros límites activos al {anchor}</p>
          <p className="text-xs text-muted-foreground">Se evalúan por separado y no se añaden al total mensual.</p>
          {otherBudgets.slice(0, 3).map(budget => <ProgressMetric
            key={budget.month + budget.categoryId}
            label={getCategoryInfo(budget.categoryId)?.name || budget.categoryId}
            supporting={BUDGET_PERIOD_LABELS[budget.range.kind] + ' · ' + formatPeriodRange(budget.range)}
            current={budget.spent} total={budget.limit} remaining={budget.remaining}
            currentLabel="Gastado" totalLabel="Límite"
            status={budget.status === 'over' ? 'danger' : budget.status === 'alert' ? 'warning' : 'success'}
            statusLabel={budget.status === 'over' ? 'Excedido' : budget.status === 'alert' ? 'Cerca del límite' : 'En presupuesto'}
          />)}
          <Button type="button" variant="outline" onClick={() => setActiveTab('reports')}>Ver detalle en Reportes</Button>
        </div>}
      </CardContent>
    </Card>
  );
}

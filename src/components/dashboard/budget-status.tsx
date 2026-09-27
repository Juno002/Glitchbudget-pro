'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState, MetricCard, MoneyValue, ProgressMetric } from '@/components/finance-ui';
import { useFinances } from '@/contexts/finance-context';
import { useCategoryResolver } from '@/hooks/use-categories';
import { Skeleton } from '../ui/skeleton';

export default function BudgetStatus() {
  const getCategoryInfo = useCategoryResolver();
  const { getBudgetStatusDetails, currentMonth, loading } = useFinances();

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

  const trackedBudgets = getBudgetStatusDetails(currentMonth).filter(b => b.limit > 0);
  const totalLimit = trackedBudgets.reduce((sum, budget) => sum + budget.limit, 0);
  const totalSpent = trackedBudgets.reduce((sum, budget) => sum + budget.spent, 0);
  const totalRemaining = totalLimit - totalSpent;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Presupuestos del período</CardTitle>
        <CardDescription>El progreso de tus gastos para el período seleccionado.</CardDescription>
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
                  remaining={budget.limit - budget.spent}
                  status={status}
                  statusLabel={statusLabel}
                />
              );
            })}
          </div>
        ) : (
            <EmptyState
              title="Aún no tienes presupuestos"
              description="Ve a Plan → Presupuestos para definir límites y ver cuánto te queda en cada categoría."
            />
        )}
      </CardContent>
    </Card>
  );
}

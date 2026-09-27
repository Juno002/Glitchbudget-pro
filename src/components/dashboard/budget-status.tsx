'use client';

import { useMoneyFormatter } from "@/hooks/use-money-visibility";

import { useTabs } from '@/contexts/tabs-context';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/financial-patterns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFinances } from '@/contexts/finance-context';
import { useCategoryResolver } from '@/hooks/use-categories';

import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

export default function BudgetStatus() {
  const { setActiveTab, setPlanTab } = useTabs();
  const formatCurrency = useMoneyFormatter();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Presupuestos del período</CardTitle>
        <CardDescription>El progreso de tus gastos para el período seleccionado.</CardDescription>
      </CardHeader>
      <CardContent>
        {trackedBudgets.length > 0 ? (
          <div className="space-y-6">
            {trackedBudgets.map((budget) => {
              const category = getCategoryInfo(budget.categoryId);
              if (!category) return null;

              const progress = Math.min((budget.spent / budget.limit) * 100, 100);

              return (
                <div key={budget.categoryId}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <category.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="text-sm">
                      <span className={cn("font-semibold", budget.status === 'over' ? "text-destructive" : "text-foreground")}>
                        {formatCurrency(budget.spent)}
                      </span>
                      <span className="text-muted-foreground"> / {formatCurrency(budget.limit)}</span>
                    </div>
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground">{budget.limit - budget.spent < 0 ? "Excedido" : "Restante"}: {formatCurrency(Math.abs(budget.limit - budget.spent))}</p>
                  <Progress
                    aria-label={`Consumo del presupuesto de ${category.name}`} value={progress}
                    className={cn('h-2',
                      budget.status === 'over' ? '[&>div]:bg-destructive' :
                      budget.status === 'alert' ? '[&>div]:bg-yellow-500' : ''
                    )}
                  />
                </div>
              );
            })}
          </div>
        ) : (
            <EmptyState title="Sin presupuestos en este período" description="Define límites por categoría para saber cuánto te queda por gastar." action={<Button variant="outline" onClick={() => { setPlanTab("budgets"); setActiveTab("planning"); }}>Crear presupuesto</Button>} />
        )}
      </CardContent>
    </Card>
  );
}

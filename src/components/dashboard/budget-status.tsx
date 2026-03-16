'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFinances } from '@/contexts/finance-context';
import { getCategoryInfo } from '@/lib/categories';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

export default function BudgetStatus() {
  const { getBudgetStatusDetails, currentMonth, loading } = useFinances();

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Presupuestos Mensuales</CardTitle>
                <CardDescription>El progreso de tus gastos para este mes.</CardDescription>
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
        <CardTitle>Presupuestos Mensuales</CardTitle>
        <CardDescription>El progreso de tus gastos para este mes.</CardDescription>
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
                  <Progress 
                    value={progress} 
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
            <p className="text-sm text-muted-foreground text-center py-4">No hay presupuestos definidos. Ve a la pestaña de Planificación para añadir algunos.</p>
        )}
      </CardContent>
    </Card>
  );
}

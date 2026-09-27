'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFinances } from '@/contexts/finance-context';
import { formatPeriodRange } from '@/lib/period-format';
import { PageHeader, SectionHeader, MetricCard } from '@/components/finance-ui';
import { Skeleton } from '@/components/ui/skeleton';
import BudgetStatus from './budget-status';
import { cn } from '@/lib/utils';

function formatMonth(value: string) {
  return format(new Date(`${value}-02`), 'MMMM', { locale:es });
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
              'rounded-full border px-3 py-1.5 text-xs transition-colors',
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
    getTotals,
    getPosition,
    loading,
    currentMonth,
    currentPeriod,
    periodStartDay,
  } = useFinances();
  const [periodLabel, setPeriodLabel] = useState('');

  useEffect(() => {
    setPeriodLabel(periodStartDay === 1 ? formatMonth(currentMonth) : formatPeriodRange(currentPeriod));
  }, [currentMonth, currentPeriod, periodStartDay]);

  const totals = getTotals(currentMonth);
  const position = getPosition();

  return (
    <div className="space-y-6">
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
              label="Deuda"
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

      <section className="space-y-3" aria-labelledby="activity-title">
        <SectionHeader
          title={<span id="activity-title">Actividad registrada</span>}
          description="Ingresos y gastos reales del período seleccionado."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Ingresos" amount={totals.recordedIncome} tone="positive" />
          <MetricCard label="Gastos" amount={totals.spending} tone="negative" />
          <MetricCard
            label="Resultado"
            amount={totals.monthlyResult}
            tone={totals.monthlyResult < 0 ? 'negative' : 'neutral'}
            supporting="Ingresos − gastos. No es el saldo de tus cuentas."
          />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="budget-title">
        <SectionHeader
          title={<span id="budget-title">Presupuesto restante</span>}
          description="Qué tan cerca estás de los límites que definiste en Plan."
        />
        <BudgetStatus />
      </section>

      <section className="space-y-3" aria-labelledby="saving-title">
        <SectionHeader
          title={<span id="saving-title">Ahorro sugerido</span>}
          description="Una referencia de planificación; cambiarla no mueve dinero."
        />
        <SaveStrategy />
      </section>

      <p className="text-xs text-muted-foreground">
        El análisis por categoría y las comparaciones históricas viven en Reportes.
      </p>
    </div>
  );
}

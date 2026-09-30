'use client';

import MovementsView from './MovementsView';
import AccountsOverview from './accounts-overview';
import InvestmentsManager from './investments-manager';
import { PageHeader, SectionHeader } from '@/components/finance-ui';

export default function MovementsTab() {
  return (
    <div className="space-y-8" data-movements-surface="prisma">
      <PageHeader
        title={<><span>Movimientos</span><span className="text-[hsl(var(--brand-coral))]">.</span></>}
        description="Actividad real, búsqueda y gestión de cuentas en un solo lugar."
      />

      <section className="space-y-3" aria-labelledby="history-title">
        <SectionHeader
          eyebrow="Actividad real"
          title={<span id="history-title">Historial</span>}
          description="Ingresos, gastos, transferencias, pagos y aportes registrados."
        />
        <MovementsView />
      </section>

      <section id="accounts-section" className="scroll-mt-24 space-y-3 border-t border-border/70 pt-7" aria-labelledby="accounts-title">
        <SectionHeader
          eyebrow="Gestión secundaria"
          title={<span id="accounts-title">Cuentas y tarjetas</span>}
          description="Saldos, transferencias, conciliación y deuda sin crear otro destino principal."
        />
        <AccountsOverview />
      </section>

      <section id="investments-section" className="scroll-mt-24 space-y-3 border-t border-border/70 pt-7" aria-labelledby="investments-title">
        <SectionHeader
          eyebrow="Activos no líquidos"
          title={<span id="investments-title">Inversiones</span>}
          description="Se conserva aquí hasta su migración visual final en 20.7."
        />
        <InvestmentsManager />
      </section>
    </div>
  );
}

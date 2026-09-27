'use client';

import MovementsView from './MovementsView';
import AccountsOverview from './accounts-overview';
import { PageHeader, SectionHeader } from '@/components/finance-ui';

export default function MovementsTab() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimientos"
        description="Consulta tu actividad real. Los planificados pendientes siguen separados hasta que los confirmes."
      />

      <section className="space-y-3" aria-labelledby="money-now-title">
        <SectionHeader
          title={<span id="money-now-title">Mi dinero hoy</span>}
          description="Cuentas, tarjetas y situación actual como navegación secundaria."
        />
        <AccountsOverview />
      </section>

      <section className="space-y-3" aria-labelledby="history-title">
        <SectionHeader
          title={<span id="history-title">Historial</span>}
          description="Busca, filtra y abre movimientos registrados."
        />
        <MovementsView />
      </section>
    </div>
  );
}

'use client';

import MovementsView from './MovementsView';
import AccountsOverview from './accounts-overview';
import InvestmentsManager from './investments-manager';
import { PageHeader, SectionHeader } from '@/components/finance-ui';

export default function MovementsTab() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimientos"
        description="Consulta tu actividad real. Los planificados pendientes siguen separados hasta que los confirmes."
      />

      <section className="space-y-3" aria-labelledby="history-title">
        <SectionHeader
          title={<span id="history-title">Historial</span>}
          description="Busca, filtra y abre movimientos registrados."
        />
        <MovementsView />
      </section>

      <section id="accounts-section" className="scroll-mt-24 space-y-3 border-t pt-6" aria-labelledby="accounts-title">
        <SectionHeader
          title={<span id="accounts-title">Cuentas y tarjetas</span>}
          description="Acceso secundario para consultar saldos, transferir, conciliar o administrar cuentas líquidas."
        />
        <AccountsOverview />
      </section>

      <section id="investments-section" className="scroll-mt-24 space-y-3 border-t pt-6" aria-labelledby="investments-title">
        <SectionHeader
          title={<span id="investments-title">Inversiones</span>}
          description="Activos no líquidos registrados por separado del efectivo y los bancos."
        />
        <InvestmentsManager />
      </section>
    </div>
  );
}

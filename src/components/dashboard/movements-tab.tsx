'use client';

import { useEffect, useRef } from 'react';
import MovementsView from './MovementsView';
import AccountsOverview from './accounts-overview';
import InvestmentsManager from './investments-manager';
import { PageHeader, SectionHeader } from '@/components/finance-ui';
import { useTabs } from '@/contexts/tabs-context';

export default function MovementsTab() {
  const { activeTab, movementSectionFocus, clearMovementSectionFocus } = useTabs();
  const historyRef = useRef<HTMLElement | null>(null);
  const accountsRef = useRef<HTMLElement | null>(null);
  const investmentsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (activeTab !== 'movements' || !movementSectionFocus) return;
    const target = movementSectionFocus === 'history'
      ? historyRef.current
      : movementSectionFocus === 'accounts'
        ? accountsRef.current
        : investmentsRef.current;
    if (!target) return;

    target.scrollIntoView({ behavior:'smooth', block:'start' });
    target.focus({ preventScroll:true });
    clearMovementSectionFocus();
  }, [activeTab, movementSectionFocus, clearMovementSectionFocus]);

  return (
    <div className="space-y-8" data-movements-surface="prisma">
      <PageHeader title={<><span>Movimientos</span><span className="text-[hsl(var(--brand-coral))]">.</span></>} />

      <section ref={historyRef} id="history-section" tabIndex={-1} className="scroll-mt-24 space-y-3" aria-labelledby="history-title">
        <SectionHeader title={<span id="history-title">Historial</span>} />
        <MovementsView />
      </section>

      <section ref={accountsRef} id="accounts-section" tabIndex={-1} className="scroll-mt-24 space-y-3 border-t border-border/70 pt-7" aria-labelledby="accounts-title">
        <SectionHeader title={<span id="accounts-title">Cuentas y tarjetas</span>} />
        <AccountsOverview />
      </section>

      <section ref={investmentsRef} id="investments-section" tabIndex={-1} className="scroll-mt-24 space-y-3 border-t border-border/70 pt-7" aria-labelledby="investments-title">
        <SectionHeader title={<span id="investments-title">Inversiones</span>} />
        <InvestmentsManager />
      </section>
    </div>
  );
}
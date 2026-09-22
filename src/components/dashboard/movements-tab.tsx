'use client';

import MovementsView from './MovementsView';
import AccountsOverview from './accounts-overview';

export default function MovementsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Movimientos</h2>
      <AccountsOverview />
      <MovementsView />
    </div>
  );
}

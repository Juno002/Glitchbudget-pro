'use client';

import MovementsView from './MovementsView';

export default function MovementsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Movimientos</h2>
      <MovementsView />
    </div>
  );
}

'use client';

import MovementsView from './MovementsView';
import DebtsTab from './debts-tab';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AccountsOverview from './accounts-overview';

export default function MovementsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Movimientos</h2>
      <AccountsOverview /><Dialog><DialogTrigger asChild><Button variant="outline">Ver tarjetas y deudas</Button></DialogTrigger><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>Tarjetas y deudas</DialogTitle></DialogHeader><DebtsTab /></DialogContent></Dialog>
      <MovementsView />
    </div>
  );
}

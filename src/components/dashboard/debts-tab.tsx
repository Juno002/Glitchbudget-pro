'use client';

import { AccountSelect } from './account-select';
import { selectActiveCreditCards, selectCardReadModel, selectHistoricalLoanReadModel } from '@/domain/ledger';
import { isHistoricalLoanDebt } from '@/domain/debt-semantics';
import { localDate } from '@/lib/finance-calculations';
import { useRef, useState } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Plus, ShieldCheck, HelpCircle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toCents, cn } from '@/lib/utils';
import { usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { EmptyState } from '@/components/finance-ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function DebtsTab() {
  const money = usePrivateCurrency();
  const { debts, expenses, debtPayments, addCreditCard, deleteDebt, addDebtPayment } = useFinances();
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCard, setNewCard] = useState({ name: '', creditLimit: '', billingDay: '15', paymentDay: '30' });

  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [accountId, setAccountId] = useState('');

  const activeCards = selectActiveCreditCards(debts || []);
  const historicalLoans = (debts || []).filter(isHistoricalLoanDebt);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    const limitCents = toCents(newCard.creditLimit);
    if (!newCard.name || limitCents <= 0) return;
    savingRef.current = true;
    setSaving(true);
    const success = await addCreditCard({
      name: newCard.name,
      creditLimit: limitCents,
      apr: 0,
      minPayment: 0,
      status: 'active',
      billingCycleDay: parseInt(newCard.billingDay),
      paymentDueDay: parseInt(newCard.paymentDay),
    });
    savingRef.current = false;
    setSaving(false);
    if (!success) return;
    setIsAddOpen(false);
    setNewCard({ name: '', creditLimit: '', billingDay: '15', paymentDay: '30' });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    const amtCents = toCents(paymentAmount);
    if (!paymentDebtId || amtCents <= 0) return;
    
    savingRef.current = true;
    setSaving(true);
    const success = await addDebtPayment({
      accountId: accountId || undefined,
      debtId: paymentDebtId,
      amount: amtCents,
      date: localDate(),
    });
    savingRef.current = false;
    setSaving(false);
    if (!success) return;
    setPaymentAmount('');
    setPaymentDebtId(null);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8" data-cards-prisma="true">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Crédito</p><h2 className="mt-1 font-display text-xl font-normal tracking-[-0.025em]">Tarjetas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Límites, saldo pendiente y pagos registrados.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={open => { if (!savingRef.current) setIsAddOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Nueva Tarjeta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-normal">Añadir tarjeta de crédito</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nombre de la Tarjeta</Label>
                <Input value={newCard.name} onChange={e => setNewCard({...newCard, name: e.target.value})} placeholder="Ej. Visa Platinum" required />
              </div>
              <div className="space-y-2">
                <Label>Límite Aprobado (RD$)</Label>
                <Input type="number" min="0.01" step="0.01" value={newCard.creditLimit} onChange={e => setNewCard({...newCard, creditLimit: e.target.value})} placeholder="0.00" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">Día de Corte <Popover><PopoverTrigger><HelpCircle className="w-3 h-3 text-muted-foreground"/></PopoverTrigger><PopoverContent className="text-xs w-48">Día del mes en que te facturan tus consumos.</PopoverContent></Popover></Label>
                  <Select value={newCard.billingDay} onValueChange={v => setNewCard({ ...newCard, billingDay: v })}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 31}, (_, i) => i + 1).map(d => <SelectItem key={d} value={d.toString()}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Día de Pago</Label>
                  <Select value={newCard.paymentDay} onValueChange={v => setNewCard({ ...newCard, paymentDay: v })}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 31}, (_, i) => i + 1).map(d => <SelectItem key={d} value={d.toString()}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button disabled={saving} type="submit" className="w-full">{saving ? 'Guardando…' : 'Guardar tarjeta'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {activeCards.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-10 w-10" />}
          title="Aún no tienes tarjetas"
          description="Registra una tarjeta de crédito para monitorear límites y pagos sin afectar tu efectivo disponible inmediatamente."
        />
      ) : (
        <div className="grid gap-4">
          {activeCards.map(debt => {
            const {
              signedBalance: currentDebt,
              isSurplus,
              absoluteBalance: absoluteDebt,
              availableLimit,
              utilizationPercent: percentUsed,
            } = selectCardReadModel(debt, expenses || [], debtPayments || [], localDate());

            return (
              <div key={debt.id} className="relative w-full overflow-hidden rounded-[var(--radius-card)] border bg-card p-5 shadow-[var(--shadow-control)]">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--brand-lavender)/0.12)]">
                      <CreditCard className="h-5 w-5 text-[hsl(var(--brand-lavender))]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg leading-tight">{debt.name}</h3>
                      <p className="text-xs text-muted-foreground">Corte: día {debt.billingCycleDay || '--'} • Pago: día {debt.paymentDueDay || '--'}</p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-bad/70 hover:bg-bad/10 hover:text-bad" aria-label={`Eliminar ${debt.name}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar esta tarjeta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará “{debt.name}”. Si conserva compras o pagos históricos vinculados, la operación puede ser rechazada para proteger el historial.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => void deleteDebt(debt.id)}>
                          Eliminar tarjeta
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="rounded-[var(--radius-interactive)] bg-muted/45 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Disponible para Uso</p>
                    <p className="text-xl font-bold font-mono tracking-tight text-primary">
                      {money(availableLimit)}
                    </p>
                  </div>
                  <div className={cn("rounded-[var(--radius-interactive)] border p-3 transition-colors", isSurplus ? "bg-good/5 border-good/20" : "border-transparent bg-muted/45")}>
                    <p className="text-xs text-muted-foreground mb-1">{isSurplus ? 'Saldo a Favor' : 'Saldo pendiente'}</p>
                    <p className={cn("text-xl font-bold font-mono tracking-tight", isSurplus ? "text-good" : (currentDebt === 0 ? "text-muted-foreground" : "text-bad"))}>
                      {money(absoluteDebt)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Uso del límite base</span>
                    <span className="font-mono">{isSurplus ? '0' : percentUsed.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-[var(--motion-content)]", percentUsed > 80 ? "bg-bad" : percentUsed > 50 ? "bg-warning" : "bg-good")}
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                </div>

                <Dialog open={paymentDebtId === debt.id} onOpenChange={(open) => {
                  if (savingRef.current) return;
                  setPaymentAmount('');
                  if (open) setPaymentDebtId(debt.id);
                  else setPaymentDebtId(null);
                }}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      Registrar Pago / Abono
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-display text-2xl font-normal">Abonar a {debt.name}</DialogTitle>
                    </DialogHeader>
                    {isSurplus ? (
                       <div className="bg-primary/10 p-3 rounded-md mb-2 flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-primary dark:text-primary/80">Tienes saldo a favor de {money(absoluteDebt)}. Cualquier pago adicional aumentará este colchón temporal en la tarjeta.</p>
                       </div>
                    ) : (
                       <div className="bg-black/5 dark:bg-[rgba(255,255,255,0.05)] p-3 rounded-md mb-2">
                          <p className="text-xs text-muted-foreground">Tu deuda actual con esta tarjeta es de <span className="text-rose-500 dark:text-rose-400 font-bold">{money(currentDebt)}</span>.</p>
                       </div>
                    )}
                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                      <AccountSelect cashDefault value={accountId} onChange={setAccountId} disabled={saving} />
                      <div className="space-y-2">
                         <Label>Monto a Pagar o Abonar</Label>
                         <Input type="number" min="0.01" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" autoFocus required />
                      </div>
                      <p className="text-[11px] text-muted-foreground italic">
                        Los pagos reducen tu efectivo disponible global para saldar la deuda o aumentar tu límite temporal.
                      </p>
                      <Button disabled={saving} type="submit" className="w-full">{saving ? 'Registrando…' : 'Confirmar pago'}</Button>
                    </form>
                  </DialogContent>
                </Dialog>

              </div>
            );
          })}
        </div>
      )}

      {historicalLoans.length > 0 && (
        <section className="space-y-3" aria-labelledby="historical-loans-title">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Compatibilidad histórica</p>
            <h3 id="historical-loans-title" className="mt-1 font-display text-lg font-normal tracking-[-0.02em]">Préstamos importados</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Se conservan solo para lectura y para que el patrimonio refleje el pasivo histórico correctamente.
            </p>
          </div>
          <div className="grid gap-3">
            {historicalLoans.map(debt => {
              const { originalPrincipal, compatibilityBalance } = selectHistoricalLoanReadModel(debt, debtPayments || [], localDate());
              return (
                <div key={debt.id} className="rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{debt.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {debt.status === 'closed' ? 'Histórico cerrado' : 'Histórico importado'} · solo lectura
                      </p>
                    </div>
                    <div className="grid shrink-0 gap-2 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground">Principal original</p>
                        <p className="font-mono text-sm">{money(originalPrincipal)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Saldo compatible</p>
                        <p className="font-mono text-base font-semibold">{money(compatibilityBalance)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Plus, ShieldCheck, HelpCircle, Trash2 } from 'lucide-react';
import { formatCurrency, toCents, cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function DebtsTab() {
  const { debts, expenses, debtPayments, addDebt, deleteDebt, addDebtPayment } = useFinances();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDebt, setNewDebt] = useState({ name: '', principal: '', billingDay: '15', paymentDay: '30' });

  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const activeDebts = debts?.filter(d => d.status === 'active') || [];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limitCents = toCents(newDebt.principal);
    if (!newDebt.name || limitCents <= 0) return;
    addDebt({
      name: newDebt.name,
      type: 'credit_card',
      principal: limitCents,
      apr: 0,
      minPayment: 0,
      status: 'active',
      billingCycleDay: parseInt(newDebt.billingDay),
      paymentDueDay: parseInt(newDebt.paymentDay),
    });
    setIsAddOpen(false);
    setNewDebt({ name: '', principal: '', billingDay: '15', paymentDay: '30' });
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amtCents = toCents(paymentAmount);
    if (!paymentDebtId || amtCents <= 0) return;
    
    addDebtPayment({
      debtId: paymentDebtId,
      amount: amtCents,
      date: new Date().toISOString().slice(0, 10),
    });
    setPaymentAmount('');
    setPaymentDebtId(null);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Tarjetas</h2>
          <p className="text-sm text-muted-foreground mt-1">Gestiona los límites de tus deudas activas</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#00e5ff]/20 text-[#00e5ff] hover:bg-[#00e5ff]/30">
              <Plus className="w-4 h-4 mr-2" /> Nueva Tarjeta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Tarjeta de Crédito</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nombre de la Tarjeta</Label>
                <Input value={newDebt.name} onChange={e => setNewDebt({...newDebt, name: e.target.value})} placeholder="Ej. Visa Platinum" required />
              </div>
              <div className="space-y-2">
                <Label>Límite Aprobado (RD$)</Label>
                <Input type="number" step="0.01" value={newDebt.principal} onChange={e => setNewDebt({...newDebt, principal: e.target.value})} placeholder="0.00" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">Día de Corte <Popover><PopoverTrigger><HelpCircle className="w-3 h-3 text-muted-foreground"/></PopoverTrigger><PopoverContent className="text-xs w-48">Día del mes en que te facturan tus consumos.</PopoverContent></Popover></Label>
                  <Select value={newDebt.billingDay} onValueChange={v => setNewDebt({ ...newDebt, billingDay: v })}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 31}, (_, i) => i + 1).map(d => <SelectItem key={d} value={d.toString()}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Día de Pago</Label>
                  <Select value={newDebt.paymentDay} onValueChange={v => setNewDebt({ ...newDebt, paymentDay: v })}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 31}, (_, i) => i + 1).map(d => <SelectItem key={d} value={d.toString()}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">Guardar Tarjeta</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {activeDebts.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-black/10 dark:border-white/10">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-1">Aún no tienes tarjetas</h3>
          <p className="text-sm text-muted-foreground">Registra una tarjeta de crédito para monitorear límites y pagos sin afectar tu efectivo disponible inmediatamente.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {activeDebts.map(debt => {
            const ccExpenses = (expenses || []).filter(e => e.debtId === debt.id).reduce((sum, e) => sum + e.amount, 0);
            const ccPayments = (debtPayments || []).filter(p => p.debtId === debt.id).reduce((sum, p) => sum + p.amount, 0);
            
            const currentDebt = ccExpenses - ccPayments; // Positive means we owe money, negative means we are in surplus
            const isSurplus = currentDebt < 0;
            const absoluteDebt = Math.abs(currentDebt);
            
            const availableLimit = debt.principal - currentDebt;
            const percentUsed = Math.min(100, Math.max(0, (currentDebt / debt.principal) * 100));

            return (
              <div key={debt.id} className="relative overflow-hidden w-full backdrop-blur-md bg-[rgba(255,255,255,0.03)] border border-black/10 dark:border-white/10 rounded-[20px] p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg leading-tight">{debt.name}</h3>
                      <p className="text-xs text-muted-foreground">Corte: día {debt.billingCycleDay || '--'} • Pago: día {debt.paymentDueDay || '--'}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-bad/50 hover:bg-bad/10 hover:text-bad" onClick={() => deleteDebt(debt.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-black/5 dark:bg-white/5 border border-[rgba(255,255,255,0.04)] rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Disponible para Uso</p>
                    <p className="text-xl font-bold font-mono tracking-tight text-primary">
                      {formatCurrency(availableLimit)}
                    </p>
                  </div>
                  <div className={cn("border rounded-xl p-3 transition-colors", isSurplus ? "bg-good/5 border-good/20" : "bg-black/5 dark:bg-white/5 border-[rgba(255,255,255,0.04)]")}>
                    <p className="text-xs text-muted-foreground mb-1">{isSurplus ? 'Saldo a Favor' : 'Balance Deudado'}</p>
                    <p className={cn("text-xl font-bold font-mono tracking-tight", isSurplus ? "text-good" : (currentDebt === 0 ? "text-slate-300 dark:text-slate-400" : "text-bad"))}>
                      {formatCurrency(absoluteDebt)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Uso del límite base</span>
                    <span className="font-mono">{isSurplus ? '0' : percentUsed.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500", percentUsed > 80 ? "bg-bad" : percentUsed > 50 ? "bg-warning" : "bg-good")}
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                </div>

                <Dialog open={paymentDebtId === debt.id} onOpenChange={(open) => {
                  if (open) setPaymentDebtId(debt.id);
                  else setPaymentDebtId(null);
                }}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 text-foreground transition-all">
                      Registrar Pago / Abono
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Abonar a {debt.name}</DialogTitle>
                    </DialogHeader>
                    {isSurplus ? (
                       <div className="bg-primary/10 p-3 rounded-md mb-2 flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-primary dark:text-primary/80">Tienes saldo a favor de {formatCurrency(absoluteDebt)}. Cualquier pago adicional aumentará este colchón temporal en la tarjeta.</p>
                       </div>
                    ) : (
                       <div className="bg-black/5 dark:bg-[rgba(255,255,255,0.05)] p-3 rounded-md mb-2">
                          <p className="text-xs text-muted-foreground">Tu deuda actual con esta tarjeta es de <span className="text-rose-500 dark:text-rose-400 font-bold">{formatCurrency(currentDebt)}</span>.</p>
                       </div>
                    )}
                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                      <div className="space-y-2">
                         <Label>Monto a Pagar o Abonar</Label>
                         <Input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" autoFocus required />
                      </div>
                      <p className="text-[11px] text-muted-foreground italic">
                        Los pagos reducen tu efectivo disponible global para saldar la deuda o aumentar tu límite temporal.
                      </p>
                      <Button type="submit" className="w-full">Confirmar Transferencia</Button>
                    </form>
                  </DialogContent>
                </Dialog>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

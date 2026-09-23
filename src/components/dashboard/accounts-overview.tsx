'use client';
import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { accountBalance, accountEntries, addAccount, saveTransfer, debtBalance, reconcileDebt } from '@/lib/accounts';
import { localDate } from '@/lib/finance-calculations';
import { formatCurrency, toCents } from '@/lib/utils';
import { friendlyError } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AccountSelect } from './account-select';

export default function AccountsOverview() {
  const data = useLiveQuery(() => db.transaction('r', [db.accounts, db.account_transfers, db.incomes, db.expenses, db.debt_payments, db.debts], async () => ({ accounts: await db.accounts.toArray(), transfers: await db.account_transfers.toArray(), incomes: await db.incomes.toArray(), expenses: await db.expenses.toArray(), payments: await db.debt_payments.toArray(), debts: await db.debts.toArray() })));
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [editingAccount, setEditingAccount] = useState('');
  const [editingTransfer, setEditingTransfer] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'cash' | 'bank'>('bank');
  const [opening, setOpening] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localDate());
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState('');
  const [card, setCard] = useState('');
  const [cardBalance, setCardBalance] = useState('');
  const run = async (action: () => Promise<void>, title: string) => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try { await action(); toast({ title }); } catch (error) { toast({ title: 'No se guardó el cambio', description: friendlyError(error), variant: 'destructive' }); }
    finally { locked.current = false; setBusy(false); }
  };
  if (!data) return null;
  const today = localDate();
  const cash = data.accounts.filter(a => a.type === 'cash').reduce((sum,a) => sum + accountBalance(a,data,today),0);
  const bank = data.accounts.filter(a => a.type === 'bank').reduce((sum,a) => sum + accountBalance(a,data,today),0);
  const cards = data.debts.filter(d => d.type === 'credit_card');
  const balances = cards.map(d => ({ ...d, balance: debtBalance(d,data.expenses,data.payments,today) }));
  const owed = balances.reduce((sum,d) => sum + Math.max(0,d.balance),0);
  const credit = balances.reduce((sum,d) => sum + Math.max(0,-d.balance),0);
  const unassigned = data.incomes.filter(i => !i.accountId).length + data.expenses.filter(e => e.paymentMethod !== 'credit' && !e.accountId).length + data.payments.filter(p => !p.accountId).length;
  const account = data.accounts.find(a => a.id === selected);
  return <section className="rounded-2xl border bg-card p-4 space-y-4" aria-label="Cuentas y situación actual">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-lg">Mi dinero hoy</h2><p className="text-xs text-muted-foreground">Saldos registrados al {today}. Independientes del mes del presupuesto.</p></div>
      <Dialog open={open} onOpenChange={v => { if (!locked.current) setOpen(v); }}><DialogTrigger asChild><Button variant="outline">{data.accounts.length ? 'Gestionar cuentas' : 'Configurar mis saldos'}</Button></DialogTrigger>
        <DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Cuentas y transferencias</DialogTitle><DialogDescription>Introduce lo que tienes hoy. El historial anterior se conserva sin atribuirlo a tus cuentas. No introduzcas números de cuenta ni credenciales.</DialogDescription></DialogHeader>
          <fieldset disabled={busy} className="space-y-6 min-w-0">
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); void run(async () => { await addAccount({ id: editingAccount || crypto.randomUUID(), name, type, openingBalance: toCents(opening), startDate: data.accounts.find(a => a.id === editingAccount)?.startDate || localDate() }, !!editingAccount); setName(''); setOpening(''); setEditingAccount(''); }, editingAccount ? 'Cuenta actualizada' : 'Cuenta creada'); }}>
              <h3 className="font-semibold">{editingAccount ? 'Editar cuenta y saldo inicial' : 'Añadir efectivo o banco'}</h3>
              <label className="block text-sm">Nombre<Input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Banco principal o Efectivo" /></label>
              <label className="block text-sm">Tipo<select className="w-full rounded-lg border bg-background p-2" disabled={!!data.accounts.find(a => a.id === editingAccount)?.isDefaultCash} value={type} onChange={e=>setType(e.target.value as 'cash' | 'bank')}><option value="bank">Cuenta bancaria</option><option value="cash">Efectivo</option></select></label>
              <label className="block text-sm">{editingAccount ? 'Saldo inicial (RD$)' : 'Saldo actual (RD$)'}<Input required type="number" min="0" step="0.01" value={opening} onChange={e=>setOpening(e.target.value)} /></label>
              <p className="text-xs text-muted-foreground">{editingAccount ? 'Corrige el saldo con el que comenzaste el seguimiento. Los movimientos registrados después se suman o restan a esta cifra.' : 'Incluye los movimientos ya realizados hoy. Registra con esta cuenta solo los que hagas después de crearla. Este saldo no es un ingreso mensual.'}</p>
              <Button type="submit">{editingAccount ? 'Guardar cuenta' : 'Crear cuenta'}</Button>{editingAccount && <Button type="button" variant="ghost" onClick={()=>{setEditingAccount('');setName('');setOpening('');}}>Cancelar edición</Button>}
            </form>
            {data.accounts.length >= 2 && <form className="space-y-3 border-t pt-4" onSubmit={e=>{ e.preventDefault(); void run(async()=>{ await saveTransfer({id:editingTransfer || crypto.randomUUID(),fromAccountId:from,toAccountId:to,amount:toCents(amount),date,note},!!editingTransfer);setAmount('');setNote('');setEditingTransfer(''); },editingTransfer ? 'Transferencia actualizada' : 'Transferencia registrada'); }}>
              <h3 className="font-semibold">Mover dinero entre mis cuentas</h3>
              <AccountSelect value={from} onChange={setFrom}/><AccountSelect value={to} onChange={setTo} label="Cuenta de destino"/>
              <label className="block text-sm">Monto (RD$)<Input required type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
              <label className="block text-sm">Fecha<Input required type="date" max={today} value={date} onChange={e=>setDate(e.target.value)}/></label>
              <label className="block text-sm">Nota<Input maxLength={250} value={note} onChange={e=>setNote(e.target.value)} placeholder="Ej. Retiro en cajero"/></label>
              <p className="text-xs text-muted-foreground">No cuenta como ingreso ni gasto. Si hubo comisión, regístrala como un gasto separado desde la cuenta que la pagó.</p>
              <Button disabled={!from || !to || from===to} type="submit">{editingTransfer ? 'Guardar transferencia' : 'Registrar transferencia'}</Button>{editingTransfer && <Button type="button" variant="ghost" onClick={()=>{setEditingTransfer('');setAmount('');setNote('');}}>Cancelar edición</Button>}
            </form>}
            {cards.length > 0 && <form className="space-y-3 border-t pt-4" onSubmit={e=>{e.preventDefault();void run(async()=>{await reconcileDebt(card,toCents(cardBalance));setCardBalance('');},'Saldo de tarjeta ajustado');}}>
              <h3 className="font-semibold">Conciliar deuda actual de una tarjeta</h3>
              <label className="block text-sm">Tarjeta<select required className="w-full rounded-lg border bg-background p-2" value={card} onChange={e=>setCard(e.target.value)}><option value="">Selecciona una tarjeta</option>{cards.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
              <label className="block text-sm">Deuda actual (RD$)<Input required type="number" step="0.01" value={cardBalance} onChange={e=>setCardBalance(e.target.value)}/></label>
              <p className="text-xs text-muted-foreground">Introduce lo que debes, no el límite. Un valor negativo indica saldo a favor. Se ajusta el saldo sin crear un gasto ni cambiar tus compras anteriores.</p>
              <Button type="submit">Confirmar saldo actual</Button>
            </form>}
          </fieldset>{busy && <p role="status" className="text-sm">Guardando…</p>}
        </DialogContent>
      </Dialog>
    </div>
    {!data.accounts.length ? <p className="text-sm text-muted-foreground">Añade el efectivo y cada banco para conocer dónde está tu dinero. El presupuesto mensual continuará funcionando como hasta ahora.</p> : <>
      {unassigned > 0 && <details className="rounded-xl border p-3 text-sm"><summary className="cursor-pointer font-medium">{unassigned} movimientos anteriores sin cuenta</summary><p className="mt-2 text-muted-foreground">Se conservan en los reportes, pero no modifican tus saldos. Incluye el dinero que te quedaba al comenzar el seguimiento en el saldo inicial de Efectivo (pulsa la cuenta → Editar cuenta). Si un movimiento posterior a esa fecha no está incluido en el saldo inicial, puedes editarlo en el historial y asignarle Efectivo. No vuelvas a registrar el ingreso: se contaría dos veces.</p></details>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['Efectivo',cash],['Bancos',bank],['Deuda de tarjetas',owed],['Saldo neto registrado',cash+bank+credit-owed]].map(([label,value])=><div key={String(label)} className="rounded-xl border p-3 min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold break-words">{formatCurrency(Number(value))}</p></div>)}</div>
      <p className="text-xs text-muted-foreground">El saldo neto incluye solo las cuentas y tarjetas registradas. El crédito disponible no es dinero propio. {credit > 0 && <>Saldo a favor en tarjetas: {formatCurrency(credit)}.</>}</p>
      <div className="grid sm:grid-cols-2 gap-2">{data.accounts.map(a=><button key={a.id} onClick={()=>setSelected(selected===a.id?'':a.id)} aria-expanded={selected===a.id} className="text-left flex flex-wrap justify-between gap-2 rounded-xl border p-3 hover:bg-muted/30"><span className="break-words min-w-0">{a.name}<span className="block text-xs text-muted-foreground">{a.isDefaultCash ? 'Efectivo predeterminado' : a.type==='cash'?'Efectivo':'Banco'} · Desde {a.startDate}</span></span><strong>{formatCurrency(accountBalance(a,data))}</strong></button>)}</div>
      {balances.map(d=><p key={d.id} className="text-sm break-words">{d.name}: {d.balance >= 0 ? 'deuda' : 'saldo a favor'} {formatCurrency(Math.abs(d.balance))}</p>)}
      {account && <div className="border-t pt-3 space-y-2"><h3 className="font-semibold">Movimientos de {account.name}</h3><Button variant="outline" onClick={()=>{setEditingAccount(account.id);setName(account.name);setType(account.type);setOpening(String(account.openingBalance/100));setOpen(true);}}>Editar cuenta</Button><p className="text-xs text-muted-foreground">Saldo inicial: {formatCurrency(account.openingBalance)} · {account.startDate}</p>{accountEntries(account,data).slice(0,50).map(r=><div key={r.kind+r.id} className="flex justify-between gap-3 text-sm border-b py-2"><div className="min-w-0 break-words">{r.description}{r.kind === 'transfer' && <button className="block underline text-primary" onClick={()=>{const t=data.transfers.find(t=>t.id===r.id);if(t){setEditingTransfer(t.id);setFrom(t.fromAccountId);setTo(t.toAccountId);setAmount(String(t.amount/100));setDate(t.date);setNote(t.note);setOpen(true);}}}>Ver / editar transferencia</button>}<span className="block text-xs text-muted-foreground">{r.date} · {r.kind==='transfer'?'Transferencia':r.kind==='payment'?'Pago de tarjeta':r.kind==='income'?'Ingreso':'Gasto'}</span></div><span className="shrink-0">{r.amount>0?'+':''}{formatCurrency(r.amount)}</span></div>)}<p className="text-xs text-muted-foreground">Hasta 50 movimientos recientes. Los movimientos anteriores sin cuenta siguen en tus reportes.</p></div>}
    </>}
  </section>;
}

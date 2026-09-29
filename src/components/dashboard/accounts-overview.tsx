'use client';
import { useState } from 'react';
import { localDate } from '@/lib/finance-calculations';
import { usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AccountSelect } from './account-select';
import DebtsTab from './debts-tab';
import { ActionMenu, DetailHeader } from '@/components/finance-ui';
import { Pencil, Settings2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinances } from '@/contexts/finance-context';
import { useAccountOverviewData } from '@/hooks/use-finance-queries';
import { useAccountManagement } from '@/hooks/use-account-management';
import { selectAccountsOverviewModel } from '@/domain/dashboard-read-models';

export default function AccountsOverview() {
  const money = usePrivateCurrency();
  const { currency } = useFinances();
  const data = useAccountOverviewData();
  const management = useAccountManagement(data?.accounts || [], currency);
  const [selected, setSelected] = useState('');
  const {
    open, setOpen, busy, locked,
    editingAccount, setEditingAccount, editingTransfer, setEditingTransfer,
    name, setName, cashOpen, setCashOpen, cardsOpen, setCardsOpen,
    opening, setOpening, from, setFrom, to, setTo, amount, setAmount,
    date, setDate, note, setNote, card, setCard, cardBalance, setCardBalance,
    resetAccountDraft, openManagement, editAccount, editTransfer,
    submitAccount, submitTransfer, submitCardReconciliation, submitCashOpening,
  } = management;
  if (!data) return <Skeleton className="h-28 w-full rounded-2xl" />;
  const today = localDate();
  const overview = selectAccountsOverviewModel(data, today);
  const { cards, liquidAccounts, unassignedCount: unassigned, accounts: accountViews } = overview;
  const { cash, bank, investmentAssets, balances, liabilities: owed, cardPositiveBalance: credit, netWorth } = overview.position;
  const accountView = accountViews.find(row => row.account.id === selected);
  const account = accountView?.account;
  return <section className="rounded-2xl border bg-card p-4 space-y-4" aria-label="Cuentas y situación actual">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-semibold">Cuentas y tarjetas</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <p className="whitespace-nowrap"><span className="text-muted-foreground">Efectivo</span> {money(cash)}</p>
          <p className="whitespace-nowrap"><span className="text-muted-foreground">Bancos</span> {money(bank)}</p>
          {investmentAssets > 0 && <p className="whitespace-nowrap"><span className="text-muted-foreground">Inversiones</span> {money(investmentAssets)}</p>}
          <p className="whitespace-nowrap"><span className="text-muted-foreground">Deuda</span> {money(owed)}</p>
        </div>
      </div>
      <ActionMenu
        label="Gestionar cuentas y tarjetas"
        items={[
          {
            label: 'Bancos y transferencias',
            icon: <Settings2 className="h-4 w-4" />,
            onSelect: openManagement,
          },
          {
            label: 'Tarjetas y pagos',
            icon: <Settings2 className="h-4 w-4" />,
            onSelect: () => setCardsOpen(true),
          },
        ]}
      />
      <Dialog open={open} onOpenChange={v => { if (!locked.current) setOpen(v); }}>
        <DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Bancos y transferencias</DialogTitle><DialogDescription>Registra tus bancos con su saldo actual. Efectivo se administra automáticamente con tus ingresos y gastos.</DialogDescription></DialogHeader>
          <fieldset disabled={busy} className="space-y-6 min-w-0">
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); void submitAccount(); }}>
              <h3 className="font-semibold">{editingAccount ? 'Editar cuenta y saldo inicial' : 'Añadir cuenta bancaria'}</h3>
              <label className="block text-sm">Nombre<Input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Banco principal" /></label>
              <label className="block text-sm">{editingAccount ? `Saldo inicial (${currency})` : `Saldo actual (${currency})`}<Input required type="number" min="0" step="0.01" value={opening} onChange={e=>setOpening(e.target.value)} /></label>
              <p className="text-xs text-muted-foreground">{editingAccount ? 'Corrige el saldo con el que comenzaste el seguimiento. Los movimientos registrados después se suman o restan a esta cifra.' : 'Incluye los movimientos ya realizados hoy. Registra con esta cuenta solo los que hagas después de crearla. Este saldo no es un ingreso mensual.'}</p>
              <Button type="submit">{editingAccount ? 'Guardar cuenta' : 'Crear cuenta'}</Button>{editingAccount && <Button type="button" variant="ghost" onClick={resetAccountDraft}>Cancelar edición</Button>}
            </form>
            {liquidAccounts.length >= 2 && <form className="space-y-3 border-t pt-4" onSubmit={e=>{ e.preventDefault(); void submitTransfer(); }}>
              <h3 className="font-semibold">Mover dinero entre mis cuentas</h3>
              <AccountSelect value={from} onChange={setFrom}/><AccountSelect value={to} onChange={setTo} label="Cuenta de destino"/>
              <label className="block text-sm">{`Monto (${data.accounts.find(a => a.id === from)?.currency || currency})`}<Input required type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
              <label className="block text-sm">Fecha<Input required type="date" max={today} value={date} onChange={e=>setDate(e.target.value)}/></label>
              <label className="block text-sm">Nota<Input maxLength={250} value={note} onChange={e=>setNote(e.target.value)} placeholder="Ej. Retiro en cajero"/></label>
              <p className="text-xs text-muted-foreground">No cuenta como ingreso ni gasto. Si hubo comisión, regístrala como un gasto separado desde la cuenta que la pagó.</p>
              <Button disabled={!from || !to || from===to} type="submit">{editingTransfer ? 'Guardar transferencia' : 'Registrar transferencia'}</Button>{editingTransfer && <Button type="button" variant="ghost" onClick={()=>{setEditingTransfer('');setAmount('');setNote('');}}>Cancelar edición</Button>}
            </form>}
            {cards.length > 0 && <form className="space-y-3 border-t pt-4" onSubmit={e=>{e.preventDefault();void submitCardReconciliation();}}>
              <h3 className="font-semibold">Conciliar deuda actual de una tarjeta</h3>
              <label className="block text-sm">Tarjeta<select required className="w-full rounded-lg border bg-background p-2" value={card} onChange={e=>setCard(e.target.value)}><option value="">Selecciona una tarjeta</option>{cards.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
              <label className="block text-sm">{`Deuda actual (${currency})`}<Input required type="number" step="0.01" value={cardBalance} onChange={e=>setCardBalance(e.target.value)}/></label>
              <p className="text-xs text-muted-foreground">Introduce lo que debes, no el límite. Un valor negativo indica saldo a favor. Se ajusta el saldo sin crear un gasto ni cambiar tus compras anteriores.</p>
              <Button type="submit">Confirmar saldo actual</Button>
            </form>}
          </fieldset>{busy && <p role="status" className="text-sm">Guardando…</p>}
        </DialogContent>
      </Dialog>
      <Dialog open={cardsOpen} onOpenChange={setCardsOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tarjetas y pagos</DialogTitle>
            <DialogDescription>Consulta y administra tus tarjetas sin convertirlas en una sección principal.</DialogDescription>
          </DialogHeader>
          <DebtsTab />
        </DialogContent>
      </Dialog>
    </div>
    <details className="group"><summary className="cursor-pointer text-sm text-muted-foreground">Ver cuentas y deuda</summary><div className="space-y-3 pt-3">
    {!liquidAccounts.length ? <p className="text-sm text-muted-foreground">Efectivo se prepara automáticamente. Puedes añadir bancos cuando lo necesites.</p> : <>
      {unassigned > 0 && <details className="rounded-xl border p-3 text-sm"><summary className="cursor-pointer font-medium">{unassigned} movimientos anteriores sin cuenta</summary><p className="mt-2 text-muted-foreground">Se conservan en los reportes, pero no modifican tus saldos. Incluye el dinero que te quedaba al comenzar el seguimiento en el saldo inicial de Efectivo (Ver cuentas y deuda → Efectivo → Ajustar saldo inicial). Si un movimiento posterior a esa fecha no está incluido en el saldo inicial, puedes editarlo en el historial y asignarle Efectivo. No vuelvas a registrar el ingreso: se contaría dos veces.</p></details>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[['Inversiones registradas',investmentAssets],['Deuda de tarjetas',owed],['Saldo neto registrado',netWorth]].map(([label,value])=><div key={String(label)} className="rounded-xl border p-3 min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold break-words">{money(Number(value))}</p></div>)}</div>
      <p className="text-xs text-muted-foreground">El saldo neto incluye efectivo, bancos, inversiones al valor actualmente registrado y tarjetas. Las proyecciones futuras de rendimiento no se suman. El crédito disponible no es dinero propio. {credit > 0 && <>Saldo a favor en tarjetas: {money(credit)}.</>}</p>
      <div className="grid sm:grid-cols-2 gap-2">{accountViews.map(({account:a,balance})=><button key={a.id} onClick={()=>setSelected(selected===a.id?'':a.id)} aria-expanded={selected===a.id} className="text-left flex min-h-12 flex-wrap justify-between gap-2 rounded-xl border p-3 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="break-words min-w-0">{a.name}<span className="block text-xs text-muted-foreground">{a.isDefaultCash ? 'Efectivo predeterminado' : a.type==='cash'?'Efectivo':'Banco'} · {a.currency} · Desde {a.startDate}</span></span><strong>{money(balance, a.currency)}</strong></button>)}</div>
      {balances.map(d=><p key={d.id} className="text-sm break-words">{d.name}: {d.signedBalance >= 0 ? 'deuda' : 'saldo a favor'} {money(Math.abs(d.signedBalance))}</p>)}
      {account && <div className="border-t pt-3 space-y-2"><DetailHeader
        title={account.name}
        subtitle={account.isDefaultCash ? 'Efectivo predeterminado' : account.type === 'cash' ? 'Efectivo' : 'Cuenta bancaria'}
        amount={accountView?.balance ?? 0}
        supporting={<>Saldo inicial: {money(account.openingBalance, account.currency)} · {account.currency} · Desde {account.startDate}</>}
        actions={<ActionMenu
          label={`Acciones de ${account.name}`}
          items={[
            {
              label: account.type === 'cash' ? 'Ajustar saldo inicial' : 'Editar cuenta',
              icon: <Pencil className="h-4 w-4" />,
              onSelect: () => editAccount(account),
            },
            {
              label: 'Gestionar cuentas y transferencias',
              icon: <Settings2 className="h-4 w-4" />,
              onSelect: openManagement,
            },
          ]}
        />}
      /><h4 className="font-medium text-sm">Movimientos recientes</h4>{(accountView?.entries || []).map(r=><div key={r.kind+r.id} className="flex justify-between gap-3 text-sm border-b py-2"><div className="min-w-0 break-words">{r.description}{r.transfer && <button className="block underline text-primary" onClick={()=>editTransfer(r.transfer!)}>Ver / editar transferencia</button>}<span className="block text-xs text-muted-foreground">{r.date} · {r.kind==='transfer'?'Transferencia':r.kind==='payment'?'Pago de tarjeta':r.kind==='income'?'Ingreso':'Gasto'}</span></div><span className="shrink-0">{r.amount>0?'+':''}{money(r.amount, account.currency)}</span></div>)}<p className="text-xs text-muted-foreground">Hasta 50 movimientos recientes. Los movimientos anteriores sin cuenta siguen en tus reportes.</p></div>}
    </>}
    </div></details>
    <Dialog open={cashOpen} onOpenChange={v => { if (!locked.current) setCashOpen(v); }}><DialogContent><DialogHeader><DialogTitle>Saldo inicial de efectivo</DialogTitle><DialogDescription>Corrige solo el dinero que tenías al iniciar el seguimiento. Los ingresos y gastos registrados se calculan automáticamente.</DialogDescription></DialogHeader><form className="space-y-3" onSubmit={e => { e.preventDefault(); void submitCashOpening(); }}><label className="block text-sm">{`Saldo inicial (${currency})`}<Input required type="number" min="0" step="0.01" value={opening} onChange={e => setOpening(e.target.value)} disabled={busy}/></label><Button disabled={busy} type="submit">Guardar saldo inicial</Button></form></DialogContent></Dialog>
  </section>;
}

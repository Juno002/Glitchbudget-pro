'use client';

import { useMemo, useState } from 'react';
import { createInvestment } from '@/lib/investments';
import { selectInvestmentManagerRows } from '@/domain/investments';
import { localDate } from '@/lib/finance-calculations';
import { toCents } from '@/lib/utils';
import { usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { useFinances } from '@/contexts/finance-context';
import { useToast } from '@/hooks/use-toast';
import { friendlyError } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AccountSelect } from './account-select';
import { EmptyState } from '@/components/finance-ui';
import { Landmark, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const typeLabels = {
  certificate:'Certificado financiero',
  term_deposit:'Depósito a plazo',
  known_yield:'Rendimiento conocido',
} as const;

const compoundingLabels = {
  simple:'Simple / al vencimiento',
  monthly:'Capitalización mensual',
  quarterly:'Capitalización trimestral',
  annually:'Capitalización anual',
} as const;

export default function InvestmentsManager() {
  const today = localDate();
  const money = usePrivateCurrency();
  const { toast } = useToast();
  const { investments, accounts, accountTransfers, incomes, expenses, debtPayments } = useFinances();
  const data = useMemo(() => {
    if (!investments || !accounts || !accountTransfers || !incomes || !expenses || !debtPayments) return undefined;
    return {
      investments,
      accounts,
      transfers: accountTransfers,
      incomes,
      expenses,
      payments: debtPayments,
    };
  }, [investments, accounts, accountTransfers, incomes, expenses, debtPayments]);

  const [open,setOpen] = useState(false);
  const [busy,setBusy] = useState(false);
  const [mode,setMode] = useState<'existing'|'new'>('existing');
  const [type,setType] = useState<'certificate'|'term_deposit'|'known_yield'>('certificate');
  const [name,setName] = useState('');
  const [institution,setInstitution] = useState('');
  const [openedAt,setOpenedAt] = useState(today);
  const [maturityDate,setMaturityDate] = useState('');
  const [principal,setPrincipal] = useState('');
  const [currentValue,setCurrentValue] = useState('');
  const [annualRate,setAnnualRate] = useState('');
  const [compounding,setCompounding] = useState<'simple'|'monthly'|'quarterly'|'annually'>('simple');
  const [source,setSource] = useState('');
  const [notes,setNotes] = useState('');

  const reset = () => {
    setMode('existing'); setType('certificate'); setName(''); setInstitution('');
    setOpenedAt(today); setMaturityDate(''); setPrincipal(''); setCurrentValue('');
    setAnnualRate(''); setCompounding('simple'); setSource(''); setNotes('');
  };

  const rows = useMemo(
    () => data ? selectInvestmentManagerRows(data, today) : [],
    [data, today],
  );

  const submit = async (event:React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await createInvestment({
        mode,type,name,institution:institution || undefined,openedAt,
        maturityDate:maturityDate || undefined,
        principal:toCents(principal),
        currentTrackedValue:mode === 'existing' ? toCents(currentValue) : undefined,
        sourceAccountId:mode === 'new' ? source : undefined,
        annualRate:annualRate.trim() === '' ? undefined : Number(annualRate) / 100,
        compoundingMethod:annualRate.trim() === '' ? undefined : compounding,
        notes:notes || undefined,
      });
      toast({
        title:'Inversión registrada',
        description:mode === 'new'
          ? 'El principal se movió como transferencia patrimonial; no se creó un gasto.'
          : 'El valor actual quedó como saldo inicial; no se creó un ingreso.',
      });
      reset();
      setOpen(false);
    } catch(error) {
      toast({ title:'No se pudo registrar la inversión', description:friendlyError(error), variant:'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />;

  return (
    <div className="space-y-5" data-investments-prisma="true">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value && !busy) reset(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Añadir inversión</Button></DialogTrigger>
          <DialogContent className="sm:max-w-2xl" data-investment-dialog="prisma">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-normal">Registrar inversión</DialogTitle>
              <DialogDescription>Elige si ya existía al empezar a usar Prisma o si la financias ahora desde una cuenta registrada.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={submit}>
              <label className="block text-sm">Origen del valor
                <select className="mt-1 h-10 w-full rounded-[var(--radius-interactive)] border border-input bg-background px-3 py-2 text-base shadow-[var(--shadow-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm" value={mode} onChange={e=>setMode(e.target.value as typeof mode)}>
                  <option value="existing">Ya la tenía — usar valor actual como saldo inicial</option>
                  <option value="new">La acabo de abrir — transferir principal desde una cuenta</option>
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">Tipo
                  <select className="mt-1 h-10 w-full rounded-[var(--radius-interactive)] border border-input bg-background px-3 py-2 text-base shadow-[var(--shadow-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm" value={type} onChange={e=>setType(e.target.value as typeof type)}>
                    {Object.entries(typeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="block text-sm">Nombre<Input required value={name} onChange={e=>setName(e.target.value)} placeholder="Certificado 9 meses" /></label>
                <label className="block text-sm">Institución<Input value={institution} onChange={e=>setInstitution(e.target.value)} placeholder="Opcional" /></label>
                <label className="block text-sm">Fecha de apertura<Input required type="date" max={today} value={openedAt} onChange={e=>setOpenedAt(e.target.value)} /></label>
                <label className="block text-sm">Vencimiento<Input type="date" min={openedAt} value={maturityDate} onChange={e=>setMaturityDate(e.target.value)} /></label>
                <label className="block text-sm">Principal<Input required type="number" min="0.01" step="0.01" value={principal} onChange={e=>setPrincipal(e.target.value)} /></label>
                {mode === 'existing' ? (
                  <label className="block text-sm">Valor que sigues hoy<Input required type="number" min="0" step="0.01" value={currentValue} onChange={e=>setCurrentValue(e.target.value)} /></label>
                ) : (
                  <AccountSelect value={source} onChange={setSource} label="Cuenta que financia el principal" />
                )}
                <label className="block text-sm">Tasa anual (%)<Input type="number" min="0" step="0.0001" value={annualRate} onChange={e=>setAnnualRate(e.target.value)} placeholder="Opcional" /></label>
                <label className="block text-sm">Capitalización
                  <select disabled={!annualRate} className="mt-1 h-10 w-full rounded-[var(--radius-interactive)] border border-input bg-background px-3 py-2 text-base shadow-[var(--shadow-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 sm:text-sm" value={compounding} onChange={e=>setCompounding(e.target.value as typeof compounding)}>
                    {Object.entries(compoundingLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-sm">Notas<Input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Opcional" /></label>
              <div className="rounded-[var(--radius-interactive)] border p-3 text-xs text-muted-foreground">
                {mode === 'new'
                  ? 'El principal saldrá de la cuenta elegida mediante una transferencia. El patrimonio neto no cambia por abrir la inversión.'
                  : 'El valor actual se registra como saldo inicial del activo. No se crea ingreso ni transferencia para evitar doble contabilización.'}
              </div>
              <Button type="submit" disabled={busy || (mode === 'new' && !source)}>{busy ? 'Guardando…' : 'Registrar inversión'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!rows.length ? (
        <EmptyState title="Aún no hay inversiones" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map(({investment,account,currentValue,projection}) => (
            <article key={investment.id} className="space-y-4 rounded-[var(--radius-card)] border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-primary" /><h4 className="truncate font-semibold">{investment.name}</h4></div>
                  <p className="mt-1 text-xs text-muted-foreground">{typeLabels[investment.type]}{investment.institution ? ' · '+investment.institution : ''} · {account.currency}</p>
                </div>
                <span className="rounded-full border px-2 py-1 text-[10px] font-medium">{projection.maturityReached ? 'Fecha vencida' : 'Activa'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Valor registrado</p><p className="font-mono font-semibold">{money(currentValue,account.currency)}</p></div>
                <div><p className="text-xs text-muted-foreground">Principal</p><p className="font-mono">{money(investment.principal,account.currency)}</p></div>
                <div><p className="text-xs text-muted-foreground">Tasa</p><p>{investment.annualRate === undefined ? '—' : (investment.annualRate*100).toLocaleString('es-DO',{maximumFractionDigits:4})+'% anual'}</p></div>
                <div><p className="text-xs text-muted-foreground">Apertura</p><p>{investment.openedAt}</p></div>
                <div><p className="text-xs text-muted-foreground">Vencimiento</p><p>{investment.maturityDate || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Días restantes</p><p>{projection.daysRemaining === null ? '—' : projection.daysRemaining}</p></div>
              </div>

              {projection.elapsedPercentage !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>Tiempo transcurrido</span><span>{projection.elapsedPercentage}%</span></div>
                  <Progress value={projection.elapsedPercentage} className="h-2" />
                </div>
              )}

              <div className="rounded-[var(--radius-interactive)] border border-dashed bg-muted/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estimado · no forma parte del patrimonio real</p>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Valor al vencimiento</p><p className="font-mono font-semibold">{projection.estimatedMaturityValue === null ? '—' : money(projection.estimatedMaturityValue,account.currency)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Interés estimado</p><p className="font-mono">{projection.estimatedInterest === null ? '—' : money(projection.estimatedInterest,account.currency)}</p></div>
                </div>
              </div>

              {investment.notes && <p className="text-xs text-muted-foreground">{investment.notes}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
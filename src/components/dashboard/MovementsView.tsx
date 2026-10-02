'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Expense, Income } from '@/domain/models';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState, TransactionRow } from '@/components/finance-ui';
import { useFinances } from '@/contexts/finance-context';
import { useCategoryResolver } from '@/hooks/use-categories';
import { useMovementAccountData } from '@/hooks/use-finance-queries';
import { usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { useOptionalTabs } from '@/contexts/tabs-context';
import { cn, toCents } from '@/lib/utils';
import { Bookmark, ChevronDown, Pin, Save, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import TransactionModal from './TransactionModal';
import {
  applyTransactionFilters,
  filtersForPeriod,
  hasTransactionFilters,
  type FilterableMovement,
  type MovementFilterType,
  type TransactionFilters,
} from '@/domain/transaction-filters';
import { NECESSITY_LABELS } from '@/domain/transaction-metadata';
import {
  loadSavedTransactionFilters,
  normalizeTransactionFilters,
  removeSavedTransactionFilter,
  upsertSavedTransactionFilter,
  type SavedTransactionFilter,
} from '@/lib/saved-transaction-filters';

const MOVEMENT_PAGE_SIZE = 100;

type UnifiedItem = FilterableMovement & {
  detail?: string;
  label: string;
  isFixed: boolean;
  raw?: Expense | Income;
};

const typeLabels:Record<MovementFilterType,string>={
  income:'Ingreso',
  expense:'Gasto',
  transfer:'Transferencia',
  payment:'Pago de tarjeta',
  saving:'Aporte a meta',
  opening:'Saldo inicial',
};

export default function MovementsView() {
  const money=usePrivateCurrency();
  const getCategoryInfo=useCategoryResolver();
  const tabs=useOptionalTabs();
  const movementFocusId=tabs?.movementFocusId ?? null;
  const clearMovementFocus=tabs?.clearMovementFocus;
  const {incomes,expenses,currentPeriod,locale,debtPayments,debts,goalContributions,goals}=useFinances();

  const accountData=useMovementAccountData();

  const [detailItem,setDetailItem]=useState<UnifiedItem|null>(null);
  const [search,setSearch]=useState('');
  const [filters,setFilters]=useState<TransactionFilters>(()=>filtersForPeriod(currentPeriod));
  const [savedFilters,setSavedFilters]=useState<SavedTransactionFilter[]>([]);
  const [selectedSavedId,setSelectedSavedId]=useState('');
  const [savedFilterName,setSavedFilterName]=useState('');
  const [visibleCount,setVisibleCount]=useState(MOVEMENT_PAGE_SIZE);

  const [modalOpen,setModalOpen]=useState(false);
  const [editingExpense,setEditingExpense]=useState<Expense|undefined>();
  const [editingIncome,setEditingIncome]=useState<Income|undefined>();

  useEffect(()=>{
    setFilters(previous=>({...previous,...filtersForPeriod(currentPeriod)}));
    setSelectedSavedId('');
  },[currentPeriod]);

  useEffect(()=>{
    if(typeof window!=='undefined') setSavedFilters(loadSavedTransactionFilters(window.localStorage));
  },[]);

  const allItems:UnifiedItem[]=useMemo(()=>{
    const incomeItems:UnifiedItem[]=(incomes||[]).map(i=>({
      id:i.id,
      kind:'income',
      label:i.description||'Ingreso',
      amount:i.amount,
      categoryId:i.categoryId,
      date:i.date,
      accountIds:i.accountId?[i.accountId]:[],
      labels:i.labels,
      isFixed:false,
      raw:i,
    }));

    const expenseItems:UnifiedItem[]=(expenses||[]).map(e=>({
      id:e.id,
      kind:'expense',
      label:e.concept||'Gasto',
      amount:e.amount,
      categoryId:e.categoryId,
      date:e.date,
      accountIds:e.accountId?[e.accountId]:[],
      necessity:e.necessity,
      labels:e.labels,
      isFixed:e.nature==='Fijo',
      raw:e,
    }));

    const accountName=(id?:string)=>accountData?.accounts.find(a=>a.id===id)?.name||'Sin cuenta';
    const otherItems:UnifiedItem[]=[
      ...(accountData?.transfers||[]).map(t=>({
        id:t.id,kind:'transfer' as const,label:t.note||'Transferencia',amount:t.amount,date:t.date,
        accountIds:[t.fromAccountId,t.toAccountId],isFixed:false,
        detail:accountName(t.fromAccountId)+' → '+accountName(t.toAccountId)+' · No es ingreso ni gasto.',
      })),
      ...(debtPayments||[]).map(p=>({
        id:p.id,kind:'payment' as const,label:'Pago de '+((debts||[]).find(d=>d.id===p.debtId)?.name||'tarjeta'),
        amount:p.amount,date:p.date.slice(0,10),accountIds:p.accountId?[p.accountId]:[],isFixed:false,
        detail:accountName(p.accountId)+' · Reduce el saldo y la deuda; no repite el gasto de la compra.',
      })),
      ...(goalContributions||[]).filter(c=>c.kind!=='legacy_balance').map(c=>({
        id:c.id,kind:'saving' as const,label:'Aporte a '+((goals||[]).find(g=>g.id===c.goalId)?.name||'meta'),
        amount:c.amount,date:c.date.slice(0,10),accountIds:[],isFixed:false,
        detail:'Reserva para una meta. No es un gasto ni una transferencia entre cuentas.',
      })),
      ...(accountData?.accounts||[]).filter(a=>a.openingBalance!==0).map(a=>({
        id:a.id,kind:'opening' as const,label:'Saldo inicial · '+a.name,amount:a.openingBalance,date:a.startDate,
        accountIds:[a.id],isFixed:false,
        detail:'Dinero existente al iniciar el seguimiento. Se incluye en el saldo, no en los ingresos del período.',
      })),
    ];

    return [...incomeItems,...expenseItems,...otherItems].sort((a,b)=>b.date.localeCompare(a.date)||b.amount-a.amount||a.id.localeCompare(b.id));
  },[incomes,expenses,accountData,debtPayments,debts,goalContributions,goals]);

  const items=useMemo(()=>{
    const filtered=applyTransactionFilters(allItems,filters);
    const query=search.trim().toLocaleLowerCase('es');
    if(!query) return filtered;
    return filtered.filter(item=>
      (item.label+' '+(item.detail||'')+' '+(item.labels||[]).join(' ')).toLocaleLowerCase('es').includes(query)
    );
  },[allItems,filters,search]);

  const visibleItems=useMemo(()=>items.slice(0,visibleCount),[items,visibleCount]);

  useEffect(()=>{
    setVisibleCount(MOVEMENT_PAGE_SIZE);
  },[filters,search]);

  const presentCategories=useMemo(()=>{
    const ids=new Set(allItems.map(item=>item.categoryId).filter((id):id is string=>Boolean(id)));
    return Array.from(ids).map(id=>getCategoryInfo(id)).filter(Boolean) as NonNullable<ReturnType<typeof getCategoryInfo>>[];
  },[allItems,getCategoryInfo]);

  const presentLabels=useMemo(()=>{
    const values=new Map<string,string>();
    for(const item of allItems) for(const label of item.labels||[]) values.set(label.toLocaleLowerCase('es'),label);
    if(filters.label) values.set(filters.label.toLocaleLowerCase('es'),filters.label);
    return Array.from(values.values()).sort((a,b)=>a.localeCompare(b,'es'));
  },[allItems,filters.label]);

  useEffect(()=>{
    if(!movementFocusId) return;
    const item=allItems.find(row=>row.id===movementFocusId);
    if(!item) return;
    if(item.kind==='expense') {
      setEditingExpense(item.raw as Expense); setEditingIncome(undefined); setModalOpen(true);
    } else if(item.kind==='income') {
      setEditingIncome(item.raw as Income); setEditingExpense(undefined); setModalOpen(true);
    } else setDetailItem(item);
    clearMovementFocus?.();
  },[movementFocusId,allItems,clearMovementFocus]);

  const handleItemClick=(item:UnifiedItem)=>{
    if(item.kind!=='income' && item.kind!=='expense') { setDetailItem(item); return; }
    if(item.kind==='expense') { setEditingExpense(item.raw as Expense); setEditingIncome(undefined); }
    else { setEditingIncome(item.raw as Income); setEditingExpense(undefined); }
    setModalOpen(true);
  };

  const closeModal=()=>{ setModalOpen(false); setEditingExpense(undefined); setEditingIncome(undefined); };

  const updateFilter=<K extends keyof TransactionFilters>(key:K,value:TransactionFilters[K])=>{
    setFilters(previous=>({...previous,[key]:value}));
    setSelectedSavedId('');
  };

  const clearFilters=()=>{
    setFilters(filtersForPeriod(currentPeriod));
    setSearch('');
    setSelectedSavedId('');
  };

  const applySaved=(id:string)=>{
    setSelectedSavedId(id);
    const saved=savedFilters.find(row=>row.id===id);
    if(saved) {
      setSearch('');
      setFilters(normalizeTransactionFilters(saved.filters));
    }
  };

  const saveCurrentFilter=()=>{
    const name=savedFilterName.trim();
    if(!name || typeof window==='undefined') return;
    const existing=savedFilters.find(row=>row.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es'));
    const id=existing?.id||crypto.randomUUID();
    const next=upsertSavedTransactionFilter(window.localStorage,{id,name,filters});
    setSavedFilters(next); setSelectedSavedId(id); setSavedFilterName('');
  };

  const deleteSaved=()=>{
    if(!selectedSavedId || typeof window==='undefined') return;
    setSavedFilters(removeSavedTransactionFilter(window.localStorage,selectedSavedId));
    setSelectedSavedId('');
  };

  return (
    <div className="space-y-4" data-movements-prisma="true">
      <div className="flex flex-col gap-2 lg:flex-row" data-movement-filter-bar="primary">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Buscar movimientos"
            placeholder="Buscar movimientos"
            value={search}
            onChange={event=>setSearch(event.target.value)}
            className="h-11 bg-card pl-9 shadow-[var(--shadow-control)]"
          />
        </div>

        <select
          aria-label="Filtrar por tipo"
          className="h-11 min-w-[170px] rounded-[var(--radius-interactive)] border border-input bg-card px-3 text-sm shadow-[var(--shadow-control)]"
          value={filters.type||'all'}
          onChange={event=>updateFilter('type',event.target.value==='all'?undefined:event.target.value as MovementFilterType)}
        >
          <option value="all">Todos los tipos</option>
          {Object.entries(typeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select>

        <select
          aria-label="Filtro guardado"
          className="h-11 min-w-[180px] rounded-[var(--radius-interactive)] border border-input bg-card px-3 text-sm shadow-[var(--shadow-control)]"
          value={selectedSavedId}
          onChange={event=>applySaved(event.target.value)}
        >
          <option value="">Filtros guardados</option>
          {savedFilters.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
      </div>

      <details className="group rounded-[var(--radius-card)] border bg-card shadow-[var(--shadow-card)]" data-movement-filter-panel="advanced">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Más filtros
          </span>
          <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
            Cuenta · categoría · metadata · rango
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </span>
        </summary>

        <div className="border-t border-border/70 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">Cuenta
              <select
                aria-label="Filtrar por cuenta"
                className="mt-1 h-10 w-full rounded-[var(--radius-interactive)] border border-input bg-background px-3"
                value={filters.accountId||'all'}
                onChange={event=>updateFilter('accountId',event.target.value==='all'?undefined:event.target.value)}
              >
                <option value="all">Todas las cuentas</option>
                {(accountData?.accounts||[]).map(account=><option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>

            <label className="text-sm">Categoría
              <select
                aria-label="Filtrar por categoría"
                className="mt-1 h-10 w-full rounded-[var(--radius-interactive)] border border-input bg-background px-3"
                value={filters.categoryId||'all'}
                onChange={event=>updateFilter('categoryId',event.target.value==='all'?undefined:event.target.value)}
              >
                <option value="all">Todas las categorías</option>
                {presentCategories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>

            <label className="text-sm">Necesidad
              <select
                aria-label="Filtrar por necesidad"
                className="mt-1 h-10 w-full rounded-[var(--radius-interactive)] border border-input bg-background px-3"
                value={filters.necessity||'all'}
                onChange={event=>updateFilter('necessity',event.target.value==='all'?undefined:event.target.value as TransactionFilters['necessity'])}
              >
                <option value="all">Todas</option>
                <option value="must">Must</option>
                <option value="need">Need</option>
                <option value="want">Want</option>
              </select>
            </label>

            <label className="text-sm">Etiqueta
              <select
                aria-label="Filtrar por etiqueta"
                className="mt-1 h-10 w-full rounded-[var(--radius-interactive)] border border-input bg-background px-3"
                value={filters.label||'all'}
                onChange={event=>updateFilter('label',event.target.value==='all'?undefined:event.target.value)}
              >
                <option value="all">Todas las etiquetas</option>
                {presentLabels.map(label=><option key={label.toLocaleLowerCase('es')} value={label}>{label}</option>)}
              </select>
            </label>

            <label className="text-sm">Desde
              <Input type="date" max={filters.dateEnd} value={filters.dateStart||''} onChange={event=>updateFilter('dateStart',event.target.value||undefined)} />
            </label>

            <label className="text-sm">Hasta
              <Input type="date" min={filters.dateStart} value={filters.dateEnd||''} onChange={event=>updateFilter('dateEnd',event.target.value||undefined)} />
            </label>

            <label className="text-sm">Monto mínimo
              <Input
                type="number" min="0" max={filters.amountMax===undefined?undefined:filters.amountMax/100} step="0.01" inputMode="decimal"
                value={filters.amountMin===undefined?'':filters.amountMin/100}
                onChange={event=>updateFilter('amountMin',event.target.value===''?undefined:Math.max(0,toCents(event.target.value)))}
              />
            </label>

            <label className="text-sm">Monto máximo
              <Input
                type="number" min={filters.amountMin===undefined?0:filters.amountMin/100} step="0.01" inputMode="decimal"
                value={filters.amountMax===undefined?'':filters.amountMax/100}
                onChange={event=>updateFilter('amountMax',event.target.value===''?undefined:Math.max(0,toCents(event.target.value)))}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border/70 pt-4">
            <div className="flex min-w-[220px] flex-1 items-center gap-2">
              <Bookmark className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Nombre del filtro"
                placeholder="Nombre para guardar este filtro"
                value={savedFilterName}
                onChange={event=>setSavedFilterName(event.target.value)}
                maxLength={80}
              />
            </div>
            <Button type="button" variant="outline" disabled={!savedFilterName.trim() || !hasTransactionFilters(filters)} onClick={saveCurrentFilter}>
              <Save className="mr-2 h-4 w-4" />Guardar filtro
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Eliminar filtro guardado" disabled={!selectedSavedId} onClick={deleteSaved}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" onClick={clearFilters}>Restablecer</Button>
          </div>
        </div>
      </details>

      <div className="flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
        <span>{items.length} de {allItems.length} movimientos</span>
        <span>Actividad real · planificados pendientes viven en Plan</span>
      </div>

      {items.length===0 ? (
        <EmptyState title="No hay movimientos" description="No hay movimientos registrados que coincidan con estos filtros." />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border bg-card shadow-[var(--shadow-card)]" data-movement-history="list">
          {visibleItems.map(item=>{
            const category=getCategoryInfo(item.categoryId||'');
            const Icon=category?.icon;
            const isIncome=item.kind==='income';
            const isExpense=item.kind==='expense';
            const tone=isIncome?'positive':isExpense?'negative':'neutral';
            const badges:ReactNode[]=[];
            if(item.isFixed) badges.push(<span key="fixed" className="inline-flex items-center gap-0.5 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium"><Pin className="h-2.5 w-2.5" /> Fijo</span>);
            if(item.necessity) badges.push(<span key="necessity" className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium">{NECESSITY_LABELS[item.necessity]}</span>);
            for(const label of (item.labels||[]).slice(0,2)) badges.push(<span key={'label-'+label} className="rounded-full border px-2 py-0.5 text-[10px]">{label}</span>);

            return (
              <TransactionRow
                key={item.kind+'-'+item.id}
                onClick={()=>handleItemClick(item)}
                className="rounded-none border-x-0 border-t-0 bg-transparent px-4 py-3 last:border-b-0 hover:bg-muted/35"
                icon={<div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  isIncome?'bg-[hsl(var(--brand-mint)/0.16)]':isExpense?'bg-[hsl(var(--brand-coral)/0.13)]':'bg-muted/60',
                )}>
                  {Icon ? <Icon strokeWidth={1.75} className={cn('h-4 w-4',isIncome?'text-good':isExpense?'text-bad':'text-muted-foreground')} /> : null}
                </div>}
                title={item.label}
                meta={<span className="truncate">{item.detail||category?.name}{isExpense && (item.raw as Expense)?.paymentMethod==='credit'?' · Tarjeta':''}</span>}
                badge={badges.length?<span className="flex flex-wrap gap-1">{badges}</span>:undefined}
                amount={item.amount}
                tone={tone}
                dateLabel={new Date(item.date+'T00:00:00').toLocaleDateString(locale,{day:'numeric',month:'short'})}
              />
            );
          })}
        </div>
      )}
      {visibleCount < items.length ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            data-movement-show-more="true"
            onClick={()=>setVisibleCount(count=>Math.min(items.length,count+MOVEMENT_PAGE_SIZE))}
          >
            Mostrar {Math.min(MOVEMENT_PAGE_SIZE,items.length-visibleCount)} más
          </Button>
        </div>
      ) : null}

      <Dialog open={!!detailItem} onOpenChange={open=>{if(!open)setDetailItem(null);}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogDescription>{detailItem?.kind ? typeLabels[detailItem.kind] : 'Movimiento'}</DialogDescription>
            <DialogTitle className="font-display text-2xl font-normal">{detailItem?.label}</DialogTitle>
          </DialogHeader>
          <div className="rounded-[var(--radius-card)] bg-muted/45 p-4">
            <p className="font-display text-2xl tracking-[-0.035em]">{money(detailItem?.amount||0)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detailItem?.date}</p>
            {detailItem?.detail ? <p className="mt-3 text-sm text-muted-foreground">{detailItem.detail}</p> : null}
          </div>
          {detailItem?.kind==='transfer' && <p className="text-sm text-muted-foreground">Puedes editar la transferencia desde Cuentas, abriendo la cuenta de origen o destino.</p>}
        </DialogContent>
      </Dialog>

      <TransactionModal
        open={modalOpen}
        onClose={closeModal}
        mode="edit"
        editingExpense={editingExpense}
        editingIncome={editingIncome}
      />
    </div>
  );
}

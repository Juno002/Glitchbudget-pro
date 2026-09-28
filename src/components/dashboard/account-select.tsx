'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { defaultCashAccount } from '@/lib/accounts';
import type { Account } from '@/lib/db';
export function AccountSelect({ value, onChange, label = 'Cuenta de origen', disabled = false, cashDefault = false, allowedTypes = ['cash','bank'] }: { value: string; onChange: (value: string) => void; label?: string; disabled?: boolean; cashDefault?: boolean; allowedTypes?: Account['type'][] }) {
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const visibleAccounts = (accounts || []).filter(account => allowedTypes.includes(account.type));
  const defaultAccount = cashDefault ? defaultCashAccount(visibleAccounts) : undefined;
  if (!visibleAccounts.length && !cashDefault) return null;
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select aria-label={label} value={value || defaultAccount?.id || ''} disabled={disabled} onChange={e => onChange(e.target.value)} className="w-full min-w-0 rounded-lg border border-input bg-background text-foreground p-2">
        {!defaultAccount && <option value="">{cashDefault ? 'Efectivo (predeterminada)' : 'Sin cuenta seleccionada'}</option>}
        {visibleAccounts.map(account => {
          const type = account.type === 'cash' ? 'Efectivo' : account.type === 'bank' ? 'Banco' : 'Inversión';
          const name = account.name.trim().toLocaleLowerCase('es') === type.toLocaleLowerCase('es') ? account.name : `${account.name} · ${type}`;
          return <option key={account.id} value={account.id}>{name} · {account.currency}{account.isDefaultCash || account.id === defaultAccount?.id ? ' (predeterminada)' : ''}</option>;
        })}
      </select>
    </label>
  );
}

'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
export function AccountSelect({ value, onChange, label = 'Cuenta de origen', disabled = false }: { value: string; onChange: (value: string) => void; label?: string; disabled?: boolean }) {
  const accounts = useLiveQuery(() => db.accounts.toArray());
  if (!accounts?.length) return null;
  return <label className="block space-y-1 text-sm"><span className="text-muted-foreground">{label}</span><select aria-label={label} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} className="w-full min-w-0 rounded-lg border border-input bg-background text-foreground p-2"><option value="">Selecciona una cuenta</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name} · {a.type === 'cash' ? 'Efectivo' : 'Banco'}</option>)}</select></label>;
}

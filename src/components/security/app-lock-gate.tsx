'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useAppLock } from '@/contexts/app-lock-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AppLockGate({ children }: { children: ReactNode }) {
  const { ready, enabled, locked, unlock } = useAppLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Preparando seguridad local…</p>
      </div>
    );
  }

  if (!enabled || !locked) return <>{children}</>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const valid = await unlock(pin);
      if (!valid) {
        setError('PIN incorrecto.');
        return;
      }
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4" aria-label="Aplicación bloqueada" data-lock-screen="prisma">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[var(--radius-card)] border bg-card/95 p-6 shadow-[var(--shadow-floating)]">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border p-2"><LockKeyhole className="h-5 w-5" /></div>
          <div>
            <h1 className="font-display text-2xl font-normal">GlitchBudget bloqueado</h1>
            <p className="text-xs text-muted-foreground">Introduce tu PIN local para acceder a la interfaz financiera.</p>
          </div>
        </div>
        <label className="mt-5 block space-y-2 text-sm">
          <span className="font-medium">PIN</span>
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            pattern="[0-9]*"
            value={pin}
            onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 12))}
            aria-label="PIN de bloqueo"
            autoFocus
          />
        </label>
        {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" className="mt-4 w-full" disabled={busy || pin.length === 0}>
          {busy ? 'Verificando…' : 'Desbloquear'}
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          App lock bloquea esta interfaz. No cifra la base de datos Dexie ni los archivos del dispositivo.
        </p>
      </form>
    </main>
  );
}

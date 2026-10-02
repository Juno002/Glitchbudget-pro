'use client';

import { TimerReset } from 'lucide-react';
import { ContextHelp } from '@/components/finance-ui';
import { useAppLock } from '@/contexts/app-lock-context';
import {
  AUTO_LOCK_TIMEOUT_OPTIONS,
  type AutoLockTimeoutMinutes,
} from '@/domain/local-security';

const LABELS: Record<AutoLockTimeoutMinutes, string> = {
  1: '1 minuto',
  5: '5 minutos',
  15: '15 minutos',
  30: '30 minutos',
};

export default function AutoLockSettings() {
  const { enabled, autoLockMinutes, configureAutoLock } = useAppLock();

  if (!enabled) {
    return (
      <div className="rounded-[var(--radius-interactive)] border bg-card p-3 text-sm shadow-[var(--shadow-control)]" data-auto-lock-settings="prisma">
        <div className="flex items-start gap-3">
          <TimerReset className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Bloqueo automático</p>
            <p className="mt-1 text-xs text-muted-foreground">Activa primero el bloqueo de aplicación.</p>
          </div>
        </div>
      </div>
    );
  }

  const active = autoLockMinutes !== null;

  return (
    <div className="space-y-3 rounded-[var(--radius-interactive)] border bg-card p-3 text-sm shadow-[var(--shadow-control)]" data-auto-lock-settings="prisma" aria-label="Configurar bloqueo automático">
      <label className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <span className="flex min-w-0 items-start gap-3">
          <TimerReset className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex min-w-0 flex-wrap items-center gap-1">
            <span className="block font-medium">Bloqueo automático</span>
            <ContextHelp label="Acerca del bloqueo automático">Bloquea la interfaz tras un período sin actividad y también comprueba el tiempo transcurrido al volver desde segundo plano.</ContextHelp>
          </span>
        </span>
        <input
          type="checkbox"
          checked={active}
          onChange={event => configureAutoLock(event.target.checked ? 5 : null)}
          aria-label="Activar bloqueo automático"
          className="h-5 w-5 shrink-0 self-end sm:mt-1 sm:self-auto"
        />
      </label>

      {active && (
        <label className="block max-w-xs space-y-2">
          <span className="font-medium">Bloquear después de</span>
          <select
            aria-label="Tiempo de bloqueo automático"
            value={autoLockMinutes}
            onChange={event => configureAutoLock(Number(event.target.value) as AutoLockTimeoutMinutes)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
          >
            {AUTO_LOCK_TIMEOUT_OPTIONS.map(minutes => (
              <option key={minutes} value={minutes}>{LABELS[minutes]}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
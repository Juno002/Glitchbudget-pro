'use client';

import { TimerReset } from 'lucide-react';
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
            <p className="mt-1 text-xs text-muted-foreground">
              Activa primero el bloqueo de aplicación. El bloqueo automático no funciona sin un bloqueo de aplicación configurado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const active = autoLockMinutes !== null;

  return (
    <div className="space-y-3 rounded-[var(--radius-interactive)] border bg-card p-3 text-sm shadow-[var(--shadow-control)]" data-auto-lock-settings="prisma" aria-label="Configurar bloqueo automático">
      <label className="flex items-start justify-between gap-4">
        <span className="flex items-start gap-3">
          <TimerReset className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="block font-medium">Bloqueo automático</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Bloquea la interfaz después de un período sin actividad. La configuración se guarda solo en este navegador.
            </span>
          </span>
        </span>
        <input
          type="checkbox"
          checked={active}
          onChange={event => configureAutoLock(event.target.checked ? 5 : null)}
          aria-label="Activar bloqueo automático"
          className="mt-1 h-5 w-5"
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
          <span className="block text-xs text-muted-foreground">
            También se comprueba el tiempo transcurrido al volver a la aplicación desde segundo plano.
          </span>
        </label>
      )}
    </div>
  );
}

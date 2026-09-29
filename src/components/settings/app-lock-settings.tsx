'use client';

import { useState, type FormEvent } from 'react';
import { LockKeyhole, LockOpen, RotateCcw } from 'lucide-react';
import { useAppLock } from '@/contexts/app-lock-context';
import {
  APP_LOCK_PIN_MAX_LENGTH,
  APP_LOCK_PIN_MIN_LENGTH,
} from '@/domain/local-security';
import { isValidAppLockPin } from '@/lib/app-lock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function PinInput({
  label,
  value,
  onChange,
  autoComplete = 'off',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <Input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete={autoComplete}
        value={value}
        onChange={event => onChange(event.target.value.replace(/\D/g, '').slice(0, APP_LOCK_PIN_MAX_LENGTH))}
      />
    </label>
  );
}

export default function AppLockSettings() {
  const { enabled, enable, changePin, disable, lockNow } = useAppLock();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [replacementPin, setReplacementPin] = useState('');
  const [replacementConfirm, setReplacementConfirm] = useState('');
  const [disablePin, setDisablePin] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const resetFeedback = () => {
    setMessage('');
    setError('');
  };

  const validateNewPin = (pin: string, confirmation: string) => {
    if (!isValidAppLockPin(pin)) {
      return 'El PIN debe tener entre ' + APP_LOCK_PIN_MIN_LENGTH + ' y ' + APP_LOCK_PIN_MAX_LENGTH + ' dígitos.';
    }
    if (pin !== confirmation) return 'Los PIN no coinciden.';
    return '';
  };

  const activate = async (event: FormEvent) => {
    event.preventDefault();
    resetFeedback();
    const validation = validateNewPin(newPin, confirmPin);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    try {
      await enable(newPin);
      setNewPin('');
      setConfirmPin('');
      setMessage('App lock activado. La aplicación se bloqueará al volver a abrirse o al usar “Bloquear ahora”.');
    } catch {
      setError('No se pudo activar App lock en este navegador.');
    } finally {
      setBusy(false);
    }
  };

  const replacePin = async (event: FormEvent) => {
    event.preventDefault();
    resetFeedback();
    const validation = validateNewPin(replacementPin, replacementConfirm);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    try {
      const changed = await changePin(currentPin, replacementPin);
      if (!changed) {
        setError('El PIN actual no es correcto.');
        return;
      }
      setCurrentPin('');
      setReplacementPin('');
      setReplacementConfirm('');
      setMessage('PIN actualizado.');
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async (event: FormEvent) => {
    event.preventDefault();
    resetFeedback();
    setBusy(true);
    try {
      const disabled = await disable(disablePin);
      if (!disabled) {
        setError('El PIN actual no es correcto.');
        return;
      }
      setDisablePin('');
      setMessage('App lock desactivado.');
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) {
    return (
      <form onSubmit={activate} className="rounded-xl border p-4 space-y-4" aria-label="Configurar App lock">
        <div className="flex items-start gap-3">
          <LockOpen className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Bloqueo de aplicación</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Protege el acceso a la interfaz con un PIN local. No cifra Dexie ni tus backups.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <PinInput label="Nuevo PIN" value={newPin} onChange={setNewPin} autoComplete="new-password" />
          <PinInput label="Confirmar PIN" value={confirmPin} onChange={setConfirmPin} autoComplete="new-password" />
        </div>
        <p className="text-xs text-muted-foreground">
          Usa entre {APP_LOCK_PIN_MIN_LENGTH} y {APP_LOCK_PIN_MAX_LENGTH} dígitos. El PIN no se guarda en texto claro.
        </p>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Activando…' : 'Activar App lock'}</Button>
      </form>
    );
  }

  return (
    <div className="rounded-xl border p-4 space-y-5" aria-label="Administrar App lock">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">App lock activo</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Bloquea la interfaz financiera. No cifra Dexie ni los archivos del dispositivo.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={lockNow}>Bloquear ahora</Button>
      </div>

      <form onSubmit={replacePin} className="space-y-3 border-t pt-4">
        <div className="flex items-center gap-2 text-sm font-medium"><RotateCcw className="h-4 w-4" /> Cambiar PIN</div>
        <div className="grid gap-3 md:grid-cols-3">
          <PinInput label="PIN actual" value={currentPin} onChange={setCurrentPin} autoComplete="current-password" />
          <PinInput label="Nuevo PIN" value={replacementPin} onChange={setReplacementPin} autoComplete="new-password" />
          <PinInput label="Confirmar nuevo PIN" value={replacementConfirm} onChange={setReplacementConfirm} autoComplete="new-password" />
        </div>
        <Button type="submit" variant="outline" disabled={busy}>Cambiar PIN</Button>
      </form>

      <form onSubmit={turnOff} className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">Desactivar App lock</p>
        <div className="max-w-sm">
          <PinInput label="PIN actual" value={disablePin} onChange={setDisablePin} autoComplete="current-password" />
        </div>
        <Button type="submit" variant="destructive" disabled={busy}>Desactivar bloqueo</Button>
      </form>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
    </div>
  );
}

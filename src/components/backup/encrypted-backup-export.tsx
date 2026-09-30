'use client';

import { useState, type FormEvent } from 'react';
import { LockKeyhole, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { exportDataJSON } from '@/lib/backup-json';
import { exportEncryptedBackupText } from '@/lib/encrypted-backup';
import {
  ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH,
  ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH,
} from '@/domain/local-security';

function localDateStamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function EncryptedBackupExport() {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const resetSecrets = () => {
    setPassword('');
    setConfirmation('');
  };

  const close = () => {
    resetSecrets();
    setError('');
    setExpanded(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (
      password.length < ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH
      || password.length > ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH
    ) {
      setError(
        `La contraseña debe tener entre ${ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH} y ${ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH} caracteres.`,
      );
      return;
    }

    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setBusy(true);
    try {
      const json = await exportDataJSON();
      const encrypted = await exportEncryptedBackupText(json, password);
      const blob = new Blob([encrypted], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `glitchbudget-encrypted-backup-${localDateStamp()}.gbenc`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast({
        title: 'Backup cifrado exportado',
        description: 'Guarda también la contraseña: no se almacena en GlitchBudget.',
      });
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el backup cifrado.');
    } finally {
      setBusy(false);
    }
  };

  if (!expanded) {
    return (
      <Button
        type="button"
        disabled={busy}
        variant="outline"
        onClick={() => setExpanded(true)}
        className="w-full sm:w-auto"
      >
        <LockKeyhole className="mr-2 h-4 w-4" />
        Exportar cifrado
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="w-full space-y-4 rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)]" data-encrypted-export="prisma">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">Backup cifrado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Se cifra localmente con Web Crypto antes de descargarlo. La contraseña no se envía ni se guarda.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Contraseña</span>
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            maxLength={ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH}
            onChange={event => setPassword(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Confirmar contraseña</span>
          <Input
            type="password"
            autoComplete="new-password"
            value={confirmation}
            maxLength={ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH}
            onChange={event => setConfirmation(event.target.value)}
          />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Mínimo {ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH} caracteres. Si pierdes la contraseña, el archivo no podrá recuperarse.
      </p>
      <p className="text-xs text-muted-foreground">
        Guarda la contraseña junto con el archivo. La restauración cifrada está disponible desde la misma sección de backups.
      </p>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
          {busy ? 'Cifrando…' : 'Crear backup cifrado'}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={close}>Cancelar</Button>
      </div>
    </form>
  );
}

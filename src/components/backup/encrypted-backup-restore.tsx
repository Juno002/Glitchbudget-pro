'use client';

import { useRef, useState } from 'react';
import { FileKey2, Loader2 } from 'lucide-react';
import { useFinances } from '@/contexts/finance-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH,
  ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH,
} from '@/domain/local-security';
import { previewEncryptedBackupText } from '@/lib/encrypted-backup-restore';
import type { BackupImportPreview } from '@/lib/backup-json';
import { BackupPreviewSummary } from './backup-preview-summary';

export default function EncryptedBackupRestore() {
  const { importEncryptedData, isWorking } = useFinances();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [preview, setPreview] = useState<BackupImportPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setFile(null);
    setPassword('');
    setPreview(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    setError('');
    setPassword('');
    setPreview(null);
    setFile(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validatePassword = () => {
    if (
      password.length < ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH
      || password.length > ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH
    ) {
      setError(
        'La contraseña debe tener entre '
        + ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH
        + ' y '
        + ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH
        + ' caracteres.',
      );
      return false;
    }
    return true;
  };

  const review = async () => {
    if (!file || !validatePassword()) return;
    setError('');
    setPreviewing(true);
    try {
      const encryptedText = await file.text();
      const result = await previewEncryptedBackupText(encryptedText, password);
      setPreview(result);
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : 'No se pudo validar la copia cifrada.');
    } finally {
      setPreviewing(false);
    }
  };

  const restore = async () => {
    if (!file || !preview || !validatePassword()) return;
    setError('');
    const restored = await importEncryptedData(file, password);
    if (restored) reset();
    else {
      setPreview(null);
      setPassword('');
    }
  };

  const busy = isWorking || previewing;

  return (
    <>
      <Button
        type="button"
        disabled={busy}
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="w-full sm:w-auto"
      >
        <FileKey2 className="mr-2 h-4 w-4" />
        Restaurar cifrado
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".gbenc,application/json"
        className="hidden"
        onChange={chooseFile}
      />

      <AlertDialog
        open={file !== null}
        onOpenChange={open => {
          if (!open && !busy) reset();
        }}
      >
        <AlertDialogContent aria-busy={busy} data-encrypted-restore="prisma">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-normal">Restaurar copia cifrada</AlertDialogTitle>
            <AlertDialogDescription>
              Primero se autenticará, descifrará y validará <span className="font-medium break-all">{file?.name}</span>.
              Tus datos actuales no se reemplazarán hasta que revises el resumen y confirmes.
              Antes de escribir, Prisma intentará crear una copia local automática cuando OPFS esté disponible.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Contraseña de la copia</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              maxLength={ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH}
              onChange={event => {
                setPassword(event.target.value);
                setPreview(null);
                setError('');
              }}
              disabled={busy}
              autoFocus
            />
          </label>

          {preview ? (
            <BackupPreviewSummary preview={preview} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Contraseña incorrecta, archivo alterado o formato incompatible se rechazan antes de cualquier restauración destructiva.
            </p>
          )}

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            {preview ? (
              <Button type="button" disabled={busy} onClick={restore}>
                {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileKey2 className="mr-2 h-4 w-4" />}
                {isWorking ? 'Restaurando…' : 'Confirmar y restaurar'}
              </Button>
            ) : (
              <Button type="button" disabled={busy || !password} onClick={review}>
                {previewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileKey2 className="mr-2 h-4 w-4" />}
                {previewing ? 'Validando…' : 'Revisar copia'}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

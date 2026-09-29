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

export default function EncryptedBackupRestore() {
  const { importEncryptedData, isWorking } = useFinances();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setFile(null);
    setPassword('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    setError('');
    setPassword('');
    setFile(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const restore = async () => {
    if (!file) return;
    if (
      password.length < ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH
      || password.length > ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH
    ) {
      setError(
        `La contraseña debe tener entre ${ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH} y ${ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH} caracteres.`,
      );
      return;
    }

    setError('');
    const restored = await importEncryptedData(file, password);
    if (restored) reset();
    else setPassword('');
  };

  return (
    <>
      <Button
        type="button"
        disabled={isWorking}
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
          if (!open && !isWorking) reset();
        }}
      >
        <AlertDialogContent aria-busy={isWorking}>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restaurar backup cifrado?</AlertDialogTitle>
            <AlertDialogDescription>
              Se autenticará y descifrará <span className="font-medium break-all">{file?.name}</span> localmente.
              Solo si el archivo y la contraseña son válidos se reemplazarán tus datos actuales.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Contraseña del backup</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              maxLength={ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH}
              onChange={event => setPassword(event.target.value)}
              disabled={isWorking}
              autoFocus
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Contraseña incorrecta, archivo alterado o formato incompatible no deben modificar tus datos actuales.
          </p>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isWorking}>Cancelar</AlertDialogCancel>
            <Button type="button" disabled={isWorking || !password} onClick={restore}>
              {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileKey2 className="mr-2 h-4 w-4" />}
              {isWorking ? 'Restaurando…' : 'Restaurar datos'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

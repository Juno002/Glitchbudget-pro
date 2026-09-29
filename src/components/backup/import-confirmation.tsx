'use client';

import { useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { BackupPreviewSummary } from './backup-preview-summary';
import type { BackupImportPreview } from '@/lib/backup-json';

export function ImportConfirmation({
  file,
  preview,
  onCancel,
  onConfirm,
  scope,
}: {
  file: File | null;
  preview: BackupImportPreview | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  scope: string;
}) {
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  return (
    <AlertDialog open={!!file && !!preview} onOpenChange={open => { if (!open && !locked.current) onCancel(); }}>
      <AlertDialogContent aria-busy={busy}>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Restaurar este archivo?</AlertDialogTitle>
          <AlertDialogDescription>
            Se reemplazarán {scope} con los datos de <span className="font-medium break-all">{file?.name}</span>.
            Revisa el contenido validado antes de continuar.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {preview && <BackupPreviewSummary preview={preview} />}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <Button
            disabled={busy || !preview}
            onClick={async () => {
              if (locked.current || !preview) return;
              locked.current = true;
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                locked.current = false;
                setBusy(false);
              }
            }}
          >
            {busy ? 'Restaurando…' : 'Confirmar y restaurar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

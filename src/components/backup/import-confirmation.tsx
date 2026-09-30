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
  preview = null,
  requirePreview = false,
  onCancel,
  onConfirm,
  scope,
}: {
  file: File | null;
  preview?: BackupImportPreview | null;
  requirePreview?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  scope: string;
}) {
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const ready = !!file && (!requirePreview || !!preview);

  return (
    <AlertDialog open={ready} onOpenChange={open => { if (!open && !locked.current) onCancel(); }}>
      <AlertDialogContent aria-busy={busy} data-import-confirmation="prisma">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-2xl font-normal">¿Restaurar este archivo?</AlertDialogTitle>
          <AlertDialogDescription>
            Se reemplazarán {scope} con los datos de <span className="font-medium break-all">{file?.name}</span>.
            {preview ? ' Revisa el contenido validado antes de continuar.' : ' Esta acción reemplaza los registros actuales del alcance indicado.'}
            {' '}Antes de escribir, GlitchBudget intentará crear una copia local automática cuando OPFS esté disponible.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {preview && <BackupPreviewSummary preview={preview} />}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <Button
            disabled={busy || (requirePreview && !preview)}
            onClick={async () => {
              if (locked.current || (requirePreview && !preview)) return;
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
            {busy ? 'Restaurando…' : preview ? 'Confirmar y restaurar' : 'Restaurar datos'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

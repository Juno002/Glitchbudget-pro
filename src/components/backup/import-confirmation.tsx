'use client';
import { useRef, useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
export function ImportConfirmation({ file, onCancel, onConfirm, scope }: { file: File | null; onCancel: () => void; onConfirm: () => Promise<void>; scope: string }) {
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  return <AlertDialog open={!!file} onOpenChange={open => { if (!open && !locked.current) onCancel(); }}>
    <AlertDialogContent aria-busy={busy}>
      <AlertDialogHeader><AlertDialogTitle>¿Restaurar este archivo?</AlertDialogTitle>
      <AlertDialogDescription>Se reemplazarán {scope} con los datos de <span className="font-medium break-all">{file?.name}</span>. Conserva un respaldo JSON de tus datos actuales antes de continuar.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
        <Button disabled={busy} onClick={async () => { if (locked.current) return; locked.current = true; setBusy(true); try { await onConfirm(); } finally { locked.current = false; setBusy(false); } }}>{busy ? 'Restaurando…' : 'Restaurar datos'}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

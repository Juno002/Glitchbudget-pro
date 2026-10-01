
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFinances, type BackupFile } from '@/contexts/finance-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  FileDown,
  Trash2,
  UploadCloud,
  FilePlus,
  Loader2,
  RotateCcw,
  FileClock,
  FileUp,
  Download
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
import { ImportConfirmation } from './import-confirmation';
import CsvBackupDialog from './csv-backup-dialog';
import EncryptedBackupExport from './encrypted-backup-export';
import EncryptedBackupRestore from './encrypted-backup-restore';
import { previewDataJSON, type BackupImportPreview } from '@/lib/backup-json';

export default function OpfsBackupDialog() {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<BackupImportPreview | null>(null);
  const [pendingLocalName, setPendingLocalName] = useState<string | null>(null);
  const [previewingImport, setPreviewingImport] = useState(false);
  const [open, setOpen] = useState(false);
  const {
    createBackup,
    listBackups,
    restoreBackup,
    deleteBackup,
    getBackupFile,
    isWorking,
    exportData,
    importData,
  } = useFinances();
  const { toast } = useToast();
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshBackupList = useCallback(async () => {
    try {
      const files = await listBackups();
      setBackupFiles(files);
    } catch (error) {
      toast({
        title: 'Error al listar copias',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  }, [listBackups, toast]);

  useEffect(() => {
    if (open) {
      refreshBackupList();
    }
  }, [open, refreshBackupList]);

  const handleCreate = async () => {
    try {
      await createBackup();
      await refreshBackupList();
    } catch (error) {
      // Toast is handled in context
    }
  };
  
  const resetPendingImport = () => {
    setPendingFile(null);
    setPendingPreview(null);
    setPendingLocalName(null);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    setPreviewingImport(true);
    try {
      const preview = previewDataJSON(await file.text());
      setPendingFile(file);
      setPendingPreview(preview);
      setPendingLocalName(null);
    } catch (error) {
      resetPendingImport();
      toast({
        title: 'Copia no válida',
        description: error instanceof Error ? error.message : 'No se pudo validar el archivo.',
        variant: 'destructive',
      });
    } finally {
      setPreviewingImport(false);
    }
  };

  const handleDownload = async (name: string) => {
    const file = await getBackupFile(name);
    if(file){
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
  };

  const prepareLocalRestore = async (name: string) => {
    setPreviewingImport(true);
    try {
      const file = await getBackupFile(name);
      if (!file) throw new Error('No se pudo leer la copia local seleccionada.');
      const preview = previewDataJSON(await file.text());
      setPendingFile(file);
      setPendingPreview(preview);
      setPendingLocalName(name);
    } catch (error) {
      resetPendingImport();
      toast({
        title: 'No se pudo revisar la copia',
        description: error instanceof Error ? error.message : 'La copia local no es válida.',
        variant: 'destructive',
      });
    } finally {
      setPreviewingImport(false);
    }
  };

  const confirmPendingRestore = async () => {
    if (!pendingFile || !pendingPreview) return;
    try {
      const restored = pendingLocalName
        ? await restoreBackup(pendingLocalName)
        : await importData(pendingFile);
      if (restored) {
        resetPendingImport();
        setOpen(false);
      }
    } catch (error) {
      // Toast is handled in context.
    }
  };
  
  const handleDelete = async (name: string) => {
    try {
        await deleteBackup(name);
        await refreshBackupList();
    } catch (error) {
        // Toast is handled in context
    }
  };

  return (
    <Dialog open={open} onOpenChange={value => { if (!isWorking && !previewingImport) setOpen(value); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <UploadCloud className="mr-2 h-4 w-4" />
          <span>Copias de Seguridad</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl" data-backups-prisma="true">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">Datos y copias</DialogTitle>
          <DialogDescription>
            Tus datos están en este navegador. Puedes descargar el JSON normal o crear una copia cifrada opcional. Las copias locales del navegador siguen sin cifrar y se eliminan al borrar los datos del sitio.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
            <Button onClick={handleCreate} disabled={isWorking || previewingImport} className="w-full rounded-[var(--radius-interactive)] sm:w-auto">
              {isWorking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FilePlus className="mr-2 h-4 w-4" />
              )}
              Crear Copia Local
            </Button>
             <Button disabled={isWorking || previewingImport} variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
                <FileUp className="mr-2 h-4 w-4" />
                Restaurar desde JSON
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="application/json"
            />
            <Button disabled={isWorking || previewingImport} variant="outline" onClick={exportData} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Exportar a JSON
            </Button>
            <EncryptedBackupExport />
            <EncryptedBackupRestore />
            <CsvBackupDialog />
        </div>
        
        <p className="text-sm font-semibold text-muted-foreground mt-4">Copias Locales (Dispositivo)</p>
        <ScrollArea className="mt-2 h-64 rounded-[var(--radius-card)] border bg-muted/15">
            <div className="p-4">
                {isWorking && backupFiles.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : backupFiles.length > 0 ? (
                    <ul className="space-y-2">
                    {backupFiles.map((file) => (
                        <li key={file.name} className="flex items-center justify-between rounded-[var(--radius-interactive)] p-2 hover:bg-accent">
                        <div className="flex items-center gap-3">
                            <FileClock className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-mono text-sm">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(file.lastModified), "PPP p", { locale: es })} ({formatDistanceToNow(new Date(file.lastModified), { addSuffix: true, locale: es })})
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleDownload(file.name)} title="Descargar">
                                <FileDown className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              title="Restaurar"
                              disabled={isWorking || previewingImport}
                              onClick={() => prepareLocalRestore(file.name)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Eliminar">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar copia de seguridad?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                           Esta acción eliminará permanentemente el archivo de copia de seguridad &quot;{file.name}&quot;.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(file.name)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                        </div>
                        </li>
                    ))}
                    </ul>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">No hay copias de seguridad locales.</p>
                        <p className="text-sm text-muted-foreground">Crea tu primera copia para empezar.</p>
                    </div>
                )}
            </div>
        </ScrollArea>
        
        <ImportConfirmation
          file={pendingFile}
          preview={pendingPreview}
          requirePreview
          scope="todos tus datos actuales"
          onCancel={resetPendingImport}
          onConfirm={confirmPendingRestore}
        />
        <DialogFooter>
          <Button disabled={isWorking || previewingImport} variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


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
import CsvBackupDialog from './csv-backup-dialog';

export default function OpfsBackupDialog() {
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
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await importData(file);
      setOpen(false); // Close dialog on successful restore
    }
    // Reset file input to allow selecting the same file again
    if(fileInputRef.current) fileInputRef.current.value = '';
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

  const handleRestore = async (name: string) => {
    try {
        await restoreBackup(name);
        setOpen(false); // Close dialog on successful restore
    } catch (error) {
        // Toast is handled in context
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <UploadCloud className="mr-2 h-4 w-4" />
          <span>Copias de Seguridad</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestión de Copias</DialogTitle>
          <DialogDescription>
            Crea, restaura y gestiona tus copias de seguridad. Puedes guardarlas localmente en el dispositivo o exportarlas como un archivo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleCreate} disabled={isWorking} className="w-full sm:w-auto bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20">
              {isWorking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FilePlus className="mr-2 h-4 w-4" />
              )}
              Crear Copia Local
            </Button>
             <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
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
            <Button variant="outline" onClick={exportData} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Exportar a JSON
            </Button>
            <CsvBackupDialog />
        </div>
        
        <p className="text-sm font-semibold text-muted-foreground mt-4">Copias Locales (Dispositivo)</p>
        <ScrollArea className="h-64 mt-2 border rounded-md">
            <div className="p-4">
                {isWorking && backupFiles.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : backupFiles.length > 0 ? (
                    <ul className="space-y-2">
                    {backupFiles.map((file) => (
                        <li key={file.name} className="flex items-center justify-between p-2 rounded-md hover:bg-accent">
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

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" title="Restaurar">
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Restaurar esta copia?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esto reemplazará todos tus datos actuales con los de la copia de seguridad seleccionada. Esta acción no se puede deshacer.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleRestore(file.name)}>Restaurar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

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
                                           Esta acción eliminará permanentemente el archivo de copia de seguridad "{file.name}".
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
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

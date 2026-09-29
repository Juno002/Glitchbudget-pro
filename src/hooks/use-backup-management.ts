'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { importDataJSON, exportDataJSON } from '@/lib/backup-json';
import { restoreEncryptedBackupText } from '@/lib/encrypted-backup-restore';
import { opfsWrite, opfsRead, hasOPFS, opfsList, opfsDelete } from '@/lib/opfs';
import { createPreImportSafetyBackup } from '@/lib/pre-import-backup';
import { localDate } from '@/lib/finance-calculations';
import { friendlyError } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';

export type BackupFile = { name: string; lastModified: number };

export function useBackupManagement(
  setDataVersion: Dispatch<SetStateAction<number>>,
) {
  const { toast } = useToast();
  const [isWorking, setIsWorking] = useState(false);

  const backupBeforeDestructiveImport = useCallback(async () => {
    const result = await createPreImportSafetyBackup();
    if (result.status === 'created') {
      toast({
        title: 'Copia de seguridad automática creada',
        description: result.name,
      });
    } else {
      toast({
        title: 'Sin copia automática previa',
        description: 'OPFS no está disponible en este navegador. La restauración continuará sin una copia local previa.',
      });
    }
  }, [toast]);

  const createBackup = useCallback(async (): Promise<BackupFile | undefined> => {
    if (!(await hasOPFS())) {
      toast({
        title: 'Función no soportada',
        description: 'Tu navegador no soporta el sistema de archivos privados (OPFS).',
        variant: 'destructive',
      });
      return;
    }

    setIsWorking(true);
    try {
      const jsonString = await exportDataJSON();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const name = `glitchbudget-backup-${timestamp}.json`;
      await opfsWrite(name, jsonString);
      toast({ title: 'Copia de seguridad creada', description: name });
      const backups = await opfsList();
      return backups.find(backup => backup.name === name);
    } catch (error) {
      toast({
        title: 'Error al crear copia de seguridad',
        description: friendlyError(error),
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsWorking(false);
    }
  }, [toast]);

  const listBackups = useCallback(async (): Promise<BackupFile[]> => {
    if (!(await hasOPFS())) return [];
    return opfsList();
  }, []);

  const restoreBackup = useCallback(async (name: string) => {
    setIsWorking(true);
    try {
      const fileContent = await opfsRead(name);
      if (!fileContent) {
        throw new Error('El archivo de copia de seguridad está vacío o no se pudo leer.');
      }
      await importDataJSON(fileContent, undefined, {
        beforeWrite: backupBeforeDestructiveImport,
      });
      setDataVersion(version => version + 1);
      toast({
        title: 'Restauración completada',
        description: `Datos restaurados desde ${name}`,
      });
      return true;
    } catch (error) {
      toast({
        title: 'Error al restaurar',
        description: friendlyError(error),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsWorking(false);
    }
  }, [backupBeforeDestructiveImport, setDataVersion, toast]);

  const deleteBackup = useCallback(async (name: string) => {
    setIsWorking(true);
    try {
      await opfsDelete(name);
      toast({ title: 'Copia de seguridad eliminada', description: name });
    } catch (error) {
      toast({
        title: 'Error al eliminar',
        description: friendlyError(error),
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsWorking(false);
    }
  }, [toast]);

  const getBackupFile = useCallback(async (name: string): Promise<File | null> => {
    try {
      const fileContent = await opfsRead(name);
      return fileContent
        ? new File([fileContent], name, { type: 'application/json' })
        : null;
    } catch (error) {
      toast({
        title: 'Error al descargar',
        description: friendlyError(error),
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const exportData = useCallback(async () => {
    setIsWorking(true);
    try {
      const json = await exportDataJSON();
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `glitchbudget-backup-${localDate()}.json`;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
      toast({ title: 'Exportación completada' });
    } catch (error) {
      toast({
        title: 'Error al exportar',
        description: friendlyError(error),
        variant: 'destructive',
      });
    } finally {
      setIsWorking(false);
    }
  }, [toast]);

  const importData = useCallback(async (file: File) => {
    setIsWorking(true);
    try {
      const text = await file.text();
      await importDataJSON(text, undefined, {
        beforeWrite: backupBeforeDestructiveImport,
      });
      setDataVersion(version => version + 1);
      toast({
        title: 'Datos restaurados',
        description: 'El dashboard se actualizará automáticamente.',
      });
      return true;
    } catch (error) {
      toast({
        title: 'Error al importar',
        description: friendlyError(error),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsWorking(false);
    }
  }, [backupBeforeDestructiveImport, setDataVersion, toast]);

  const importEncryptedData = useCallback(async (file: File, password: string) => {
    setIsWorking(true);
    try {
      const encryptedText = await file.text();
      await restoreEncryptedBackupText(
        encryptedText,
        password,
        undefined,
        { beforeWrite: backupBeforeDestructiveImport },
      );
      setDataVersion(version => version + 1);
      toast({
        title: 'Backup cifrado restaurado',
        description: 'El archivo se autenticó, descifró e importó localmente.',
      });
      return true;
    } catch (error) {
      toast({
        title: 'No se pudo restaurar el backup cifrado',
        description: friendlyError(error),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsWorking(false);
    }
  }, [backupBeforeDestructiveImport, setDataVersion, toast]);

  return {
    isWorking,
    backupBeforeDestructiveImport,
    createBackup,
    listBackups,
    restoreBackup,
    deleteBackup,
    getBackupFile,
    exportData,
    importData,
    importEncryptedData,
  };
}

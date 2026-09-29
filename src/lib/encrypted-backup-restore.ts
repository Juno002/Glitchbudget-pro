import { decryptEncryptedBackupText } from './encrypted-backup';
import { importDataJSON, previewDataJSON, type BackupImportPreview } from './backup-json';
import type { LocalAutomationStorage } from './local-automation';

export async function restoreEncryptedBackupText(
  encryptedText: string,
  password: string,
  storage?: LocalAutomationStorage,
): Promise<{ counts: Record<string, number> }> {
  const json = await decryptEncryptedBackupText(encryptedText, password);
  return importDataJSON(json, storage);
}


export async function previewEncryptedBackupText(
  encryptedText: string,
  password: string,
  storage?: LocalAutomationStorage,
): Promise<BackupImportPreview> {
  const json = await decryptEncryptedBackupText(encryptedText, password);
  return previewDataJSON(json, storage);
}

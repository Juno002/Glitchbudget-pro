import { decryptEncryptedBackupText } from './encrypted-backup';
import { importDataJSON, previewDataJSON, type BackupImportOptions, type BackupImportPreview } from './backup-json';
import type { LocalAutomationStorage } from './local-automation';

export async function restoreEncryptedBackupText(
  encryptedText: string,
  password: string,
  storage?: LocalAutomationStorage,
  options: BackupImportOptions = {},
): Promise<{ counts: Record<string, number> }> {
  const json = await decryptEncryptedBackupText(encryptedText, password);
  return importDataJSON(json, storage, options);
}


export async function previewEncryptedBackupText(
  encryptedText: string,
  password: string,
  storage?: LocalAutomationStorage,
): Promise<BackupImportPreview> {
  const json = await decryptEncryptedBackupText(encryptedText, password);
  return previewDataJSON(json, storage);
}

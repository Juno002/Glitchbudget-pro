import { exportDataJSON } from './backup-json';
import { hasOPFS, opfsWrite } from './opfs';

export type PreImportBackupResult =
  | { status: 'created'; name: string }
  | { status: 'unavailable' };

type PreImportBackupDependencies = {
  hasOPFS: () => Promise<boolean>;
  exportDataJSON: () => Promise<string>;
  write: (name: string, text: string) => Promise<void>;
  now: () => Date;
  id: () => string;
};

const defaultDependencies: PreImportBackupDependencies = {
  hasOPFS,
  exportDataJSON,
  write: opfsWrite,
  now: () => new Date(),
  id: () => crypto.randomUUID().slice(0, 8),
};

function backupTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

export async function createPreImportSafetyBackup(
  overrides: Partial<PreImportBackupDependencies> = {},
): Promise<PreImportBackupResult> {
  const deps = { ...defaultDependencies, ...overrides };

  if (!(await deps.hasOPFS())) {
    return { status: 'unavailable' };
  }

  try {
    const json = await deps.exportDataJSON();
    const name = `prisma-pre-import-${backupTimestamp(deps.now())}-${deps.id()}.json`;
    await deps.write(name, json);
    return { status: 'created', name };
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(
      'No se pudo crear la copia local automática previa. La importación fue cancelada para proteger tus datos.'
      + detail,
    );
  }
}

export type StoragePersistenceState =
  | 'persistent'
  | 'best-effort'
  | 'unsupported'
  | 'error';

export type StoragePersistenceManager = {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
};

function browserStorageManager(): StoragePersistenceManager | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return navigator.storage;
}

function supportsPersistence(
  manager: StoragePersistenceManager | undefined,
): manager is Required<StoragePersistenceManager> {
  return Boolean(
    manager
    && typeof manager.persisted === 'function'
    && typeof manager.persist === 'function',
  );
}

/**
 * Reads the browser-managed durability state without prompting for anything.
 * Financial data remains local either way; "best-effort" means the browser may
 * evict origin storage under storage pressure.
 */
export async function readStoragePersistenceState(
  manager: StoragePersistenceManager | undefined = browserStorageManager(),
): Promise<StoragePersistenceState> {
  if (!supportsPersistence(manager)) return 'unsupported';
  try {
    return await manager.persisted() ? 'persistent' : 'best-effort';
  } catch {
    return 'error';
  }
}

/**
 * Requests persistent origin storage when the browser supports it.
 * Browsers are free to deny the request; denial is not treated as an error.
 */
export async function requestPersistentStorage(
  manager: StoragePersistenceManager | undefined = browserStorageManager(),
): Promise<StoragePersistenceState> {
  if (!supportsPersistence(manager)) return 'unsupported';
  try {
    if (await manager.persisted()) return 'persistent';
    return await manager.persist() ? 'persistent' : 'best-effort';
  } catch {
    return 'error';
  }
}

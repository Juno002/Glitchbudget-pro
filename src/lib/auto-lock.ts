import {
  AUTO_LOCK_STORAGE_KEY,
  AUTO_LOCK_TIMEOUT_OPTIONS,
  type AutoLockTimeoutMinutes,
} from '@/domain/local-security';

export type AutoLockStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type AutoLockRecordV1 = {
  v: 1;
  enabled: true;
  timeoutMinutes: AutoLockTimeoutMinutes;
};

export function isAutoLockTimeoutMinutes(value: unknown): value is AutoLockTimeoutMinutes {
  return typeof value === 'number' && (AUTO_LOCK_TIMEOUT_OPTIONS as readonly number[]).includes(value);
}

export function parseAutoLockRecord(value: unknown): AutoLockRecordV1 | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<AutoLockRecordV1>;
  if (row.v !== 1 || row.enabled !== true || !isAutoLockTimeoutMinutes(row.timeoutMinutes)) return null;
  return {
    v: 1,
    enabled: true,
    timeoutMinutes: row.timeoutMinutes,
  };
}

export function loadAutoLockRecord(storage: AutoLockStorage): AutoLockRecordV1 | null {
  try {
    const raw = storage.getItem(AUTO_LOCK_STORAGE_KEY);
    if (!raw) return null;
    return parseAutoLockRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveAutoLockRecord(
  storage: AutoLockStorage,
  timeoutMinutes: AutoLockTimeoutMinutes,
): AutoLockRecordV1 {
  if (!isAutoLockTimeoutMinutes(timeoutMinutes)) throw new Error('Tiempo de Auto-lock no válido.');
  const record: AutoLockRecordV1 = { v: 1, enabled: true, timeoutMinutes };
  storage.setItem(AUTO_LOCK_STORAGE_KEY, JSON.stringify(record));
  return record;
}

export function clearAutoLock(storage: AutoLockStorage): void {
  storage.removeItem(AUTO_LOCK_STORAGE_KEY);
}

export function autoLockTimeoutMs(timeoutMinutes: AutoLockTimeoutMinutes): number {
  return timeoutMinutes * 60_000;
}

export function shouldAutoLock(
  lastActivityAt: number,
  now: number,
  timeoutMinutes: AutoLockTimeoutMinutes,
): boolean {
  if (!Number.isFinite(lastActivityAt) || !Number.isFinite(now) || now < lastActivityAt) return false;
  return now - lastActivityAt >= autoLockTimeoutMs(timeoutMinutes);
}

export function remainingAutoLockMs(
  lastActivityAt: number,
  now: number,
  timeoutMinutes: AutoLockTimeoutMinutes,
): number {
  const elapsed = Math.max(0, now - lastActivityAt);
  return Math.max(0, autoLockTimeoutMs(timeoutMinutes) - elapsed);
}

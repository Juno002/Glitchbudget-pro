import {
  APP_LOCK_PIN_MAX_LENGTH,
  APP_LOCK_PIN_MIN_LENGTH,
  APP_LOCK_STORAGE_KEY,
} from '@/domain/local-security';

export const APP_LOCK_KDF = 'PBKDF2-SHA-256' as const;
export const APP_LOCK_ITERATIONS = 310_000;
const APP_LOCK_SALT_BYTES = 16;
const APP_LOCK_VERIFIER_BITS = 256;

export type AppLockStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type AppLockRecordV1 = {
  v: 1;
  kdf: typeof APP_LOCK_KDF;
  iterations: number;
  salt: string;
  verifier: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function normalizeAppLockPin(pin: string): string {
  return pin.trim();
}

export function isValidAppLockPin(pin: string): boolean {
  const normalized = normalizeAppLockPin(pin);
  return new RegExp(`^\\d{${APP_LOCK_PIN_MIN_LENGTH},${APP_LOCK_PIN_MAX_LENGTH}}$`).test(normalized);
}

export function parseAppLockRecord(value: unknown): AppLockRecordV1 | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<AppLockRecordV1>;
  if (
    row.v !== 1 ||
    row.kdf !== APP_LOCK_KDF ||
    row.iterations !== APP_LOCK_ITERATIONS ||
    typeof row.salt !== 'string' ||
    typeof row.verifier !== 'string'
  ) return null;
  const salt = base64ToBytes(row.salt);
  const verifier = base64ToBytes(row.verifier);
  if (!salt || salt.length !== APP_LOCK_SALT_BYTES || !verifier || verifier.length !== APP_LOCK_VERIFIER_BITS / 8) return null;
  return {
    v: 1,
    kdf: APP_LOCK_KDF,
    iterations: APP_LOCK_ITERATIONS,
    salt: row.salt,
    verifier: row.verifier,
  };
}

export function loadAppLockRecord(storage: AppLockStorage): AppLockRecordV1 | null {
  try {
    const raw = storage.getItem(APP_LOCK_STORAGE_KEY);
    if (!raw) return null;
    return parseAppLockRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function deriveVerifier(pin: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(normalizeAppLockPin(pin)),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: APP_LOCK_ITERATIONS,
    },
    key,
    APP_LOCK_VERIFIER_BITS,
  );
  return new Uint8Array(bits);
}

export async function createAppLockRecord(pin: string): Promise<AppLockRecordV1> {
  if (!isValidAppLockPin(pin)) {
    throw new Error(`El PIN debe tener entre ${APP_LOCK_PIN_MIN_LENGTH} y ${APP_LOCK_PIN_MAX_LENGTH} dígitos.`);
  }
  const salt = crypto.getRandomValues(new Uint8Array(APP_LOCK_SALT_BYTES));
  const verifier = await deriveVerifier(pin, salt);
  return {
    v: 1,
    kdf: APP_LOCK_KDF,
    iterations: APP_LOCK_ITERATIONS,
    salt: bytesToBase64(salt),
    verifier: bytesToBase64(verifier),
  };
}

export async function verifyAppLockPin(record: AppLockRecordV1, pin: string): Promise<boolean> {
  if (!isValidAppLockPin(pin)) return false;
  const salt = base64ToBytes(record.salt);
  const expected = base64ToBytes(record.verifier);
  if (!salt || !expected) return false;
  const actual = await deriveVerifier(pin, salt);
  return constantTimeEqual(actual, expected);
}

export async function enableAppLock(storage: AppLockStorage, pin: string): Promise<AppLockRecordV1> {
  const record = await createAppLockRecord(pin);
  storage.setItem(APP_LOCK_STORAGE_KEY, JSON.stringify(record));
  return record;
}

export async function replaceAppLockPin(
  storage: AppLockStorage,
  currentPin: string,
  newPin: string,
): Promise<boolean> {
  const current = loadAppLockRecord(storage);
  if (!current || !(await verifyAppLockPin(current, currentPin))) return false;
  const next = await createAppLockRecord(newPin);
  storage.setItem(APP_LOCK_STORAGE_KEY, JSON.stringify(next));
  return true;
}

export async function disableAppLock(storage: AppLockStorage, currentPin: string): Promise<boolean> {
  const current = loadAppLockRecord(storage);
  if (!current || !(await verifyAppLockPin(current, currentPin))) return false;
  storage.removeItem(APP_LOCK_STORAGE_KEY);
  return true;
}

export function clearAppLock(storage: AppLockStorage): void {
  storage.removeItem(APP_LOCK_STORAGE_KEY);
}

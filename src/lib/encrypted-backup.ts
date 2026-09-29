import {
  ENCRYPTED_BACKUP_FORMAT,
  ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH,
  ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH,
  ENCRYPTED_BACKUP_VERSION,
} from '@/domain/local-security';

export const ENCRYPTED_BACKUP_KDF = {
  name: 'PBKDF2',
  hash: 'SHA-256',
  iterations: 310_000,
} as const;

export const ENCRYPTED_BACKUP_CIPHER = {
  name: 'AES-GCM',
  keyLength: 256,
  tagLength: 128,
} as const;

const SALT_BYTES = 16;
const NONCE_BYTES = 12;

export type EncryptedBackupEnvelopeV1 = {
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  version: typeof ENCRYPTED_BACKUP_VERSION;
  kdf: typeof ENCRYPTED_BACKUP_KDF;
  cipher: typeof ENCRYPTED_BACKUP_CIPHER;
  salt: string;
  nonce: string;
  ciphertext: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function isValidEncryptedBackupPassword(password: string): boolean {
  return password.length >= ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH
    && password.length <= ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH;
}

export function encryptedBackupAad(): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    kdf: ENCRYPTED_BACKUP_KDF,
    cipher: ENCRYPTED_BACKUP_CIPHER,
  }));
}

async function deriveEncryptionKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: ENCRYPTED_BACKUP_KDF.hash,
      salt,
      iterations: ENCRYPTED_BACKUP_KDF.iterations,
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: ENCRYPTED_BACKUP_CIPHER.keyLength,
    },
    false,
    ['encrypt'],
  );
}

export async function encryptBackupJSON(
  plaintextJson: string,
  password: string,
): Promise<EncryptedBackupEnvelopeV1> {
  if (!isValidEncryptedBackupPassword(password)) {
    throw new Error(
      `La contraseña debe tener entre ${ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH} y ${ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH} caracteres.`,
    );
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  const key = await deriveEncryptionKey(password, salt);
  const plaintext = new TextEncoder().encode(plaintextJson);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      tagLength: ENCRYPTED_BACKUP_CIPHER.tagLength,
      additionalData: encryptedBackupAad(),
    },
    key,
    plaintext,
  );

  return {
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    kdf: ENCRYPTED_BACKUP_KDF,
    cipher: ENCRYPTED_BACKUP_CIPHER,
    salt: bytesToBase64(salt),
    nonce: bytesToBase64(nonce),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function exportEncryptedBackupText(
  plaintextJson: string,
  password: string,
): Promise<string> {
  const envelope = await encryptBackupJSON(plaintextJson, password);
  return JSON.stringify(envelope, null, 2);
}

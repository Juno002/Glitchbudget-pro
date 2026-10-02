import {
  ENCRYPTED_BACKUP_FORMAT,
  ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH,
  ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH,
  ENCRYPTED_BACKUP_VERSION,
} from '@/domain/local-security';

export const ENCRYPTED_BACKUP_MIN_KDF_ITERATIONS = 310_000;
export const ENCRYPTED_BACKUP_MAX_KDF_ITERATIONS = 750_000;

export type EncryptedBackupKdfV1 = {
  name: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
};

export type EncryptedBackupCipherV1 = {
  name: 'AES-GCM';
  keyLength: 256;
  tagLength: 128;
};

export const ENCRYPTED_BACKUP_KDF = {
  name: 'PBKDF2',
  hash: 'SHA-256',
  iterations: 310_000,
} as const satisfies EncryptedBackupKdfV1;

export const ENCRYPTED_BACKUP_CIPHER = {
  name: 'AES-GCM',
  keyLength: 256,
  tagLength: 128,
} as const satisfies EncryptedBackupCipherV1;

const SALT_BYTES = 16;
const NONCE_BYTES = 12;

export type EncryptedBackupEnvelopeV1 = {
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  version: typeof ENCRYPTED_BACKUP_VERSION;
  kdf: EncryptedBackupKdfV1;
  cipher: EncryptedBackupCipherV1;
  salt: string;
  nonce: string;
  ciphertext: string;
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

function validatedKdf(value: unknown): EncryptedBackupKdfV1 | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<EncryptedBackupKdfV1>;
  if (row.name !== ENCRYPTED_BACKUP_KDF.name || row.hash !== ENCRYPTED_BACKUP_KDF.hash) return null;
  if (typeof row.iterations !== 'number' || !Number.isSafeInteger(row.iterations)) return null;
  if (
    row.iterations < ENCRYPTED_BACKUP_MIN_KDF_ITERATIONS
    || row.iterations > ENCRYPTED_BACKUP_MAX_KDF_ITERATIONS
  ) {
    return null;
  }
  return {
    name: ENCRYPTED_BACKUP_KDF.name,
    hash: ENCRYPTED_BACKUP_KDF.hash,
    iterations: row.iterations,
  };
}

function validatedCipher(value: unknown): EncryptedBackupCipherV1 | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<EncryptedBackupCipherV1>;
  if (
    row.name !== ENCRYPTED_BACKUP_CIPHER.name
    || row.keyLength !== ENCRYPTED_BACKUP_CIPHER.keyLength
    || row.tagLength !== ENCRYPTED_BACKUP_CIPHER.tagLength
  ) {
    return null;
  }
  return {
    name: ENCRYPTED_BACKUP_CIPHER.name,
    keyLength: ENCRYPTED_BACKUP_CIPHER.keyLength,
    tagLength: ENCRYPTED_BACKUP_CIPHER.tagLength,
  };
}

export function isValidEncryptedBackupPassword(password: string): boolean {
  return password.length >= ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH
    && password.length <= ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH;
}

export function encryptedBackupAad(
  kdf: EncryptedBackupKdfV1 = ENCRYPTED_BACKUP_KDF,
  cipher: EncryptedBackupCipherV1 = ENCRYPTED_BACKUP_CIPHER,
): Uint8Array {
  const canonicalKdf = {
    name: kdf.name,
    hash: kdf.hash,
    iterations: kdf.iterations,
  };
  const canonicalCipher = {
    name: cipher.name,
    keyLength: cipher.keyLength,
    tagLength: cipher.tagLength,
  };
  return new TextEncoder().encode(JSON.stringify({
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    kdf: canonicalKdf,
    cipher: canonicalCipher,
  }));
}

async function deriveEncryptionKey(
  password: string,
  salt: Uint8Array,
  usages: KeyUsage[],
  kdf: EncryptedBackupKdfV1,
  cipher: EncryptedBackupCipherV1,
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    kdf.name,
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: kdf.name,
      hash: kdf.hash,
      salt,
      iterations: kdf.iterations,
    },
    passwordKey,
    {
      name: cipher.name,
      length: cipher.keyLength,
    },
    false,
    usages,
  );
}

async function encryptBackupJSONWithValidatedKdf(
  plaintextJson: string,
  password: string,
  kdf: EncryptedBackupKdfV1,
): Promise<EncryptedBackupEnvelopeV1> {
  if (!isValidEncryptedBackupPassword(password)) {
    throw new Error(
      `La contraseña debe tener entre ${ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH} y ${ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH} caracteres.`,
    );
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  const cipher = ENCRYPTED_BACKUP_CIPHER;
  const key = await deriveEncryptionKey(password, salt, ['encrypt'], kdf, cipher);
  const plaintext = new TextEncoder().encode(plaintextJson);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: cipher.name,
      iv: nonce,
      tagLength: cipher.tagLength,
      additionalData: encryptedBackupAad(kdf, cipher),
    },
    key,
    plaintext,
  );

  return {
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    kdf,
    cipher,
    salt: bytesToBase64(salt),
    nonce: bytesToBase64(nonce),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

/**
 * Compatibility/test helper for exercising accepted v1 KDF metadata.
 * Product export flows must use encryptBackupJSON/exportEncryptedBackupText,
 * which remain pinned to ENCRYPTED_BACKUP_KDF.
 */
export async function encryptBackupJSONWithKdf(
  plaintextJson: string,
  password: string,
  kdf: EncryptedBackupKdfV1,
): Promise<EncryptedBackupEnvelopeV1> {
  const canonicalKdf = validatedKdf(kdf);
  if (!canonicalKdf) {
    throw new Error('Los metadatos criptográficos de la copia no son compatibles.');
  }
  return encryptBackupJSONWithValidatedKdf(plaintextJson, password, canonicalKdf);
}

export async function encryptBackupJSON(
  plaintextJson: string,
  password: string,
): Promise<EncryptedBackupEnvelopeV1> {
  return encryptBackupJSONWithValidatedKdf(plaintextJson, password, ENCRYPTED_BACKUP_KDF);
}

export async function exportEncryptedBackupText(
  plaintextJson: string,
  password: string,
): Promise<string> {
  const envelope = await encryptBackupJSON(plaintextJson, password);
  return JSON.stringify(envelope, null, 2);
}

export function parseEncryptedBackupEnvelopeText(text: string): EncryptedBackupEnvelopeV1 {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('El archivo cifrado no contiene un sobre JSON válido.');
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('El archivo cifrado no contiene un sobre válido.');
  }

  const row = raw as Partial<EncryptedBackupEnvelopeV1>;
  if (row.format !== ENCRYPTED_BACKUP_FORMAT) {
    throw new Error('El archivo no es una copia cifrada compatible de Prisma.');
  }
  if (row.version !== ENCRYPTED_BACKUP_VERSION) {
    throw new Error('La versión de la copia cifrada no es compatible.');
  }

  const kdf = validatedKdf(row.kdf);
  const cipher = validatedCipher(row.cipher);
  if (!kdf || !cipher) {
    throw new Error('Los metadatos criptográficos de la copia no son compatibles.');
  }
  if (typeof row.salt !== 'string' || typeof row.nonce !== 'string' || typeof row.ciphertext !== 'string') {
    throw new Error('La copia cifrada está incompleta.');
  }

  const salt = base64ToBytes(row.salt);
  const nonce = base64ToBytes(row.nonce);
  const ciphertext = base64ToBytes(row.ciphertext);
  if (!salt || salt.length !== SALT_BYTES || !nonce || nonce.length !== NONCE_BYTES || !ciphertext || ciphertext.length < 16) {
    throw new Error('La copia cifrada contiene datos codificados inválidos.');
  }

  return {
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    kdf,
    cipher,
    salt: row.salt,
    nonce: row.nonce,
    ciphertext: row.ciphertext,
  };
}

export async function decryptEncryptedBackupText(
  text: string,
  password: string,
): Promise<string> {
  if (!isValidEncryptedBackupPassword(password)) {
    throw new Error('No se pudo abrir la copia cifrada. La contraseña puede ser incorrecta o el archivo puede estar dañado.');
  }

  const envelope = parseEncryptedBackupEnvelopeText(text);
  const salt = base64ToBytes(envelope.salt)!;
  const nonce = base64ToBytes(envelope.nonce)!;
  const ciphertext = base64ToBytes(envelope.ciphertext)!;
  const key = await deriveEncryptionKey(
    password,
    salt,
    ['decrypt'],
    envelope.kdf,
    envelope.cipher,
  );

  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: envelope.cipher.name,
        iv: nonce,
        tagLength: envelope.cipher.tagLength,
        additionalData: encryptedBackupAad(envelope.kdf, envelope.cipher),
      },
      key,
      ciphertext,
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error('No se pudo abrir la copia cifrada. La contraseña puede ser incorrecta o el archivo puede estar dañado.');
  }
}

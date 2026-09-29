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

function sameKdf(value: unknown): value is typeof ENCRYPTED_BACKUP_KDF {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<typeof ENCRYPTED_BACKUP_KDF>;
  return row.name === ENCRYPTED_BACKUP_KDF.name
    && row.hash === ENCRYPTED_BACKUP_KDF.hash
    && row.iterations === ENCRYPTED_BACKUP_KDF.iterations;
}

function sameCipher(value: unknown): value is typeof ENCRYPTED_BACKUP_CIPHER {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<typeof ENCRYPTED_BACKUP_CIPHER>;
  return row.name === ENCRYPTED_BACKUP_CIPHER.name
    && row.keyLength === ENCRYPTED_BACKUP_CIPHER.keyLength
    && row.tagLength === ENCRYPTED_BACKUP_CIPHER.tagLength;
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

async function deriveEncryptionKey(
  password: string,
  salt: Uint8Array,
  usages: KeyUsage[],
): Promise<CryptoKey> {
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
    usages,
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
  const key = await deriveEncryptionKey(password, salt, ['encrypt']);
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
    throw new Error('El archivo no es un backup cifrado de GlitchBudget compatible.');
  }
  if (row.version !== ENCRYPTED_BACKUP_VERSION) {
    throw new Error('La versión del backup cifrado no es compatible.');
  }
  if (!sameKdf(row.kdf) || !sameCipher(row.cipher)) {
    throw new Error('La metadata criptográfica del backup no es compatible.');
  }
  if (typeof row.salt !== 'string' || typeof row.nonce !== 'string' || typeof row.ciphertext !== 'string') {
    throw new Error('El backup cifrado está incompleto.');
  }

  const salt = base64ToBytes(row.salt);
  const nonce = base64ToBytes(row.nonce);
  const ciphertext = base64ToBytes(row.ciphertext);
  if (!salt || salt.length !== SALT_BYTES || !nonce || nonce.length !== NONCE_BYTES || !ciphertext || ciphertext.length < 16) {
    throw new Error('El backup cifrado contiene datos codificados inválidos.');
  }

  return {
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    kdf: ENCRYPTED_BACKUP_KDF,
    cipher: ENCRYPTED_BACKUP_CIPHER,
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
    throw new Error('No se pudo abrir el backup cifrado. La contraseña puede ser incorrecta o el archivo puede estar dañado.');
  }

  const envelope = parseEncryptedBackupEnvelopeText(text);
  const salt = base64ToBytes(envelope.salt)!;
  const nonce = base64ToBytes(envelope.nonce)!;
  const ciphertext = base64ToBytes(envelope.ciphertext)!;
  const key = await deriveEncryptionKey(password, salt, ['decrypt']);

  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
        tagLength: ENCRYPTED_BACKUP_CIPHER.tagLength,
        additionalData: encryptedBackupAad(),
      },
      key,
      ciphertext,
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error('No se pudo abrir el backup cifrado. La contraseña puede ser incorrecta o el archivo puede estar dañado.');
  }
}

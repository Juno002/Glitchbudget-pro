import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  ENCRYPTED_BACKUP_CIPHER,
  ENCRYPTED_BACKUP_KDF,
  ENCRYPTED_BACKUP_MAX_KDF_ITERATIONS,
  ENCRYPTED_BACKUP_MIN_KDF_ITERATIONS,
  decryptEncryptedBackupText,
  encryptedBackupAad,
  encryptBackupJSONWithKdf,
  exportEncryptedBackupText,
  parseEncryptedBackupEnvelopeText,
} from '../src/lib/encrypted-backup';

const GENERIC_DECRYPT_ERROR = /contraseña puede ser incorrecta o el archivo puede estar dañado/i;
const INVALID_CRYPTO_METADATA_ERROR = /metadatos criptográficos de la copia no son compatibles/i;
const INVALID_JSON_ENVELOPE_ERROR = /sobre JSON válido/i;
const VALID_PASSWORD = 'post-audit-encrypted-passphrase';

function envelopeShell(iterations: unknown): Record<string, unknown> {
  return {
    format: 'GlitchBudget encrypted backup',
    version: 1,
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations,
    },
    cipher: {
      name: 'AES-GCM',
      keyLength: 256,
      tagLength: 128,
    },
    salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
    nonce: 'AAAAAAAAAAAAAAAA',
    ciphertext: 'AAAAAAAAAAAAAAAAAAAAAA==',
  };
}

function sourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    if (statSync(path).isDirectory()) files.push(...sourceFiles(path));
    else if (/\.(?:ts|tsx)$/.test(name)) files.push(path);
  }
  return files;
}

async function assertRejectedBeforeDeriveKey(text: string, expected: RegExp): Promise<void> {
  const subtle = crypto.subtle;
  const previous = Object.getOwnPropertyDescriptor(subtle, 'deriveKey');
  let deriveKeyCalls = 0;

  Object.defineProperty(subtle, 'deriveKey', {
    configurable: true,
    writable: true,
    value: async () => {
      deriveKeyCalls += 1;
      throw new Error('deriveKey must not run for rejected metadata');
    },
  });

  try {
    await assert.rejects(decryptEncryptedBackupText(text, VALID_PASSWORD), expected);
    assert.equal(deriveKeyCalls, 0);
  } finally {
    if (previous) Object.defineProperty(subtle, 'deriveKey', previous);
    else delete (subtle as unknown as { deriveKey?: unknown }).deriveKey;
  }
}

test('post-audit encrypted backup keeps production export on v1 PBKDF2 310k', async () => {
  assert.equal(ENCRYPTED_BACKUP_MIN_KDF_ITERATIONS, 310_000);
  assert.equal(ENCRYPTED_BACKUP_MAX_KDF_ITERATIONS, 750_000);
  assert.equal(ENCRYPTED_BACKUP_KDF.iterations, 310_000);

  const text = await exportEncryptedBackupText('{"scope":"production-default"}', VALID_PASSWORD);
  const envelope = JSON.parse(text);
  assert.equal(envelope.version, 1);
  assert.equal(envelope.kdf.iterations, 310_000);
});

test('post-audit encrypted backup accepts both inclusive KDF iteration boundaries during parsing', () => {
  const minimum = parseEncryptedBackupEnvelopeText(
    JSON.stringify(envelopeShell(ENCRYPTED_BACKUP_MIN_KDF_ITERATIONS)),
  );
  const maximum = parseEncryptedBackupEnvelopeText(
    JSON.stringify(envelopeShell(ENCRYPTED_BACKUP_MAX_KDF_ITERATIONS)),
  );

  assert.equal(minimum.kdf.iterations, 310_000);
  assert.equal(maximum.kdf.iterations, 750_000);
});

test('post-audit encrypted backup decrypts a v1 310k fixture produced before metadata evolution', async () => {
  const fixture = readFileSync(
    new URL('./fixtures/encrypted-backup-v1-310k-pre-evolution.json', import.meta.url),
    'utf8',
  );

  assert.equal(
    await decryptEncryptedBackupText(fixture, 'legacy-v1-fixture-passphrase'),
    '{"fixture":"encrypted-backup-v1-pre-evolution","value":310000}',
  );
});

test('post-audit encrypted backup reconstructs AAD field-by-field in the historical byte order', () => {
  const kdf = {
    name: 'PBKDF2',
    hash: 'SHA-256',
    iterations: 400_000,
    ignored: 'must-not-enter-aad',
  } as const;
  const cipher = {
    name: 'AES-GCM',
    keyLength: 256,
    tagLength: 128,
    ignored: 'must-not-enter-aad',
  } as const;

  const actual = new TextDecoder().decode(encryptedBackupAad(kdf, cipher));
  const expected = JSON.stringify({
    format: 'GlitchBudget encrypted backup',
    version: 1,
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 400_000,
    },
    cipher: {
      name: 'AES-GCM',
      keyLength: 256,
      tagLength: 128,
    },
  });

  assert.equal(actual, expected);
});

test('post-audit encrypted backup rejects hostile iteration metadata before deriveKey', async () => {
  const invalidMetadata = [
    JSON.stringify(envelopeShell(ENCRYPTED_BACKUP_MIN_KDF_ITERATIONS - 1)),
    JSON.stringify(envelopeShell(ENCRYPTED_BACKUP_MAX_KDF_ITERATIONS + 1)),
    JSON.stringify(envelopeShell(310_000.5)),
    JSON.stringify(envelopeShell('310000')),
    JSON.stringify(envelopeShell(-1)),
    JSON.stringify(envelopeShell(Number.MAX_SAFE_INTEGER + 1)),
    JSON.stringify({
      ...envelopeShell(310_000),
      kdf: { name: 'PBKDF2', hash: 'SHA-256' },
    }),
    JSON.stringify(envelopeShell(310_000)).replace('"iterations":310000', '"iterations":1e309'),
  ];

  for (const text of invalidMetadata) {
    await assertRejectedBeforeDeriveKey(text, INVALID_CRYPTO_METADATA_ERROR);
  }

  const invalidJson = JSON.stringify(envelopeShell(310_000))
    .replace('"iterations":310000', '"iterations":NaN');
  await assertRejectedBeforeDeriveKey(invalidJson, INVALID_JSON_ENVELOPE_ERROR);
});

test('post-audit encrypted backup keeps KDF/hash names closed before deriveKey', async () => {
  const wrongKdf = envelopeShell(400_000);
  wrongKdf.kdf = { name: 'scrypt', hash: 'SHA-256', iterations: 400_000 };
  await assertRejectedBeforeDeriveKey(JSON.stringify(wrongKdf), INVALID_CRYPTO_METADATA_ERROR);

  const wrongHash = envelopeShell(400_000);
  wrongHash.kdf = { name: 'PBKDF2', hash: 'SHA-512', iterations: 400_000 };
  await assertRejectedBeforeDeriveKey(JSON.stringify(wrongHash), INVALID_CRYPTO_METADATA_ERROR);
});

test('post-audit encrypted backup can import an accepted v1 envelope with 400k iterations', async () => {
  const payload = '{"scope":"accepted-future-v1","iterations":400000}';
  const envelope = await encryptBackupJSONWithKdf(payload, VALID_PASSWORD, {
    name: 'PBKDF2',
    hash: 'SHA-256',
    iterations: 400_000,
  });

  assert.equal(envelope.kdf.iterations, 400_000);
  assert.equal(await decryptEncryptedBackupText(JSON.stringify(envelope), VALID_PASSWORD), payload);
});

test('post-audit encrypted backup authenticates accepted iteration metadata', async () => {
  const encrypted = await exportEncryptedBackupText('{"scope":"aad-tamper"}', VALID_PASSWORD);
  const envelope = JSON.parse(encrypted);
  envelope.kdf.iterations = 400_000;

  await assert.rejects(
    decryptEncryptedBackupText(JSON.stringify(envelope), VALID_PASSWORD),
    GENERIC_DECRYPT_ERROR,
  );
});

test('post-audit encrypted backup ignores extra KDF fields when rebuilding AAD', async () => {
  const payload = '{"scope":"extra-kdf-field"}';
  const encrypted = await exportEncryptedBackupText(payload, VALID_PASSWORD);
  const envelope = JSON.parse(encrypted);
  envelope.kdf.untrustedExtraField = 'ignored';

  assert.equal(
    await decryptEncryptedBackupText(JSON.stringify(envelope), VALID_PASSWORD),
    payload,
  );
});

test('post-audit internal KDF override helper is not consumed by product source files', () => {
  const srcRoot = fileURLToPath(new URL('../src/', import.meta.url));
  const forbidden = sourceFiles(srcRoot)
    .filter(path => !path.endsWith(join('lib', 'encrypted-backup.ts')))
    .filter(path => readFileSync(path, 'utf8').includes('encryptBackupJSONWithKdf'));

  assert.deepEqual(forbidden, []);
});

test('post-audit encrypted backup keeps cipher metadata fixed', () => {
  assert.deepEqual(ENCRYPTED_BACKUP_CIPHER, {
    name: 'AES-GCM',
    keyLength: 256,
    tagLength: 128,
  });
});

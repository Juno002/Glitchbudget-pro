import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  ENCRYPTED_BACKUP_FORMAT,
  ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH,
  ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH,
  ENCRYPTED_BACKUP_VERSION,
  LOCAL_SECURITY_CONTRACT,
} from '../src/domain/local-security';
import {
  ENCRYPTED_BACKUP_CIPHER,
  ENCRYPTED_BACKUP_KDF,
  encryptedBackupAad,
  encryptBackupJSON,
  exportEncryptedBackupText,
  isValidEncryptedBackupPassword,
  type EncryptedBackupEnvelopeV1,
} from '../src/lib/encrypted-backup';

const fromBase64 = (value: string) => Uint8Array.from(Buffer.from(value, 'base64'));

async function decryptForTest(envelope: EncryptedBackupEnvelopeV1, password: string): Promise<string> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: envelope.kdf.hash,
      salt: fromBase64(envelope.salt),
      iterations: envelope.kdf.iterations,
    },
    passwordKey,
    { name: 'AES-GCM', length: envelope.cipher.keyLength },
    false,
    ['decrypt'],
  );
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: fromBase64(envelope.nonce),
      tagLength: envelope.cipher.tagLength,
      additionalData: encryptedBackupAad(),
    },
    key,
    fromBase64(envelope.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

test('17.4 freezes a versioned authenticated encrypted-backup envelope', () => {
  const contract = LOCAL_SECURITY_CONTRACT.encryptedBackup;
  assert.equal(contract.status, 'implemented-17.5');
  assert.equal(contract.format, ENCRYPTED_BACKUP_FORMAT);
  assert.equal(contract.version, ENCRYPTED_BACKUP_VERSION);
  assert.equal(contract.kdf, 'PBKDF2-SHA-256');
  assert.equal(contract.cipher, 'AES-256-GCM');
  assert.equal(contract.crypto, 'web-crypto-authenticated');
  assert.equal(contract.optional, true);
  assert.equal(contract.normalJsonRemainsAvailable, true);
  assert.equal(contract.passwordStoredRemotely, false);
  assert.equal(contract.passwordTransmitted, false);
  assert.equal(contract.restoreStatus, 'implemented-17.5');
});

test('17.4 validates password length without trimming or persisting it', () => {
  assert.equal(ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH, 8);
  assert.equal(ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH, 128);
  assert.equal(isValidEncryptedBackupPassword('1234567'), false);
  assert.equal(isValidEncryptedBackupPassword('12345678'), true);
  assert.equal(isValidEncryptedBackupPassword('        '), true);
  assert.equal(isValidEncryptedBackupPassword('x'.repeat(129)), false);
});

test('17.4 encrypts the canonical JSON payload with random salt and nonce and no plaintext leak', async () => {
  const plaintext = JSON.stringify({ v: 12, exportedAt: '2026-09-29T00:00:00.000Z', secret: 'private-value' });
  const password = 'correct horse battery staple';

  const first = await encryptBackupJSON(plaintext, password);
  const second = await encryptBackupJSON(plaintext, password);

  assert.equal(first.format, 'GlitchBudget encrypted backup');
  assert.equal(first.version, 1);
  assert.deepEqual(first.kdf, ENCRYPTED_BACKUP_KDF);
  assert.deepEqual(first.cipher, ENCRYPTED_BACKUP_CIPHER);
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.nonce, second.nonce);
  assert.notEqual(first.ciphertext, second.ciphertext);
  assert.equal(JSON.stringify(first).includes('private-value'), false);
  assert.equal(JSON.stringify(first).includes(password), false);

  assert.equal(await decryptForTest(first, password), plaintext);
});

test('17.4 authentication fails if ciphertext is modified', async () => {
  const envelope = await encryptBackupJSON('{"v":12,"secret":"tamper-check"}', 'backup-password');
  const bytes = fromBase64(envelope.ciphertext);
  bytes[0] ^= 1;
  const tampered: EncryptedBackupEnvelopeV1 = {
    ...envelope,
    ciphertext: Buffer.from(bytes).toString('base64'),
  };
  await assert.rejects(decryptForTest(tampered, 'backup-password'));
});

test('17.4 encrypted envelope remains separate from the normal JSON contract', async () => {
  const text = await exportEncryptedBackupText('{"v":12}', 'backup-password');
  const parsed = JSON.parse(text);
  for (const key of ['format', 'version', 'kdf', 'salt', 'nonce', 'ciphertext']) {
    assert.ok(key in parsed, key);
  }
  assert.equal(parsed.format, 'GlitchBudget encrypted backup');
  assert.equal(parsed.version, 1);

  const normalBackup = readFileSync(new URL('../src/lib/backup-json.ts', import.meta.url), 'utf8');
  assert.match(normalBackup, /CURRENT_BACKUP_FORMAT_VERSION = 13/);
  assert.doesNotMatch(normalBackup, /AES-GCM|ciphertext|ENCRYPTED_BACKUP_FORMAT/);
});

test('17.4 export remains available after 17.5 layers encrypted restore separately', () => {
  const dialog = readFileSync(new URL('../src/components/backup/opfs-backup-dialog.tsx', import.meta.url), 'utf8');
  const encryptedUi = readFileSync(new URL('../src/components/backup/encrypted-backup-export.tsx', import.meta.url), 'utf8');

  assert.match(dialog, /Exportar a JSON/);
  assert.match(dialog, /EncryptedBackupExport/);
  assert.match(encryptedUi, /Exportar cifrado/);
  assert.match(encryptedUi, /Crear copia cifrada/);
  assert.match(encryptedUi, /\.gbenc/);
  assert.match(encryptedUi, /La contraseña no se envía ni se guarda/);
  assert.match(encryptedUi, /restauración cifrada está disponible/i);
  assert.match(dialog, /EncryptedBackupRestore/);
});

test('17.4 crypto implementation is Web Crypto only and has no network or credential storage', () => {
  const cryptoSource = readFileSync(new URL('../src/lib/encrypted-backup.ts', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/components/backup/encrypted-backup-export.tsx', import.meta.url), 'utf8');

  assert.match(cryptoSource, /crypto\.subtle\.deriveKey/);
  assert.match(cryptoSource, /crypto\.subtle\.encrypt/);
  assert.match(cryptoSource, /crypto\.getRandomValues/);
  assert.doesNotMatch(cryptoSource, /fetch\s*\(|axios|XMLHttpRequest|WebSocket|EventSource|sendBeacon|https?:\/\//i);
  assert.doesNotMatch(cryptoSource, /localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(ui, /localStorage|sessionStorage/);
});

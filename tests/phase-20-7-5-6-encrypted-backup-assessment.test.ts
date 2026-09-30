import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH,
  ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH,
  ENCRYPTED_BACKUP_VERSION,
} from '../src/domain/local-security';
import {
  ENCRYPTED_BACKUP_CIPHER,
  ENCRYPTED_BACKUP_KDF,
  decryptEncryptedBackupText,
  exportEncryptedBackupText,
} from '../src/lib/encrypted-backup';

test('20.7.5.6 keeps envelope v1 stable until a representative mobile benchmark justifies v2', () => {
  assert.equal(ENCRYPTED_BACKUP_VERSION, 1);
  assert.equal(ENCRYPTED_BACKUP_KDF.name, 'PBKDF2');
  assert.equal(ENCRYPTED_BACKUP_KDF.hash, 'SHA-256');
  assert.equal(ENCRYPTED_BACKUP_KDF.iterations, 310_000);
  assert.equal(ENCRYPTED_BACKUP_CIPHER.name, 'AES-GCM');
  assert.equal(ENCRYPTED_BACKUP_CIPHER.keyLength, 256);
  assert.equal(ENCRYPTED_BACKUP_CIPHER.tagLength, 128);
  assert.equal(ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH, 8);
  assert.equal(ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH, 128);
});

test('20.7.5.6 preserves v1 encrypted export/import round-trip', async () => {
  const payload = JSON.stringify({ v: 13, marker: 'phase-20-7-5-6' });
  const password = 'assessment-passphrase';
  const encrypted = await exportEncryptedBackupText(payload, password);
  const envelope = JSON.parse(encrypted);

  assert.equal(envelope.version, 1);
  assert.equal(await decryptEncryptedBackupText(encrypted, password), payload);
});

test('20.7.5.6 keeps wrong-password and tamper failures on the same user-facing boundary', async () => {
  const encrypted = await exportEncryptedBackupText('{"v":13}', 'correct-assessment-passphrase');
  const expected = /contraseña puede ser incorrecta o el archivo puede estar dañado/i;

  await assert.rejects(
    decryptEncryptedBackupText(encrypted, 'wrong-assessment-passphrase'),
    expected,
  );

  const envelope = JSON.parse(encrypted);
  const bytes = Buffer.from(envelope.ciphertext, 'base64');
  bytes[0] ^= 1;
  envelope.ciphertext = bytes.toString('base64');
  await assert.rejects(
    decryptEncryptedBackupText(JSON.stringify(envelope), 'correct-assessment-passphrase'),
    expected,
  );
});

test('20.7.5.6 assessment records a reproducible benchmark and explicitly declines an unbenchmarked v2', () => {
  const assessment = readFileSync(new URL('../docs/roadmap/phase-20-7-5-6.md', import.meta.url), 'utf8');
  const benchmark = readFileSync(new URL('../scripts/benchmark-encrypted-backup.mjs', import.meta.url), 'utf8');

  assert.match(assessment, /Do not introduce envelope v2/i);
  assert.match(assessment, /representative physical-mobile benchmark/i);
  assert.match(assessment, /600,000/);
  assert.match(assessment, /<= 750 ms/);
  assert.match(benchmark, /310_000/);
  assert.match(benchmark, /600_000/);
  assert.doesNotMatch(benchmark, /fetch\s*\(|https?:\/\//i);
});

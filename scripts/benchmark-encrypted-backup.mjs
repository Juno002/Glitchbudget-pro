import { performance } from 'node:perf_hooks';
import { webcrypto } from 'node:crypto';

const crypto = globalThis.crypto ?? webcrypto;
const encoder = new TextEncoder();
const passwordKey = await crypto.subtle.importKey(
  'raw',
  encoder.encode('benchmark-only-passphrase'),
  'PBKDF2',
  false,
  ['deriveKey'],
);
const salt = crypto.getRandomValues(new Uint8Array(16));

async function sample(iterations) {
  const started = performance.now();
  await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  return performance.now() - started;
}

for (const iterations of [310_000, 600_000]) {
  const samples = [];
  for (let index = 0; index < 5; index += 1) samples.push(await sample(iterations));
  samples.sort((a, b) => a - b);
  console.log(JSON.stringify({
    iterations,
    samplesMs: samples.map(value => Number(value.toFixed(1))),
    medianMs: Number(samples[Math.floor(samples.length / 2)].toFixed(1)),
  }));
}

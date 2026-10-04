import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export const captureFixture = JSON.parse(readFileSync(new URL('../tests/fixtures/final-ui-polish-p0-capture.json', import.meta.url), 'utf8'));

// CDP installs this only in the isolated smoke browser, before any app code runs.
export function fixedClockSource(instant = captureFixture.instant) {
  const milliseconds = Date.parse(instant);
  assert.ok(Number.isFinite(milliseconds), 'Fecha fija de captura válida');
  return `(() => {
    const NativeDate = Date;
    globalThis.Date = new Proxy(NativeDate, {
      construct(target, args) { return Reflect.construct(target, args.length ? args : [${milliseconds}]); },
      apply() { return new NativeDate(${milliseconds}).toString(); },
      get(target, key) { return key === 'now' ? () => ${milliseconds} : Reflect.get(target, key); },
    });
  })()`;
}

export function assertCaptureDataset(actual) {
  assert.deepEqual(actual, captureFixture.dataset, 'La captura requiere exactamente el dataset financiero P0 fijo');
}

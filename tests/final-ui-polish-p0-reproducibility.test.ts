import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { captureFixture, fixedClockSource, assertCaptureDataset } from '../scripts/final-ui-polish-p0-fixture.mjs';

test('P0 capture clock ignores host day and preserves explicit financial-date construction', () => {
  for (const hostInstant of ['2027-01-01T03:00:00Z', '2031-08-23T23:59:59Z']) {
    class HostDate extends Date {
      constructor(value?: string | number) { super(value ?? hostInstant); }
      static now() { return Date.parse(hostInstant); }
    }
    const context = vm.createContext({ Date: HostDate });
    vm.runInContext(fixedClockSource(), context);
    assert.equal(vm.runInContext('new Date().toISOString()', context), captureFixture.instant);
    assert.equal(vm.runInContext('Date.now()', context), Date.parse(captureFixture.instant));
    assert.equal(vm.runInContext('new Date("2026-09-01T12:00:00Z").toISOString()', context), '2026-09-01T12:00:00.000Z');
    assert.equal(vm.runInContext('new Date(0).getTime()', context), 0);
    assert.equal(vm.runInContext('Date.parse("2026-09-01T00:00:00Z")', context), Date.parse('2026-09-01T00:00:00Z'));
    assert.equal(vm.runInContext('new Date() instanceof Date', context), true);
  }
});

test('P0 refuses capture when financial date, category, amount or row count differs', () => {
  assert.doesNotThrow(() => assertCaptureDataset(structuredClone(captureFixture.dataset)));
  for (const mutate of [
    (data: typeof captureFixture.dataset) => { data.expenses[0].date = '2026-10-05'; },
    (data: typeof captureFixture.dataset) => { data.expenses[0].categoryId = 'otros'; },
    (data: typeof captureFixture.dataset) => { data.expenses[0].amount += 1; },
    (data: typeof captureFixture.dataset) => { data.incomes.pop(); },
    (data: typeof captureFixture.dataset) => { data.expenses.push({ ...data.expenses[0] }); },
  ]) {
    const data = structuredClone(captureFixture.dataset);
    mutate(data);
    assert.throws(() => assertCaptureDataset(data));
  }
});

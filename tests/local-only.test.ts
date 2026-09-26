import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
// @ts-ignore Node tooling module intentionally uses JavaScript.
import { auditSource, auditProject } from '../scripts/check-local-only.mjs';

test('local-only guard rejects common network APIs and server actions', () => {
  for (const code of ["fetch('/api/upload', {method:'POST'})", "navigator.sendBeacon('/upload', data)", "new WebSocket(url)", "new XMLHttpRequest()", "new EventSource(url)", "window['fetch'](url)", "'use server';", "const url = 'https://example.com'", "@import 'https://example.com/style.css'"]) {
    assert.ok(auditSource(code, 'sample.ts').length, code);
  }
  assert.deepEqual(auditSource("const amount = 100; localStorage.setItem('a', String(amount));", 'sample.ts'), []);
  assert.deepEqual(auditSource("self.addEventListener('fetch', handler);", 'sw.js'), []);
  assert.ok(auditSource("self.addEventListener('fetch', () => fetch(url));", 'sw.js').length);
  assert.deepEqual(auditProject(), []);
});

test('production worker never forwards operations, queries or unknown requests to network', async () => {
  const handlers: Record<string, Function> = {};
  const cached: string[] = [];
  const context = { URL, Response, importScripts() {}, self: { __PRECACHE: { build: 'test', urls: ['/index.html', '/transactions/index.html', '/404.html', '/_next/app.js'] }, location: { origin: 'https://local.test' }, addEventListener: (name: string, fn: Function) => handlers[name] = fn }, caches: { open: async () => ({ match: async (key: string) => { cached.push(key); return new Response('cached'); } }) } };
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), context);
  async function request(url: string, method = 'GET', mode = 'cors') {
    let response: Promise<Response> | undefined;
    handlers.fetch({ request: { url, method, mode }, respondWith: (value: Promise<Response>) => response = value });
    assert.ok(response, 'every request must be intercepted');
    return await response;
  }
  assert.equal((await request('https://external.test/leak')).type, 'error');
  assert.equal((await request('https://local.test/api/upload', 'POST')).type, 'error');
  assert.equal((await request('https://local.test/unknown?amount=123')).type, 'error');
  assert.equal(await (await request('https://local.test/?amount=123', 'GET', 'navigate')).text(), 'cached');
  await request('https://local.test/transactions/', 'GET', 'navigate');
  await request('https://local.test/_next/app.js?x=123');
  assert.deepEqual(cached, ['/index.html', '/transactions/index.html', '/_next/app.js']);
});

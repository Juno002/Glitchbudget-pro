import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
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

// @ts-ignore Node tooling module intentionally uses JavaScript.
import { checkConnectPolicy, checkStaticOutput } from '../scripts/check-static-output.mjs';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('production policy prohibits connections and diagnostic importer stays removed', () => {
  assert.equal(existsSync('src/app/diag/restore'), false);
  const layout = readFileSync('src/app/layout.tsx', 'utf8');
  const policy = layout.match(/httpEquiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
  assert.ok(policy);
  assert.equal(checkConnectPolicy(policy), true);
  for (const weakened of ["default-src 'self'", "connect-src 'self'", "connect-src 'none' https://example.com", "connect-src *", "connect-src 'none'; connect-src 'self'"]) assert.equal(checkConnectPolicy(weakened), false);
});

test('mobile area changes stay in the app without a router fetch forbidden by the CSP', () => {
  const bottom = readFileSync('src/components/layout/bottom-nav.tsx', 'utf8');
  assert.doesNotMatch(bottom, /next\/link|<Link|href=/);
  assert.match(bottom, /<button/);
  assert.match(bottom, /onClick=\{\(\) => setActiveTab\(item.value\)\}/);
  const header = readFileSync('src/components/layout/header.tsx', 'utf8');
  assert.doesNotMatch(header, /next\/link/);
  assert.match(header, /<a href="\/"/);
});

test('export guard rejects restored diagnostic route and weakened HTML policy', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'glitch-static-test-'));
  try {
    writeFileSync(path.join(root, 'index.html'), `<meta http-equiv="Content-Security-Policy" content="connect-src &#x27;none&#x27;"/>`);
    writeFileSync(path.join(root, 'precache-manifest.js'), 'self.__PRECACHE = {urls: []}');
    assert.deepEqual(checkStaticOutput(root), []);
    mkdirSync(path.join(root, 'diag'));
    assert.ok(checkStaticOutput(root).some((error: string) => error.includes('Diagnostic')));
    writeFileSync(path.join(root, 'index.html'), `<meta http-equiv="Content-Security-Policy" content="connect-src 'self'"/>`);
    assert.ok(checkStaticOutput(root).some((error: string) => error.includes('connect-src')));
  } finally { rmSync(root, {recursive: true, force: true}); } // Only this newly created test directory.
});

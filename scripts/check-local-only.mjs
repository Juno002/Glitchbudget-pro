import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const networkNames = new Set(['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon', 'WebTransport', 'RTCPeerConnection', 'importScripts']);
export function auditSource(text, filename) {
  const errors = [];
  const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, filename.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node) {
    if (ts.isIdentifier(node) && networkNames.has(node.text)) errors.push(`Network primitive: ${node.text}`);
    if (ts.isStringLiteralLike(node)) {
      const value = node.text;
      const parent = node.parent;
      const isEventName = ts.isCallExpression(parent) && parent.arguments[0] === node && ts.isPropertyAccessExpression(parent.expression) && parent.expression.name.text === 'addEventListener';
      if (networkNames.has(value) && !isEventName) errors.push(`Computed network primitive: ${value}`);
      if (/^(?:https?:|wss?:|\/\/)/i.test(value) && !['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink'].includes(value)) errors.push('Remote URL');
      if (value === 'use server' || /^\/api(?:\/|$)/.test(value)) errors.push('Server endpoint');
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (/(?:@import|url\()\s*['"]?\s*(?:https?:|\/\/)/i.test(text)) errors.push('Remote stylesheet resource');
  return errors;
}
function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]); }
export function auditProject() {
  const errors = [];
  for (const file of files('src')) {
    if (/(?:^|[\\/])(?:route\.[jt]sx?|middleware\.[jt]s)$/.test(file)) errors.push(`${file}: server route`);
    if (/\.(?:[jt]sx?|css|json)$/.test(file)) errors.push(...auditSource(readFileSync(file, 'utf8'), file).map(error => `${file}: ${error}`));
  }
  for (const file of files('public')) {
    if (file.endsWith('precache-manifest.js') || file.endsWith('sw.js')) continue;
    if (/\.(?:js|html|css|json)$/.test(file)) errors.push(...auditSource(readFileSync(file, 'utf8'), file).map(error => `${file}: ${error}`));
  }
  errors.push(...auditSource(readFileSync('public/sw.js', 'utf8').replace("importScripts('/precache-manifest.js');", ''), 'sw.js').map(error => `public/sw.js: ${error}`));
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  for (const name of Object.keys(pkg.dependencies || {})) if (/firebase|genkit|gemini|openai|anthropic|analytics|posthog|sentry|segment|supabase|axios/i.test(name)) errors.push(`Remote SDK: ${name}`);
  if (!/output:\s*['"]export['"]/.test(readFileSync('next.config.ts', 'utf8'))) errors.push('Static export required');
  return errors;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = auditProject();
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Local-only source guard passed. Service worker transport is covered by dedicated tests.');
}

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkConnectPolicy(policy) {
  const directives = policy.split(';').map(value => value.trim().split(/\s+/)).filter(parts => parts[0] === 'connect-src');
  return directives.length === 1 && directives[0].length === 2 && directives[0][1] === "'none'";
}
export function checkStaticOutput(root = 'out') {
  const errors = [];
  if (existsSync(path.join(root, 'diag'))) errors.push('Diagnostic routes must not be exported');
  function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]); }
  const html = walk(root).filter(file => file.endsWith('.html'));
  if (!html.length) errors.push('No exported HTML');
  for (const file of html) {
    const text = readFileSync(file, 'utf8');
    const meta = text.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"\s*\/?\s*>/i);
    const policy = meta?.[1].replaceAll('&#x27;', "'").replaceAll('&#39;', "'");
    if (!policy || !checkConnectPolicy(policy)) errors.push(`${file}: connect-src must be exclusively 'none'`);
  }
  if (readFileSync(path.join(root, 'precache-manifest.js'), 'utf8').includes('/diag/')) errors.push('Diagnostic route in precache');
  return errors;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkStaticOutput();
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log("Static output verified: no diagnostic importer; connect-src 'none' in every HTML page.");
}

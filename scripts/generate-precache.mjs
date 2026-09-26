import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? files(filename) : [filename];
  }))).flat();
}
const assets = (await files('out')).filter(file => !/\.(?:map)$/.test(file) && !['sw.js', 'precache-manifest.js'].includes(path.basename(file))).sort();
const hash = createHash('sha256');
for (const file of assets) { hash.update(file); hash.update(await readFile(file)); }
hash.update(await readFile('public/sw.js'));
const urls = assets.map(file => '/' + path.relative('out', file).split(path.sep).join('/'));
const manifest = { build: hash.digest('hex').slice(0, 20), urls };
await writeFile('out/precache-manifest.js', `self.__PRECACHE = ${JSON.stringify(manifest)};\n`);
console.log(`Static offline manifest: ${urls.length} resources in out/.`);

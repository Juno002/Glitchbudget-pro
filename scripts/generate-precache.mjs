import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? files(filename) : [filename];
  }));
  return nested.flat();
}
const build = (await readFile('.next/BUILD_ID', 'utf8')).trim();
const staticFiles = (await files('.next/static')).filter(file => !file.endsWith('.map'));
const urls = ['/', '/transactions', '/manifest.json', '/icon-192.png', '/icon-512.png', '/logo.svg',
  ...staticFiles.map(file => '/' + file.replaceAll('\\', '/').replace('.next/', '_next/'))];
await writeFile('public/precache-manifest.js', `self.__PRECACHE = ${JSON.stringify({ build, urls })};\n`);
console.log(`Offline manifest: ${urls.length} resources.`);

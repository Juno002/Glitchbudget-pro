export async function hasOPFS(): Promise<boolean> {
  // @ts-ignore
  return typeof navigator !== 'undefined' && !!(navigator.storage && 'getDirectory' in navigator.storage);
}

export async function opfsWrite(name: string, text: string) {
  if (!(await hasOPFS())) throw new Error('OPFS no disponible');
  // @ts-ignore (types aún verdes en TS)
  const root = await navigator.storage.getDirectory();
  const fh = await root.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(text);
  await w.close();
}

export async function opfsRead(name: string): Promise<string> {
  if (!(await hasOPFS())) throw new Error('OPFS no disponible');
  // @ts-ignore
  const root = await navigator.storage.getDirectory();
  const fh = await root.getFileHandle(name);
  const f = await fh.getFile();
  return await f.text();
}

export async function opfsList(): Promise<{ name: string; lastModified: number }[]> {
    if (!(await hasOPFS())) return [];
    // @ts-ignore
    const root = await navigator.storage.getDirectory();
    const files = [];
    for await (const [name, handle] of root.entries()) {
        if (handle.kind === 'file') {
            const file = await handle.getFile();
            files.push({ name, lastModified: file.lastModified });
        }
    }
    return files.sort((a,b) => b.lastModified - a.lastModified);
}

export async function opfsDelete(name: string) {
    if (!(await hasOPFS())) throw new Error('OPFS no disponible');
    // @ts-ignore
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(name);
}

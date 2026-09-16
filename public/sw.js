importScripts('/precache-manifest.js');
const CACHE = `glitchbudget-${self.__PRECACHE.build}`;

self.addEventListener('install', event => {
  // Finish all resources before the new worker is eligible to replace the previous version.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(self.__PRECACHE.urls)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('glitchbudget-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try { return await fetch(request); }
      catch {
        const cache = await caches.open(CACHE);
        return await cache.match(url.pathname) || await cache.match('/') || Response.error();
      }
    })());
  } else if (self.__PRECACHE.urls.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return await cache.match(url.pathname) || fetch(request);
    })());
  }
});

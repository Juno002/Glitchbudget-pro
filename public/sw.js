importScripts('/precache-manifest.js');
const CACHE = `glitchbudget-${self.__PRECACHE.build}`;

self.addEventListener('install', event => {
  // Install the complete static release before replacing the previous worker.
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
  // A controlled app can only read its known static resources, never send data.
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    event.respondWith(Promise.resolve(Response.error()));
    return;
  }
  let resource = url.pathname;
  if (request.mode === 'navigate') {
    resource = resource.endsWith('/') ? `${resource}index.html` : `${resource}/index.html`;
    if (!self.__PRECACHE.urls.includes(resource)) resource = '/404.html';
  }
  event.respondWith((async () => {
    if (!self.__PRECACHE.urls.includes(resource)) return Response.error();
    const cache = await caches.open(CACHE);
    return await cache.match(resource) || Response.error();
  })());
});

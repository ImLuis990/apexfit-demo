// Service Worker mínimo para habilitar instalación PWA (criterio de PWA instalable)
const CACHE_NAME = 'apexfit-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Peticiones de red directas con fallback normal
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

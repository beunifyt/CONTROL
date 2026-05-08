/**
 * Service Worker — UnifyT
 * Estrategia: cache-first para shell, network-first para datos.
 */

const CACHE_VERSION = 'unifyt-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './core/app.js',
  './shared/styles/tokens.css',
  './shared/styles/themes.css',
  './shared/styles/base.css',
  './shared/styles/components.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Firestore / Auth / Cloudinary: directamente a red
  if (url.hostname.includes('firestore') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('cloudinary')) {
    return;
  }

  // Cache-first para mismo origen
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(e.request, clone));
          }
          return res;
        }).catch(() => cached)
      )
    );
  }
});

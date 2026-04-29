const CACHE = 'mindmap-ops-v4';

// On install: cache everything
self.addEventListener('install', e => {
  self.skipWaiting(); // activate immediately, don't wait
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      '/mindmap-pwa/manifest.json',
    ]).catch(() => {}))
  );
});

// On activate: delete old caches immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()) // take control of all tabs immediately
  );
});

// Fetch strategy:
// - index.html  → network-first (always get latest when online, fallback to cache)
// - everything else → cache-first (fonts, CDN assets)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isHTML = url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isHTML) {
    // Network-first: updates land immediately without any manual cache clear
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first for assets
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => cached);
      })
    );
  }
});

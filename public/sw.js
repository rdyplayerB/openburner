/**
 * Service Worker for OpenBurner PWA
 *
 * Conservative caching — never touches dynamic data (NFC, RPC, API, gateway):
 *   - /_next/static/*  : cache-first (content-hashed, immutable)
 *   - /images, /icons  : stale-while-revalidate, only real image responses
 *   - CoinGecko icons  : cache-first, CORS responses only, capped entry count
 *   - HTML / navigations: never cached (always network)
 *
 * Cache names are versioned: bump SW_VERSION on release; the page also registers
 * /sw.js?v=<build> so each deployment gets fresh caches and old ones are pruned.
 */

const SW_VERSION = '1.4.0';
const BUILD = new URL(self.location.href).searchParams.get('v') || 'dev';
const PREFIX = 'openburner-';
const STATIC_CACHE = `${PREFIX}static-${SW_VERSION}-${BUILD}`;
const IMAGE_CACHE = `${PREFIX}images-${SW_VERSION}-${BUILD}`;
// Third-party token icons don't change between builds; keep them across versions.
const TOKEN_IMAGES_CACHE = `${PREFIX}token-images-v2`;
const TOKEN_IMAGES_MAX = 300;

const PRECACHE_URLS = ['/manifest.json', '/images/openburnerlogo.svg', '/openburnerlogo.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(IMAGE_CACHE)
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([STATIC_CACHE, IMAGE_CACHE, TOKEN_IMAGES_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function isImageResponse(response) {
  const type = response.headers.get('content-type') || '';
  return response.ok && (type.startsWith('image/') || type.includes('icon'));
}

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) {
    await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
  }
}

async function cacheFirst(request, cacheName, accept) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (accept(response)) cache.put(request, response.clone()).catch(() => {});
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      // Only store real images — never an HTML fallback/404 page for an asset URL.
      if (isImageResponse(response)) cache.put(request, response.clone()).catch(() => {});
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // CoinGecko token icons: cache-first, but only CORS-readable image responses
  // (opaque responses can't be validated and inflate storage quota).
  if (url.hostname === 'coin-images.coingecko.com' && url.pathname.includes('/coins/images/')) {
    event.respondWith(
      cacheFirst(request, TOKEN_IMAGES_CACHE, (res) => res.type !== 'opaque' && isImageResponse(res)).then((res) => {
        trimCache(TOKEN_IMAGES_CACHE, TOKEN_IMAGES_MAX).catch(() => {});
        return res;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  // Never cache navigations / HTML, API routes or anything dynamic.
  if (request.mode === 'navigate' || request.destination === 'document') return;
  if (url.pathname.startsWith('/api/')) return;

  // Content-hashed build assets: immutable.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE, (res) => {
        const type = res.headers.get('content-type') || '';
        return res.ok && !type.includes('text/html');
      })
    );
    return;
  }

  // App images/icons: serve fast, refresh in the background.
  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/openburnerlogo.ico'
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

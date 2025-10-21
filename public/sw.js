/**
 * Service Worker for OpenBurner PWA
 * Conservative caching strategy - only caches static assets
 * Never caches dynamic data (NFC responses, blockchain data, API calls)
 */

const CACHE_NAME = 'openburner-v2';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/images/openburnerlogo.svg',
  '/openburnerlogo.ico',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache for static assets, network for dynamic content
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests (except for our static assets)
  if (url.origin !== location.origin) {
    return;
  }
  
  // Skip API routes and dynamic content
  if (url.pathname.startsWith('/api/') || 
      url.pathname.includes('websocket') ||
      url.pathname.includes('gateway') ||
      url.search.includes('rpc') ||
      url.search.includes('coingecko')) {
    return;
  }
  
  // Handle static assets
  if (STATIC_CACHE_URLS.includes(url.pathname) || 
      url.pathname.startsWith('/_next/static/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.jpeg')) {
    
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving from cache:', url.pathname);
            return cachedResponse;
          }
          
          console.log('[SW] Fetching from network:', url.pathname);
          return fetch(request)
            .then((response) => {
              // Only cache successful responses
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            })
            .catch((error) => {
              console.error('[SW] Network fetch failed:', error);
              // Return a basic offline page for navigation requests
              if (request.mode === 'navigate') {
                return caches.match('/') || new Response('Offline', { status: 503 });
              }
              throw error;
            });
        })
    );
  }
});

// Handle offline detection
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    // Could implement retry logic for failed requests here
  }
});

console.log('[SW] Service worker script loaded');

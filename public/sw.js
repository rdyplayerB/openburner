/**
 * Service Worker for OpenBurner PWA
 * Conservative caching strategy - only caches static assets
 * Never caches dynamic data (NFC responses, blockchain data, API calls)
 */

const CACHE_NAME = 'openburner-static';
const TOKEN_IMAGES_CACHE = 'openburner-token-images';
// Only cache files that definitely exist and won't cause installation to fail
const STATIC_CACHE_URLS = [
  '/manifest.json',
  '/images/openburnerlogo.svg',
  '/openburnerlogo.ico',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Attempting to cache static assets...');
        // Cache files individually - don't let failures block installation
        return Promise.allSettled(
          STATIC_CACHE_URLS.map((url) =>
            cache.add(url)
              .then(() => console.log(`[SW] ✓ Cached: ${url}`))
              .catch((err) => console.warn(`[SW] ✗ Failed to cache ${url}:`, err.message))
          )
        );
      })
      .then((results) => {
        const successful = results.filter((r) => r.status === 'fulfilled').length;
        console.log(`[SW] Static cache: ${successful}/${STATIC_CACHE_URLS.length} assets cached`);
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache setup error:', error);
        // Still skip waiting even if cache fails - token caching is what matters
        return self.skipWaiting();
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
            // Keep current static cache and token images cache
            if (cacheName !== CACHE_NAME && cacheName !== TOKEN_IMAGES_CACHE) {
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
  
  // Handle CoinGecko token images (cache-first strategy)
  // Only cache images from coin-images.coingecko.com, NOT API calls from api.coingecko.com
  if (url.hostname === 'coin-images.coingecko.com' && 
      (url.pathname.includes('/coins/images/') || url.pathname.endsWith('.png') || 
       url.pathname.endsWith('.jpg') || url.pathname.endsWith('.jpeg') || 
       url.pathname.endsWith('.webp'))) {
    
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Token image served from cache:', url.pathname);
            return cachedResponse;
          }
          
          console.log('[SW] Token image fetching from network:', url.pathname);
          // Use no-cors mode to allow opaque responses from cross-origin images
          return fetch(request, { mode: 'no-cors' })
            .then((response) => {
              // For opaque responses (status 0), we can't check the status, but we can cache them
              // For same-origin or CORS responses, check status
              if (response.type === 'opaque' || (response.status >= 200 && response.status < 300)) {
                const responseClone = response.clone();
                
                caches.open(TOKEN_IMAGES_CACHE)
                  .then((cache) => {
                    return cache.put(request, responseClone);
                  })
                  .then(() => {
                    console.log('[SW] ✅ Cached token image:', url.pathname);
                  })
                  .catch((error) => {
                    console.error('[SW] Failed to cache token image:', url.pathname, error);
                  });
              }
              return response;
            })
            .catch((error) => {
              console.error('[SW] Token image fetch failed:', error);
              // Return a transparent 1x1 pixel as fallback
              return new Response(
                new Blob([''], { type: 'image/png' }),
                { status: 200, statusText: 'OK' }
              );
            });
        })
    );
    return; // Exit early for token images
  }
  
  // Skip cross-origin requests (except for token images handled above)
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

/* ==========================================================================
   AraLog – Service Worker (sw.js)
   Offline-first caching strategy
   CACHE_VERSION bei jedem Update hochzählen!
   ========================================================================== */

const CACHE_VERSION = 'aralog-v10';
const MAP_CACHE = 'aralog-map-tiles-v1';
const MAP_CACHE_LIMIT = 500; // max cached tiles

// App-Shell: alle Dateien die für Offline-Nutzung nötig sind
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/views.css',
  './css/map.css',
  './js/app.js',
  './js/db.js',
  './js/router.js',
  './js/views/observation-list.js',
  './js/views/observation-form.js',
  './js/views/observation-detail.js',
  './js/views/map-view.js',
  './js/views/species-list.js',
  './js/views/settings.js',
  './js/components/species-picker.js',
  './js/components/tag-input.js',
  './js/components/photo-upload.js',
  './js/services/photo-service.js',
  './js/data/enums.js',
  './js/data/species-catalog.js',
  './lib/dexie.min.js',
  './lib/leaflet/leaflet.js',
  './lib/leaflet/leaflet.css',
  './lib/leaflet.markercluster/leaflet.markercluster.js',
  './lib/leaflet.markercluster/MarkerCluster.css',
  './lib/leaflet.markercluster/MarkerCluster.Default.css',
  './lib/jszip.min.js',
];

// ── Install: Pre-cache app shell ──
self.addEventListener('install', (event) => {
  console.log('[SW] Install – caching app shell');
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: Clean up old caches ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate – cleaning old caches');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION && key !== MAP_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Route requests to appropriate strategy ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Map tiles: Network-first with cache fallback + opportunistic caching
  if (isMapTile(url)) {
    event.respondWith(networkFirstMapTile(event.request));
    return;
  }

  // App resources: Cache-first with network fallback
  event.respondWith(cacheFirst(event.request));
});

// ── Strategies ──

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Cache successful GET responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('./index.html');
    }
    throw err;
  }
}

async function networkFirstMapTile(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Opportunistically cache the tile
      const cache = await caches.open(MAP_CACHE);
      cache.put(request, response.clone());
      // Trim cache if needed (async, non-blocking)
      trimMapCache();
    }
    return response;
  } catch (err) {
    // Offline: serve from cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // No cached tile: return transparent 1x1 PNG
    return new Response(
      Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), c => c.charCodeAt(0)),
      { headers: { 'Content-Type': 'image/png' } }
    );
  }
}

// ── Helpers ──

function isMapTile(url) {
  return url.hostname.includes('tile.openstreetmap.org') ||
         url.hostname.includes('tile.opentopomap.org');
}

async function trimMapCache() {
  const cache = await caches.open(MAP_CACHE);
  const keys = await cache.keys();
  if (keys.length > MAP_CACHE_LIMIT) {
    // Delete oldest entries (FIFO)
    const toDelete = keys.slice(0, keys.length - MAP_CACHE_LIMIT);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

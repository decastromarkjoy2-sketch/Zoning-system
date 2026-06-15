const CACHE_VERSION = "v1";
const STATIC_CACHE = `zoning-static-${CACHE_VERSION}`;
const API_CACHE = `zoning-api-${CACHE_VERSION}`;
const MAP_TILES_CACHE = `zoning-map-tiles-${CACHE_VERSION}`;
const CDN_CACHE = `zoning-cdn-${CACHE_VERSION}`;

const API_TIMEOUT_MS = 5000;
const API_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const TILE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const TILE_MAX_ENTRIES = 1000;
const API_MAX_ENTRIES = 300;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(["/", "/manifest.webmanifest", "/favicon.svg"])
        .catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const current = new Set([STATIC_CACHE, API_CACHE, MAP_TILES_CACHE, CDN_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !current.has(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((k) => cache.delete(k)));
  }
}

function isExpired(response, maxAgeMs) {
  const date = response.headers.get("sw-cached-at");
  if (!date) return false;
  return Date.now() - Number(date) > maxAgeMs;
}

function addTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set("sw-cached-at", String(Date.now()));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function networkFirst(request, cacheName, maxAgeMs, maxEntries) {
  const cache = await caches.open(cacheName);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    const networkResponse = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (networkResponse.ok) {
      const stamped = addTimestamp(networkResponse.clone());
      cache.put(request, stamped);
      if (maxEntries) trimCache(cacheName, maxEntries);
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached && !isExpired(cached, maxAgeMs)) return cached;
    return new Response(JSON.stringify({ error: "Offline — no cached data available" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirst(request, cacheName, maxAgeMs, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached && !isExpired(cached, maxAgeMs)) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const stamped = addTimestamp(networkResponse.clone());
      cache.put(request, stamped);
      if (maxEntries) trimCache(cacheName, maxEntries);
    }
    return networkResponse;
  } catch {
    if (cached) return cached;
    throw new Error("Offline and no cache");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE, API_MAX_AGE_MS, API_MAX_ENTRIES));
    return;
  }

  if (
    url.hostname.match(/^[abc]\.tile\.openstreetmap\.org$/)
  ) {
    event.respondWith(cacheFirst(request, MAP_TILES_CACHE, TILE_MAX_AGE_MS, TILE_MAX_ENTRIES));
    return;
  }

  if (
    url.hostname === "cdnjs.cloudflare.com" ||
    url.hostname === "unpkg.com"
  ) {
    event.respondWith(cacheFirst(request, CDN_CACHE, TILE_MAX_AGE_MS, 50));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const indexFallback = await caches.match("/");
          return indexFallback || new Response("Offline", { status: 503 });
        }
      })
    );
  }
});

const CACHE_NAME = "intelmatrix-v2";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add("/")).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("intelmatrix-") && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}
async function cacheAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Never mix React Server Component payloads with cached HTML documents.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;
  if (url.pathname.startsWith("/_next/static/") && /[a-f0-9]{8,}[^/]*\.(?:js|css|woff2)$/.test(url.pathname)) {
    event.respondWith(cacheAsset(request));
    return;
  }
  if (request.mode === "navigate" || url.pathname === "/api/news") {
    event.respondWith(networkFirst(request));
  }
});

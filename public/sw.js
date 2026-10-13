const CACHE_NAME = "intelmatrix-v1";
const STATIC_CACHE_URLS = ["/", "/favicon.ico"];
const DB_NAME = "IntelMatrixDB";
const DB_STORE = "news_items";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_CACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function openIndexedDbStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DB_STORE)) {
        database.createObjectStore(DB_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readFromIndexedDb(url) {
  try {
    const db = await openIndexedDbStore();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const store = tx.objectStore(DB_STORE);
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error || new Error("IndexedDB read failed"));
    });
  } catch {
    console.warn("IndexedDB read failed for cache fallback:", error);
    return null;
  }
}

async function writeToIndexedDb(url, payload) {
  try {
    const db = await openIndexedDbStore();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      const store = tx.objectStore(DB_STORE);
      const request = store.put({ id: url, payload, cachedAt: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("IndexedDB write failed"));
    });
  } catch {
    console.warn("IndexedDB write failed:", error);
  }
}

async function networkFirstWithIndexedDb(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok && request.method === "GET") {
      const cloned = response.clone();
      const text = await cloned.text();
      try {
        const json = JSON.parse(text);
        await writeToIndexedDb(request.url, json);
      } catch {
        await writeToIndexedDb(request.url, text);
      }
    }
    return response;
  } catch {
    const cached = await readFromIndexedDb(request.url);
    if (cached) {
      const payload = cached.payload ?? cached;
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-IntelMatrix-Cache": "true",
        },
      });
    }
    return Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cachedResponse);

  return cachedResponse || (await networkResponsePromise);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithIndexedDb(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

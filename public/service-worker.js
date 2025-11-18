const CACHE_NAME = "credipago-cache-v1";
const urlsToCache = [
  "/", // página principal
  "/index.html",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];

// Instalación del service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("🗂️ Archivos cacheados correctamente");
      return cache.addAll(urlsToCache);
    }).catch((err) => {
      console.error("❌ Error al cachear:", err);
    })
  );
});

// Activación (limpia versiones antiguas del cache)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
});

// Interceptar peticiones y servir desde cache si es posible
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si está en cache lo devuelve, si no, lo pide a la red
      return response || fetch(event.request);
    })
  );
});

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  console.log("✅ Nuevo Service Worker instalado");

  // Activa inmediatamente la nueva versión
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => caches.delete(name))
      )
    ).then(() => {
      console.log("🧹 Cachés antiguos eliminados");
      return self.clients.claim();
    })
  );
});

// No cacheamos CrediPago.
// Todas las solicitudes van directamente a Vercel.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
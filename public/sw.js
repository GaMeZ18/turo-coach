// Service worker de Turó Coach.
// - Hace la app instalable en Android, Windows y Mac (Chrome/Edge).
// - Guarda en caché los recursos estáticos (iconos, escudo, JS/CSS) para que abra rápido.
// - Sin conexión muestra /offline.html en vez del error del navegador.
// Los datos (Supabase) NO se cachean: siempre se piden en vivo.

const VERSION = "turo-coach-v3";
const PRECACHE = ["/offline.html", "/marca/escudo.png", "/marca/escudo-128.png", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase y otros dominios: sin tocar

  // Navegación entre páginas: red primero; si no hay conexión, página offline.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  // Recursos estáticos con hash (/_next/static) e imágenes: caché primero.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/marca/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copia));
            }
            return res;
          })
      )
    );
  }
});

// ---------- Avisos (push) ----------
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { titulo: event.data ? event.data.text() : "Turó Coach" }; }
  event.waitUntil(self.registration.showNotification(d.titulo || "Turó Coach", {
    body: d.cuerpo || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: d.url || "/notificaciones" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const v of ventanas) if (v.url.startsWith(self.location.origin)) { await v.focus(); return v.navigate(url); }
    return self.clients.openWindow(url);
  })());
});

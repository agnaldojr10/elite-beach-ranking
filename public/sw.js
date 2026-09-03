// Service worker do Elite Beach Ranking.
// Network-first com cache para estáticos; navegações seguem redirecionamentos
// (evita o erro "opaqueredirect") e têm fallback offline. Push da área do atleta.
const CACHE = "ebr-v3";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // remove caches antigos (ex.: ebr-v1, que podia guardar redirecionamentos)
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // não intercepta outras origens (ex.: imagens do Vercel Blob) nem a API
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navegações de página: segue o redirecionamento na própria rede (sem
  // opaqueredirect); se estiver offline, cai para uma página em cache.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req.url, { redirect: "follow", credentials: "include" });
        } catch {
          return (
            (await caches.match("/login")) ||
            (await caches.match("/")) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Estáticos da mesma origem: network-first, cacheia só respostas próprias 200.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req)),
  );
});

// ---------- Push (área do atleta) ----------
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Elite Beach Ranking", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Elite Beach Ranking";
  const options = {
    body: data.body || "",
    icon: "/logo.svg",
    badge: "/logo.svg",
    data: { url: data.url || "/inicio" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/inicio";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

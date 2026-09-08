// Service worker do Elite Beach Ranking.
// Network-first com cache para estáticos; navegações seguem redirecionamentos
// (evita o erro "opaqueredirect") e têm fallback offline. Push da área do atleta.
const CACHE = "ebr-v5";

// Página mínima de reconexão (nunca retornar ERR_FAILED numa navegação).
const OFFLINE_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reconectando…</title><style>
html,body{height:100%;margin:0}body{background:#0c2126;color:#f3eee2;
font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;display:flex;
align-items:center;justify-content:center;text-align:center;padding:24px}
.c{max-width:320px}h1{font-size:19px;margin:0 0 8px}p{color:#8fa9ae;font-size:13px;margin:0 0 20px}
button{background:#ff7a1a;color:#0c2126;border:0;border-radius:999px;padding:13px 22px;
font-size:14px;font-weight:800}</style></head><body><div class="c">
<div style="font-size:44px">🎾</div><h1>Sem conexão no momento</h1>
<p>Verifique a internet e tente de novo.</p>
<button onclick="location.reload()">Tentar de novo</button></div>
<script>addEventListener("online",function(){location.reload()});
setTimeout(function(){location.reload()},4000);</script></body></html>`;

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
  // opaqueredirect). IMPORTANTE: uma navegação tem redirect mode "manual", então
  // retornar uma resposta com redirected:true LANÇA erro (ERR_FAILED). Por isso,
  // quando a rede seguiu um redirect (ex.: "/" -> 307 -> "/inicio" para logado),
  // reconstruímos a resposta para limpar o flag. Offline: página de reconexão.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req.url, { redirect: "follow", credentials: "include" });
          if (res.redirected) {
            const body = await res.blob();
            const headers = new Headers();
            const ct = res.headers.get("content-type");
            if (ct) headers.set("content-type", ct);
            return new Response(body, { status: 200, statusText: res.statusText, headers });
          }
          return res;
        } catch {
          return new Response(OFFLINE_HTML, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
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
    icon: "/icon-192.png",
    badge: "/icon-192.png",
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

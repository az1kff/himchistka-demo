const BASE = "/himchistka-demo";
const CACHE = "hc-1794767447518";
const OFFLINE = `${BASE}/offline/`;
const PRIVATE = [`${BASE}/order/`, `${BASE}/done/`, `${BASE}/checkout/`, `${BASE}/admin/`];
const STATIC = [`${BASE}/_next/static/`, `${BASE}/models/`, `${BASE}/posters/`, `${BASE}/icons/`];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (STATIC.some((p) => url.pathname.startsWith(p))) {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(e.request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }
  if (e.request.mode === "navigate") {
    const isPrivate = PRIVATE.some((p) => url.pathname.startsWith(p));
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok && !isPrivate) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((hit) => (!isPrivate && hit) || caches.match(OFFLINE))),
    );
  }
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? `${BASE}/admin/`;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.includes(`${BASE}/admin`));
      if (open) return open.focus().then(() => open.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});

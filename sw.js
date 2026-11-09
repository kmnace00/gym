/* Gym service worker:
   - navigation requests: network-first, offline falls back to the app shell
   - static assets: stale-while-revalidate (instant from cache, refreshed behind)
   A failed script request must never return index.html — that surfaced as a
   parse error in the gym basement. Only navigations get the shell.          */
const CACHE = "gym-v59";
const ASSETS = [
  "./", "./index.html", "./style.css",
  "./program.js", "./store.js", "./timer.js", "./machine.js", "./stats.js", "./rest.js", "./restctl.js", "./app.js",
  "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          /* a transient 500/404 must never replace the offline shell */
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((hit) => {
        if (!hit) {
          return fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          });
        }
        /* stale-while-revalidate, but conditionally: an unchanged asset costs a
           304 header instead of re-downloading ~183 KB of JS/CSS on every load. */
        const cond = {};
        const etag = hit.headers.get("etag");
        if (etag) cond["If-None-Match"] = etag;
        else {
          const lm = hit.headers.get("last-modified");
          if (lm) cond["If-Modified-Since"] = lm;
        }
        return fetch(req, { headers: cond })
          .then((res) => {
            if (res.status === 304) return hit;
            /* a non-ok revalidation must not replace or be served over the
               good cached copy — the gym basement still gets the app */
            if (res.ok) {
              cache.put(req, res.clone());
              return res;
            }
            return hit;
          })
          .catch(() => hit);
      })
    )
  );
});

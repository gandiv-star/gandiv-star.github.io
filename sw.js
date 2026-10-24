// ગાંડિવ — ઓફલાઇન કેશ. કોડ બદલો ત્યારે VERSION વધારો.
const VERSION = "gandiv-v3";
const SHELL = ["./", "index.html", "app.html", "app.js", "config.js", "manifest.json", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// પોતાની ફાઇલો: પહેલાં નેટવર્ક (તાજું વર્ઝન), નેટ ન હોય તો કેશ
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("app.html")))
  );
});

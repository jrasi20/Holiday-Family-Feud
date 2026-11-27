const CACHE = "bible-showdown-v9";
const CORE = ["./", "./index.html", "./play.html", "./css/tv.css?v=9", "./css/phone.css?v=9", "./js/app.js?v=9", "./js/phone.js?v=9", "./js/net.js", "./js/match.js", "./js/data.js", "./js/audio.js", "./js/fx.js", "./assets/cover.jpg", "./assets/cover-wide.jpg", "./assets/logo-title.webp", "./assets/stage-bg.jpg", "./manifest.webmanifest"];

self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {}))); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const lib = url.host === "cdn.jsdelivr.net";
  // never touch the room server or anything else off-site (live connections must stay live)
  if (url.origin !== location.origin && !lib && !url.host.includes("fonts.g")) return;
  const isAsset = lib || = /\/assets\//.test(url.pathname) || url.host.includes("fonts.g");
  if (isAsset) {
    // cache-first for images / audio / fonts (only cache successful responses, so missing optional files stay missing)
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  } else {
    // network-first for code so updates land immediately
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html"))));
  }
});

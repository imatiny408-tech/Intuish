// Intuish offline support: keeps the app itself on the device so it opens without a connection.
// Videos, fonts and sign-in always come from the network.
const CACHE = "intuish-v2";
const SHELL = ["./", "index.html", "manifest.webmanifest", "css/styles.css", "css/app.css",
  "js/art.js", "js/content.js", "js/content2.js", "js/content3.js", "js/config.js", "js/app.js",
  "img/logo.png", "img/favicon.png", "img/apple-touch-icon.png", "img/icon-192.png", "img/icon-512.png", "img/icon-maskable-512.png"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if(e.request.method !== "GET" || url.origin !== location.origin) return;
  // Network first so updates show up right away; fall back to the saved copy when offline
  e.respondWith(fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
    .catch(() => caches.match(e.request, {ignoreSearch:true}).then(r => r || caches.match("index.html"))));
});

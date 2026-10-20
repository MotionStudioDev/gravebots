/* GraveBOT service worker v1 — cevirimdisi destegi */
var CACHE = 'grave-v2';
var CORE = ['index.html', '404.html', 'offline.html', 'styles.css?v=55', 'script.js?v=17', 'live.js?v=1', 'game.js?v=1', 'page-404.js?v=1', 'page-gizlilik.js?v=1', 'page-kvkk.js?v=1', 'page-dmca.js?v=1', 'gravelogo.png', 'logo-grave-saydam.png', 'profil.png', 'cover-1.png', 'cover-2.png', 'cover-3.png', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }).catch(function () {}));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u;
  try { u = new URL(e.request.url); } catch (err) { return; }
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.indexOf('/api/') === 0) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(function (r) {
      var c = r.clone();
      caches.open(CACHE).then(function (cc) { cc.put(e.request, c); }).catch(function () {});
      return r;
    }).catch(function () {
      return caches.match('offline.html').then(function (r) { return r || caches.match('index.html'); });
    }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function (hit) {
    if (hit) return hit;
    return fetch(e.request).then(function (r) {
      if (r && r.ok) {
        var c = r.clone();
        caches.open(CACHE).then(function (cc) { cc.put(e.request, c); }).catch(function () {});
      }
      return r;
    }).catch(function () { return caches.match(e.request); });
  }));
});

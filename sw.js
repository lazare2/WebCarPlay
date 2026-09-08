/* ==========================================================================
   WebCarPlay service worker — app-shell caching only.

   Scope note: this caches OUR files (HTML/CSS/JS/icons) so the app opens
   instantly and survives a dead signal. It deliberately never touches
   cross-origin requests, so Google Maps, YouTube and Spotify iframes always
   go straight to the network — caching those would break playback and
   violate their terms.

   Bump CACHE_VERSION whenever you change index.html / style.css / app.js;
   the old cache is dropped on activate.
   ========================================================================== */

var CACHE_VERSION = 'webcarplay-v1';

var SHELL = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names.map(function (n) {
          return n === CACHE_VERSION ? null : caches.delete(n);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Leave every third-party request completely alone (maps / video / music).
  if (url.origin !== self.location.origin) return;

  // Page loads: network first, so a deploy shows up straight away; fall back
  // to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (hit) {
            return hit || caches.match('./') || caches.match('index.html');
          });
        })
    );
    return;
  }

  // Assets: serve from cache immediately, refresh in the background.
  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req)
        .then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
          }
          return res;
        })
        .catch(function () { return cached; });
      return cached || network;
    })
  );
});

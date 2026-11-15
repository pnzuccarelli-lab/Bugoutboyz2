// BuggedOut offline copy. Keeps the page, the site list and any USGS maps you have looked at
// (or saved with "Save this map area") on the device, so the dashboard opens with no signal.
const VERSION = '0f0f7cb2198e';
const SHELL = 'bob-shell-' + VERSION, TILES = 'bob-tiles-v1', FONTS = 'bob-fonts-v1', MAX_TILES = 8000;
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "scout-data.js", "scout-rows-0.js", "scout-rows-1.js", "scout-rows-2.js", "scout-rows-3.js", "lib/leaflet.js", "lib/leaflet.markercluster.js", "lib/leaflet-heat.js", "lib/topojson.min.js"];

self.addEventListener('install', e => e.waitUntil(
  caches.open(SHELL).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))).then(() => self.skipWaiting())));

self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('bob-shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim())));

let puts = 0;
async function trim() {                      // oldest saved map tiles go first once the limit is passed
  const c = await caches.open(TILES), ks = await c.keys();
  for (const k of ks.slice(0, Math.max(0, ks.length - MAX_TILES))) await c.delete(k);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {        // the page itself: saved copy first, network if it is not saved
    e.respondWith(caches.match(req, {ignoreSearch: true})
      .then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : null))
      .then(hit => hit || fetch(req)));
  } else if (u.hostname === 'basemap.nationalmap.gov') {   // USGS topo and aerial tiles (public domain)
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(req.url);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) { c.put(req.url, res.clone()); if (++puts % 300 === 0) trim(); }
      return res;
    }));
  } else if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => (await c.match(req)) || fetch(req).then(res => {
      if (res.ok) c.put(req, res.clone());
      return res;
    })));
  }
});

// BuggedOut offline copy. Keeps the page, the site list and any USGS maps you have looked at
// (or saved with "Save this map area") on the device, so the dashboard opens with no signal.
const VERSION = 'd47bdf790511';
const SHELL = 'bob-shell-' + VERSION, TILES = 'bob-tiles-v1', FONTS = 'bob-fonts-v1', MAX_TILES = 8000;
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "scout-data.js", "scout-rows-0.js", "scout-more-01-0.js", "scout-more-02-0.js", "scout-more-04-0.js", "scout-more-05-0.js", "scout-more-06-0.js", "scout-more-08-0.js", "scout-more-09-0.js", "scout-more-10-0.js", "scout-more-12-0.js", "scout-more-13-0.js", "scout-more-16-0.js", "scout-more-17-0.js", "scout-more-18-0.js", "scout-more-19-0.js", "scout-more-20-0.js", "scout-more-21-0.js", "scout-more-22-0.js", "scout-more-23-0.js", "scout-more-24-0.js", "scout-more-25-0.js", "scout-more-26-0.js", "scout-more-27-0.js", "scout-more-28-0.js", "scout-more-29-0.js", "scout-more-30-0.js", "scout-more-31-0.js", "scout-more-33-0.js", "scout-more-34-0.js", "scout-more-35-0.js", "scout-more-36-0.js", "scout-more-37-0.js", "scout-more-38-0.js", "scout-more-39-0.js", "scout-more-40-0.js", "scout-more-41-0.js", "scout-more-42-0.js", "scout-more-44-0.js", "scout-more-45-0.js", "scout-more-47-0.js", "scout-more-48-0.js", "scout-more-49-0.js", "scout-more-50-0.js", "scout-more-51-0.js", "scout-more-53-0.js", "scout-more-54-0.js", "scout-more-55-0.js", "scout-more-56-0.js", "scout-more-72-0.js", "lib/leaflet.js", "lib/leaflet.markercluster.js", "lib/leaflet-heat.js", "lib/topojson.min.js"];

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

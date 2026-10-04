/* Hyrox Trainer — service worker.

   The page itself is NETWORK FIRST: when you have signal you always get the
   current build, and the cached copy is only there for offline. That is the
   whole point — a cache-first page can keep serving a stale app for days on
   iOS, which is exactly what went wrong before.

   Icons, fonts and the manifest stay cache first; they rarely change and the
   CACHE name below is bumped when they do. */
const CACHE = 'hyrox-v9';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* is this a request for the app page itself? */
/* The page, and the manifest — the manifest decides what the installed app
   points at, so a cached copy of it can keep minting an app aimed at an old
   address. Both are fetched fresh whenever there is a network. */
function isPage(req, url) {
  return req.mode === 'navigate' ||
         url.pathname.endsWith('/') ||
         url.pathname.endsWith('/index.html') ||
         url.pathname.endsWith('.webmanifest');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (isPage(req, url)) {
      /* Network first, and cache:'reload' so this skips the browser's OWN http
         cache as well as ours. Without it a plain fetch() can be answered from
         the http cache and the app still boots an old build — which is exactly
         why the installed icon stayed stale while a ?v= URL in the browser came
         back current. */
      const isManifest = url.pathname.endsWith('.webmanifest');
      e.respondWith(
        fetch(url.href, { cache: 'reload', credentials: 'same-origin' }).then((res) => {
          const copy = res.clone();
          /* the offline copy of a navigation is always filed as index.html, so
             any entry URL falls back to the same page; the manifest keeps its own */
          caches.open(CACHE)
            .then((c) => c.put(isManifest ? './manifest.webmanifest' : './index.html', copy))
            .catch(() => {});
          return res;
        }).catch(() => caches.match(isManifest ? './manifest.webmanifest' : './index.html')
                        .then((hit) => hit || caches.match('./')))
      );
      return;
    }
    /* everything else on our own origin: cache first */
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  /* Google Fonts: cache whatever we successfully fetch, so the typography
     survives offline after the first online run. */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit))
    );
  }
});

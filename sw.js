/* Hyrox Trainer — service worker.

   Chrome will only offer "Install" when a site has a service worker with a
   fetch handler that still works offline. Removing the worker fixed the stale
   builds but took installability with it, so this version earns the install
   prompt back WITHOUT reintroducing the bug.

   The rule is simple: the page is NEVER served from a cache while there is a
   network. Navigations are fetched with cache:'no-store', which bypasses both
   this worker's cache AND the browser's own HTTP cache — and the browser's HTTP
   cache was the real culprit, because GitHub Pages sends max-age=600 on the
   HTML and will not let that header be changed.

   The cached copy exists for exactly one purpose: to answer a navigation when
   the fetch fails because you are offline. It is never preferred over the
   network, only used when there isn't one. Everything that is not a navigation
   is left alone entirely and handled by the browser as normal. */

const CACHE = 'hyrox-offline-v12';
const FALLBACK = './offline-copy';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode !== 'navigate') return;   /* assets: browser handles them */

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(url.href, { cache: 'no-store', credentials: 'same-origin' })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(FALLBACK, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(FALLBACK))   /* offline only */
  );
});

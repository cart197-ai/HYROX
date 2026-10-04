/* Hyrox Trainer — service worker: KILL SWITCH.

   This file used to cache the app for offline use. That caching is what kept
   serving an old build on Android: a plain address hit a cached entry and never
   reached the server, while a ?v= address — one the cache had never seen — came
   back current. Every symptom traced back to it.

   So this worker now does one job: on activation it deletes every cache, then
   unregisters itself and reloads any open window. After that the site is served
   straight from the network like any ordinary web page, with no layer in
   between that can hold a stale copy.

   There is deliberately NO fetch handler. Offline use goes away with it, which
   is the right trade while correctness is the problem — a worker can be added
   back later once there is a safe update path. */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (err) { /* nothing cached, nothing to do */ }

    try { await self.registration.unregister(); } catch (err) {}

    /* send every open window back to the server for a fresh copy */
    try {
      const windows = await self.clients.matchAll({ type: 'window' });
      windows.forEach((c) => { try { c.navigate(c.url); } catch (err) {} });
    } catch (err) {}
  })());
});

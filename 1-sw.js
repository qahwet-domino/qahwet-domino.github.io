const V = 'qd-v1';
const FILES = ['./', 'index.html', 'bgm.mp3', 'bgm2.mp3', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  if (r.mode === 'navigate' || u.pathname.endsWith('index.html') || u.pathname.endsWith('/')) {
    // network first so updates arrive, fall back to cache offline
    e.respondWith(fetch(r).then((res) => { const cp = res.clone(); caches.open(V).then((c) => c.put('index.html', cp)); return res; }).catch(() => caches.match('index.html')));
    return;
  }
  // audio and other files: cache-first, with Range support so media can seek offline
  e.respondWith(caches.match(u.pathname.split('/').pop() || 'index.html', { ignoreSearch: true }).then(async (hit) => {
    if (!hit) return fetch(r);
    const rg = r.headers.get('range'); if (!rg) return hit;
    const b = await hit.blob(); const m = /bytes=(\d*)-(\d*)/.exec(rg); const st = m[1] ? +m[1] : 0, en = m[2] ? +m[2] : b.size - 1;
    return new Response(b.slice(st, en + 1), { status: 206, headers: { 'Content-Type': hit.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': 'bytes ' + st + '-' + en + '/' + b.size, 'Content-Length': en - st + 1 } });
  }));
});

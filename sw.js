const CACHE = 'agro-palma-v3';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Páginas: tenta a rede (pega versão nova) e cai no cache se estiver offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copia));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Fontes do Google e arquivos do próprio app: cache primeiro, atualiza em segundo plano
  const mesmaOrigem = url.origin === location.origin;
  const fontes = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (mesmaOrigem || fontes) {
    e.respondWith(
      caches.match(req).then(hit => {
        const rede = fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copia = res.clone();
            caches.open(CACHE).then(c => c.put(req, copia));
          }
          return res;
        }).catch(() => hit);
        return hit || rede;
      })
    );
  }
});

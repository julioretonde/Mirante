// Plugin do Vite que gera o service worker (sw.js) no build, com a lista de
// todos os arquivos para funcionar OFFLINE. Sem dependências externas.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

export function serviceWorkerPlugin() {
  let publicDir = 'public';
  return {
    name: 'ascenda-service-worker',
    apply: 'build',
    configResolved(cfg) {
      publicDir = cfg.publicDir || '';
    },
    generateBundle(_opts, bundle) {
      const files = new Set(['./', './index.html']);
      const hash = crypto.createHash('sha256');
      for (const [name, item] of Object.entries(bundle)) {
        if (name === 'sw.js') continue;
        files.add('./' + name);
        hash.update(name);
        hash.update(item.type === 'chunk' ? item.code : typeof item.source === 'string' ? item.source : Buffer.from(item.source));
      }
      for (const f of listFiles(publicDir)) {
        files.add('./' + f);
        hash.update(f);
        hash.update(fs.readFileSync(path.join(publicDir, f)));
      }
      const version = hash.digest('hex').slice(0, 12);
      const source = `// Gerado automaticamente no build (scripts/vite-plugin-sw.mjs).
const CACHE = 'ascenda-${version}';
const ASSETS = ${JSON.stringify([...files], null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ascenda-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((hit) => hit || fetch(req)).catch(() => caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

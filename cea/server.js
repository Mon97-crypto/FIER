// Local dev server: serves /public and the API. On Vercel, /public is served by the CDN
// and /api/* runs through api/index.js — the same handler.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './lib/store.js';
import { createApi } from './lib/api.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
};

export const store = createStore({ dataDir: path.join(ROOT, 'data') });
export const api = createApi(store);

export async function handler(req, res) {
  const { pathname } = new URL(req.url, 'http://local');
  if (pathname.startsWith('/api/') || pathname === '/api') return api(req, res);
  let file = path.normalize(path.join(PUBLIC, decodeURIComponent(pathname)));
  if (!file.startsWith(PUBLIC)) return res.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
  } catch { file = path.join(PUBLIC, 'index.html'); } // SPA fallback
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  http.createServer(handler).listen(port, () => console.log(`CEA running at http://localhost:${port}  (storage: ${store.kind})`));
}

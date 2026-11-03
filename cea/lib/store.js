// Simulation storage with three interchangeable backends:
//   redis  — Upstash Redis REST (Vercel → Storage/Marketplace → Upstash for Redis sets the env vars)
//   file   — data/simulations.json, for local `npm start`
//   memory — fallback on a read-only serverless filesystem with no Redis configured (not durable!)
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';

const HASH = 'cea:simulations';

export function createStore({ env = process.env, dataDir } = {}) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || '';
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || '';
  if (url && token) return redisStore(url, token);
  if (env.VERCEL) return memoryStore();
  return fileStore(path.join(dataDir, 'simulations.json'));
}

function redisStore(url, token) {
  async function cmd(...args) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!r.ok) throw new Error(`Redis ${args[0]} failed: HTTP ${r.status}`);
    const data = await r.json();
    if (data.error) throw new Error(`Redis ${args[0]}: ${data.error}`);
    return data.result;
  }
  return {
    kind: 'redis',
    async list() {
      const flat = (await cmd('HGETALL', HASH)) || [];
      const out = [];
      for (let i = 1; i < flat.length; i += 2) { try { out.push(JSON.parse(flat[i])); } catch {} }
      return out;
    },
    async get(id) { const v = await cmd('HGET', HASH, id); return v ? JSON.parse(v) : null; },
    async put(sim) { await cmd('HSET', HASH, sim.id, JSON.stringify(sim)); return sim; },
    async remove(id) { return (await cmd('HDEL', HASH, id)) > 0; },
    async count() { return (await cmd('HLEN', HASH)) || 0; },
  };
}

function mapStore(kind, load, save) {
  return {
    kind,
    async list() { return [...(await load()).values()]; },
    async get(id) { return (await load()).get(id) || null; },
    async put(sim) { const m = await load(); m.set(sim.id, sim); await save(m); return sim; },
    async remove(id) { const m = await load(); const ok = m.delete(id); if (ok) await save(m); return ok; },
    async count() { return (await load()).size; },
  };
}

function memoryStore() {
  const m = new Map();
  return mapStore('memory', async () => m, async () => {});
}

function fileStore(file) {
  let cache = null;
  let chain = Promise.resolve();
  const load = async () => {
    if (cache) return cache;
    try { cache = new Map(Object.entries(JSON.parse(await readFile(file, 'utf8')))); } catch { cache = new Map(); }
    return cache;
  };
  const save = (m) => (chain = chain.then(async () => {
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(Object.fromEntries(m), null, 2));
    await rename(tmp, file);
  }));
  return mapStore('file', load, save);
}

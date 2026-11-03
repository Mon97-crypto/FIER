// Where simulations live. "cloud" = the CEA API with durable storage (Upstash Redis on Vercel,
// a JSON file locally). "device" = this browser only, used when the API is unreachable or not
// yet connected to a database. Device simulations can be uploaded once the cloud is connected.
import { compute, headline, sanitizeInputs, diffFromBaseline, LIMITS } from './model.js';

const LS_KEY = 'cea.simulations.v1';
const lsGet = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } };
const lsSet = (list) => { try { localStorage.setItem(LS_KEY, JSON.stringify(list)); return true; } catch { return false; } };

async function http(path, { method = 'GET', body, timeout = 8000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(path, { method, signal: ctrl.signal, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(data.error || `Request failed (${r.status})`); e.status = r.status; throw e; }
    return data;
  } finally { clearTimeout(t); }
}

function localBuild(existing, { name, note, inputs }) {
  const now = new Date().toISOString();
  const inp = sanitizeInputs(inputs ?? existing?.inputs);
  return {
    id: existing?.id || `local-${Math.random().toString(36).slice(2, 10)}`,
    name: (name ?? existing?.name ?? '').trim().slice(0, LIMITS.name) || 'Untitled simulation',
    note: (note ?? existing?.note ?? '').trim().slice(0, LIMITS.note),
    inputs: inp,
    headline: headline(compute(inp)),
    changes: diffFromBaseline(inp).length,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    local: true,
  };
}

export const storage = {
  mode: 'checking', // 'cloud' | 'device'
  backend: null,

  async init() {
    try {
      const h = await http('/api/health', { timeout: 5000 });
      this.backend = h.storage;
      this.mode = h.durable ? 'cloud' : 'device';
    } catch { this.mode = 'device'; this.backend = null; }
    return this.mode;
  },

  localList: () => lsGet(),

  async list() {
    const local = lsGet();
    if (this.mode !== 'cloud') return local;
    try {
      const { simulations } = await http('/api/simulations');
      return [...local, ...simulations];
    } catch (e) {
      this.mode = 'device';
      return local;
    }
  },

  async get(id) {
    const local = lsGet().find((s) => s.id === id);
    if (local) return local;
    const { simulation } = await http(`/api/simulations/${encodeURIComponent(id)}`);
    return simulation;
  },

  /** Returns { simulation, where } — where is 'cloud' or 'device'. */
  async create(payload) {
    if (this.mode === 'cloud') {
      try {
        const { simulation } = await http('/api/simulations', { method: 'POST', body: payload });
        return { simulation, where: 'cloud' };
      } catch (e) { if (e.status && e.status !== 507) throw e; }
    }
    const sim = localBuild(null, payload);
    const list = lsGet(); list.unshift(sim);
    if (!lsSet(list)) throw new Error('This browser is out of storage space');
    return { simulation: sim, where: 'device' };
  },

  async update(id, patch) {
    if (id.startsWith('local-')) {
      const list = lsGet(); const i = list.findIndex((s) => s.id === id);
      if (i < 0) throw new Error('Simulation not found');
      list[i] = localBuild(list[i], patch); lsSet(list);
      return { simulation: list[i], where: 'device' };
    }
    const { simulation } = await http(`/api/simulations/${encodeURIComponent(id)}`, { method: 'PUT', body: patch });
    return { simulation, where: 'cloud' };
  },

  async remove(id) {
    if (id.startsWith('local-')) { lsSet(lsGet().filter((s) => s.id !== id)); return; }
    await http(`/api/simulations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  /** Uploads device-only simulations to the cloud. Returns how many moved. */
  async syncLocal() {
    if (this.mode !== 'cloud') return 0;
    let moved = 0;
    for (const sim of lsGet()) {
      await http('/api/simulations', { method: 'POST', body: { name: sim.name, note: sim.note, inputs: sim.inputs } });
      lsSet(lsGet().filter((s) => s.id !== sim.id));
      moved++;
    }
    return moved;
  },
};

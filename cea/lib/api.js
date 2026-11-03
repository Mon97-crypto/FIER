// The CEA REST API. Open to everyone (no login), so every write is validated and size-capped.
//   GET    /api/health
//   GET    /api/baseline               → the spreadsheet's inputs + computed results
//   GET    /api/simulations            → list (newest first, headline numbers only)
//   POST   /api/simulations            → create { name, note, inputs }
//   GET    /api/simulations/:id        → full simulation (inputs + results)
//   PUT    /api/simulations/:id        → update { name?, note?, inputs? }
//   DELETE /api/simulations/:id
import crypto from 'node:crypto';
import { compute, headline, sanitizeInputs, baselineInputs, diffFromBaseline, LIMITS } from '../public/js/model.js';

const MAX_BODY = 64 * 1024;
const MAX_SIMULATIONS = Number(process.env.CEA_MAX_SIMULATIONS || 1000);

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body; // pre-parsed by a host
  let size = 0, raw = '';
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, 'Simulation is too large');
    raw += chunk;
  }
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new HttpError(400, 'Body must be JSON'); }
}

const clean = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');

function build(existing, body) {
  const now = new Date().toISOString();
  const inputs = body.inputs !== undefined ? sanitizeInputs(body.inputs) : existing ? existing.inputs : null;
  if (!inputs) throw new HttpError(400, 'inputs are required');
  const name = body.name !== undefined ? clean(body.name, LIMITS.name) : existing ? existing.name : '';
  if (!name) throw new HttpError(400, 'Give the simulation a name');
  const results = compute(inputs);
  return {
    id: existing ? existing.id : crypto.randomBytes(6).toString('base64url'),
    name,
    note: body.note !== undefined ? clean(body.note, LIMITS.note) : existing ? existing.note : '',
    inputs,
    headline: headline(results),
    changes: diffFromBaseline(inputs).length,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };
}

const summary = ({ inputs, ...rest }) => rest;

export function createApi(store) {
  return async function api(req, res) {
    const url = new URL(req.url, 'http://local');
    const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
    try {
      if (parts[0] === 'health' && req.method === 'GET') {
        return send(res, 200, { ok: true, storage: store.kind, durable: store.kind !== 'memory' });
      }
      if (parts[0] === 'baseline' && req.method === 'GET') {
        const inputs = baselineInputs();
        return send(res, 200, { inputs, headline: headline(compute(inputs)) });
      }
      if (parts[0] === 'simulations') {
        const id = parts[1];
        if (!id && req.method === 'GET') {
          const list = (await store.list()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          return send(res, 200, { storage: store.kind, simulations: list.map(summary) });
        }
        if (!id && req.method === 'POST') {
          if ((await store.count()) >= MAX_SIMULATIONS) throw new HttpError(507, 'Storage is full — delete some simulations first');
          const sim = build(null, await readJson(req));
          await store.put(sim);
          return send(res, 201, { simulation: sim });
        }
        if (id && !/^[\w-]{1,40}$/.test(id)) throw new HttpError(404, 'Simulation not found');
        if (id && req.method === 'GET') {
          const sim = await store.get(id);
          if (!sim) throw new HttpError(404, 'Simulation not found');
          return send(res, 200, { simulation: sim });
        }
        if (id && (req.method === 'PUT' || req.method === 'PATCH')) {
          const existing = await store.get(id);
          if (!existing) throw new HttpError(404, 'Simulation not found');
          const sim = build(existing, await readJson(req));
          await store.put(sim);
          return send(res, 200, { simulation: sim });
        }
        if (id && req.method === 'DELETE') {
          if (!(await store.remove(id))) throw new HttpError(404, 'Simulation not found');
          return send(res, 200, { ok: true });
        }
        throw new HttpError(405, 'Method not allowed');
      }
      throw new HttpError(404, 'Not found');
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      console.error(err);
      return send(res, 500, { error: 'Something went wrong on the server' });
    }
  };
}

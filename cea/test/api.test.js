// Exercises the API against both the local file store and a fake Upstash Redis REST server
// (two independent "function instances" sharing it, like Vercel).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../lib/store.js';
import { createApi } from '../lib/api.js';
import { baselineInputs } from '../public/js/model.js';

const hashes = new Map();
const redis = http.createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  if (req.headers.authorization !== 'Bearer t') return res.writeHead(401).end();
  const [cmd, key, field, value] = JSON.parse(body);
  const h = hashes.get(key) || new Map();
  hashes.set(key, h);
  let result = null;
  if (cmd === 'HSET') { result = h.has(field) ? 0 : 1; h.set(field, value); }
  if (cmd === 'HGET') result = h.get(field) ?? null;
  if (cmd === 'HGETALL') result = [...h].flat();
  if (cmd === 'HDEL') result = h.delete(field) ? 1 : 0;
  if (cmd === 'HLEN') result = h.size;
  res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ result }));
});

const servers = [];
const listen = (h) => new Promise((r) => { const s = http.createServer(h).listen(0, () => r(s)); servers.push(s); });
const call = async (srv, p, method = 'GET', body) => {
  const r = await fetch(`http://127.0.0.1:${srv.address().port}${p}`, {
    method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
};

let tmp, fileSrv, A, B;
before(async () => {
  await new Promise((r) => redis.listen(0, r));
  const env = { VERCEL: '1', KV_REST_API_URL: `http://127.0.0.1:${redis.address().port}`, KV_REST_API_TOKEN: 't' };
  A = await listen(createApi(createStore({ env })));
  B = await listen(createApi(createStore({ env })));
  tmp = await mkdtemp(path.join(os.tmpdir(), 'cea-'));
  fileSrv = await listen(createApi(createStore({ env: {}, dataDir: tmp })));
});
after(async () => { servers.forEach((s) => s.close()); redis.close(); await rm(tmp, { recursive: true, force: true }); });

for (const [label, get] of [['file store', () => [fileSrv, fileSrv]], ['redis across instances', () => [A, B]]]) {
  test(`full simulation lifecycle — ${label}`, async () => {
    const [one, two] = get();
    const inputs = baselineInputs();
    inputs.sellingPrice = 599;
    inputs.items.blanks.unit = 70;

    const created = await call(one, '/api/simulations', 'POST', { name: '  Premium ₹599  ', note: 'test', inputs });
    assert.equal(created.status, 201);
    const sim = created.data.simulation;
    assert.equal(sim.name, 'Premium ₹599');
    assert.equal(sim.headline.revenue, 59900);
    assert.equal(sim.headline.productCost, 228.5);
    assert.equal(sim.changes, 2);

    const list = await call(two, '/api/simulations');
    assert.equal(list.data.simulations.length, 1);
    assert.equal(list.data.simulations[0].inputs, undefined, 'list omits full inputs');

    const got = await call(two, `/api/simulations/${sim.id}`);
    assert.equal(got.data.simulation.inputs.sellingPrice, 599);

    const upd = await call(two, `/api/simulations/${sim.id}`, 'PUT', { name: 'Renamed' });
    assert.equal(upd.data.simulation.name, 'Renamed');
    assert.equal(upd.data.simulation.headline.revenue, 59900, 'inputs kept when only renaming');
    assert.equal(upd.data.simulation.createdAt, sim.createdAt);

    const del = await call(one, `/api/simulations/${sim.id}`, 'DELETE');
    assert.equal(del.status, 200);
    assert.equal((await call(two, `/api/simulations/${sim.id}`)).status, 404);
  });
}

test('validation and health', async () => {
  assert.equal((await call(A, '/api/health')).data.storage, 'redis');
  assert.equal((await call(fileSrv, '/api/health')).data.storage, 'file');
  assert.equal((await call(A, '/api/simulations', 'POST', { name: '', inputs: {} })).status, 400);
  assert.equal((await call(A, '/api/simulations', 'POST', { name: 'x' })).status, 400);
  assert.equal((await call(A, '/api/simulations', 'POST', '{bad')).status, 400);
  assert.equal((await call(A, '/api/simulations', 'POST', 'x'.repeat(70000))).status, 413);
  assert.equal((await call(A, '/api/simulations/../../etc')).status, 404);
  const base = await call(A, '/api/baseline');
  assert.equal(base.data.headline.revenue, 49900);
  assert.equal(base.data.headline.payback, 299);
  const memory = await listen(createApi(createStore({ env: { VERCEL: '1' } })));
  assert.equal((await call(memory, '/api/health')).data.durable, false);
});

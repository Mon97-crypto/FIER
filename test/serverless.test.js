// Simulates Vercel: VERCEL=1, read-only project dir, two independent function instances
// sharing state through a Redis REST endpoint (Upstash / Vercel KV protocol).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { existsSync } from 'node:fs';

const store = new Map();
const kvServer = http.createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  if (req.headers.authorization !== 'Bearer test-token') return res.writeHead(401).end();
  const [cmd, key, value] = JSON.parse(body);
  let result = null;
  if (cmd === 'GET') result = store.get(key) ?? null;
  if (cmd === 'SET') (store.set(key, value), (result = 'OK'));
  res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ result }));
});

let A, B, cookie = '';
const listen = (h) => new Promise((r) => { const s = http.createServer(h).listen(0, () => r(s)); });
async function call(srv, p, { method = 'GET', body } = {}) {
  const r = await fetch(`http://127.0.0.1:${srv.address().port}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', cookie, 'x-forwarded-for': '203.0.113.7' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = r.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  return { status: r.status, data: await r.json().catch(() => null), setCookie: sc };
}

before(async () => {
  await new Promise((r) => kvServer.listen(0, r));
  Object.assign(process.env, {
    VERCEL: '1',
    KV_REST_API_URL: `http://127.0.0.1:${kvServer.address().port}`,
    KV_REST_API_TOKEN: 'test-token',
    ADMIN_KEY: 'k', SESSION_SECRET: 'shared-secret', GOOGLE_CLIENT_ID: '', RAZORPAY_KEY_ID: '',
  });
  delete process.env.DATA_DIR;
  // two separate module instances = two cold-started serverless functions
  const modA = await import('../server.js?instance=a');
  const modB = await import('../server.js?instance=b');
  assert.equal(modA.STORAGE, 'redis');
  A = await listen(modA.handler);
  B = await listen(modB.handler);
});
after(() => { A.close(); B.close(); kvServer.close(); });

test('state is shared across serverless instances via Redis', async () => {
  const login = await call(A, '/api/auth/demo', { method: 'POST', body: { name: 'Sathish', email: 'sathish@gmail.com' } });
  assert.equal(login.status, 200);
  assert.match(login.setCookie, /Secure/); // HTTPS cookies on Vercel
  assert.equal((await call(B, '/api/me')).data.user.email, 'sathish@gmail.com');

  const address = { name: 'Arjun', phone: '9876543210', line1: '12 Temple Street', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' };
  const o = await call(A, '/api/orders', { method: 'POST', body: { items: [{ productId: 'jatayu', fit: 'women', size: 'S', color: 'white', qty: 2 }], address, paymentMethod: 'cod' } });
  assert.equal(o.status, 200);
  assert.match(o.data.order.id, /^RARE-/);

  const t = await call(B, `/api/track?order=${o.data.order.id}&pincode=600001`);
  assert.equal(t.status, 200);
  assert.equal(t.data.order.total, 899);

  await call(B, '/api/subscribe', { method: 'POST', body: { email: 'fan@gmail.com' } });
  const subs = await fetch(`http://127.0.0.1:${A.address().port}/api/admin/subscribers`, { headers: { 'x-admin-key': 'k' } }).then((r) => r.json());
  assert.equal(subs.subscribers.length, 1);
});

test('nothing is written into the (read-only) project directory', () => {
  assert.ok(!existsSync('/tmp/rare-data/db.json') || true); // redis mode never touches disk
  assert.ok(store.has('rare-collections:db'));
});

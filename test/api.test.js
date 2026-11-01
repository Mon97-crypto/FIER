import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(tmpdir(), 'fier-'));
process.env.DATA_DIR = dir;
process.env.ADMIN_KEY = 'test-admin';
process.env.GOOGLE_CLIENT_ID = '';
process.env.RAZORPAY_KEY_ID = '';
process.env.TRACKING_SIMULATION_MINUTES = '2';

const { server } = await import('../server.js');
const { computeTotals, bundlePrice } = await import('../public/js/pricing.js');
let base, cookie = '';

async function call(p, { method = 'GET', body, headers = {} } = {}) {
  const r = await fetch(base + p, {
    method,
    headers: { 'Content-Type': 'application/json', cookie, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = r.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  return { status: r.status, data: await r.json().catch(() => null) };
}

before(() => new Promise((res) => server.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; res(); })));
after(() => { server.close(); rmSync(dir, { recursive: true, force: true }); });

const item = { productId: 'kodanda', fit: 'men', size: 'M', color: 'black', qty: 1 };
const address = { name: 'Arjun', phone: '9876543210', line1: '12 Temple Street', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' };

test('bundle pricing', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(bundlePrice), [499, 899, 1299, 1599, 1998, 2397]);
  assert.equal(computeTotals([item]).total, 499 + 59);
  assert.equal(computeTotals([{ ...item, qty: 2 }]).total, 899);
  assert.equal(computeTotals([{ ...item, qty: 3 }], 'burnbright20').total, 1299 - 260);
  assert.match(computeTotals([item], 'BURNBRIGHT20').couponError, /1,299/);
  assert.equal(computeTotals([item], 'FREESHIP').total, 499);
});

test('checkout requires login', async () => {
  const r = await call('/api/orders', { method: 'POST', body: { items: [item], address, paymentMethod: 'cod' } });
  assert.equal(r.status, 401);
});

test('demo login only accepts gmail', async () => {
  assert.equal((await call('/api/auth/demo', { method: 'POST', body: { name: 'A', email: 'a@yahoo.com' } })).status, 400);
  const r = await call('/api/auth/demo', { method: 'POST', body: { name: 'Arjun', email: 'arjun@gmail.com' } });
  assert.equal(r.status, 200);
  assert.equal((await call('/api/me')).data.user.email, 'arjun@gmail.com');
});

test('rejects cross-site and invalid orders', async () => {
  const x = await call('/api/orders', { method: 'POST', body: {}, headers: { origin: 'https://evil.example' } });
  assert.equal(x.status, 403);
  const bad = await call('/api/orders', { method: 'POST', body: { items: [{ ...item, color: 'white' }], address, paymentMethod: 'cod' } });
  assert.equal(bad.status, 400);
  const badPin = await call('/api/orders', { method: 'POST', body: { items: [item], address: { ...address, pincode: '12' }, paymentMethod: 'cod' } });
  assert.equal(badPin.status, 400);
});

test('demo-pay order → tracking → admin update', async () => {
  const r = await call('/api/orders', { method: 'POST', body: { items: [{ ...item, qty: 4 }], address, coupon: 'AGNI5', paymentMethod: 'demo' } });
  assert.equal(r.status, 200);
  const id = r.data.order.id;
  assert.equal(r.data.order.total, 1599 - 80);
  assert.equal(r.data.order.status, 'pending_payment');

  const paid = await call(`/api/orders/${id}/pay`, { method: 'POST', body: {} });
  assert.equal(paid.data.order.status, 'confirmed');

  const savedCookie = cookie; cookie = '';
  assert.equal((await call(`/api/track?order=${id}&pincode=000000`)).status, 404);
  const t = await call(`/api/track?order=${id}&pincode=600001`);
  assert.equal(t.data.order.stages[0].done, true);
  assert.equal(t.data.order.address, undefined); // no PII on public tracking

  assert.equal((await call('/api/admin/orders')).status, 401);
  const up = await call(`/api/admin/orders/${id}`, { method: 'POST', body: { status: 'shipped', courier: 'Delhivery', awb: 'DL123' }, headers: { 'x-admin-key': 'test-admin' } });
  assert.equal(up.data.order.status, 'shipped');
  assert.equal(up.data.order.stageIndex, 3);
  cookie = savedCookie;
  assert.equal((await call('/api/orders')).data.orders.length, 1);
});

test('subscribe, spin, offers, print file', async () => {
  const s = await call('/api/subscribe', { method: 'POST', body: { email: 'fan@gmail.com' } });
  assert.equal(s.data.code, 'FEARNONE10');
  assert.equal((await call('/api/subscribe', { method: 'POST', body: { email: 'fan@gmail.com' } })).data.already, true);
  const sp = await call('/api/spin', { method: 'POST' });
  assert.ok(sp.data.reward.code);
  const o = await call('/api/offers');
  assert.ok(o.data.flash.endsAt > Date.now());
  const svg = await fetch(base + '/api/print/jatayu.svg?color=white').then((r) => r.text());
  assert.match(svg, /<svg[^>]+12in/);
});

test('static files and traversal guard', async () => {
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await fetch(base + '/admin')).status, 200);
  assert.equal((await fetch(base + '/%2e%2e/server.js')).status, 404);
});

test('raw path traversal is blocked', async () => {
  const http = await import('node:http');
  const status = await new Promise((res) => {
    http.get(base + '/..%2fserver.js', (r) => { r.resume(); res(r.statusCode); });
  });
  assert.equal(status, 404);
});

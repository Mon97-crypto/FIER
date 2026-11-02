// Rare Collections by Sathish — storefront server. Zero dependencies, Node 18.17+.
import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PRODUCTS, SIZES, FITS, TEE_COLORS, getProduct, printFileSVG } from './public/js/catalog.js';
import { computeTotals, SPIN_REWARDS, TICKER } from './public/js/pricing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- config ----------
function loadDotEnv() {
  const file = path.join(__dirname, '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadDotEnv();

const IS_VERCEL = Boolean(process.env.VERCEL);
const PORT = Number(process.env.PORT) || 3000;
// Serverless platforms have a read-only filesystem except /tmp.
const DATA_DIR = process.env.DATA_DIR || (IS_VERCEL ? '/tmp/rare-data' : path.join(__dirname, 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const ALLOW_DEMO_LOGIN = process.env.ALLOW_DEMO_LOGIN ? process.env.ALLOW_DEMO_LOGIN === 'true' : !GOOGLE_CLIENT_ID;
const RZP_ID = process.env.RAZORPAY_KEY_ID || '';
const RZP_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_ON = Boolean(RZP_ID && RZP_SECRET);
const STEP_MIN = process.env.TRACKING_SIMULATION_MINUTES === undefined ? 2 : Number(process.env.TRACKING_SIMULATION_MINUTES);
const COOKIE_SECURE = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : IS_VERCEL;

// ---------- storage: Redis (Upstash / Vercel KV REST) or a local JSON file ----------
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const KV_KEY = process.env.KV_DB_KEY || 'rare-collections:db';
const USE_KV = Boolean(KV_URL && KV_TOKEN);
export const STORAGE = USE_KV ? 'redis' : IS_VERCEL ? 'tmp' : 'file';

async function kv(command) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!r.ok) throw new Error(`Redis request failed (${r.status})`);
  return (await r.json()).result;
}

let db = null;
async function loadDb() {
  let raw = null;
  if (USE_KV) raw = await kv(['GET', KV_KEY]);
  else raw = await readFile(DB_FILE, 'utf8').catch(() => null);
  const d = raw ? JSON.parse(raw) : {};
  d.users ??= {};
  d.orders ??= [];
  d.subscribers ??= [];
  d.meta ??= {};
  return d;
}

let writeChain = Promise.resolve();
function saveDb() {
  const snapshot = JSON.stringify(db);
  writeChain = writeChain
    .then(async () => {
      if (USE_KV) return kv(['SET', KV_KEY, snapshot]);
      await mkdir(DATA_DIR, { recursive: true });
      const tmp = DB_FILE + '.tmp';
      await writeFile(tmp, snapshot);
      await rename(tmp, DB_FILE);
    })
    .catch((e) => console.error('DB write failed', e));
  return writeChain;
}

// Shared store → re-read on every request so all serverless instances agree.
// Local file → load once and keep in memory.
async function ensureDb() {
  if (db && !USE_KV) return;
  db = await loadDb();
  let changed = false;
  if (!process.env.SESSION_SECRET && !db.meta.sessionSecret) (db.meta.sessionSecret = crypto.randomBytes(32).toString('hex')), (changed = true);
  if (!process.env.ADMIN_KEY && !db.meta.adminKey) {
    db.meta.adminKey = crypto.randomBytes(9).toString('base64url');
    console.log(`Generated admin key: ${db.meta.adminKey} (set ADMIN_KEY to choose your own)`);
    changed = true;
  }
  if (changed) await saveDb();
}
const sessionSecret = () => process.env.SESSION_SECRET || db.meta.sessionSecret;
const adminKey = () => process.env.ADMIN_KEY || db.meta.adminKey;

// ---------- helpers ----------
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const hmac = (data, key = sessionSecret()) => crypto.createHmac('sha256', key).update(data).digest();
function safeEqual(a, b) {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

function signSession(payload) {
  const body = b64u(JSON.stringify({ ...payload, exp: Date.now() + 30 * 864e5 }));
  return body + '.' + b64u(hmac(body));
}
function readSession(req) {
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/(?:^|;\s*)fier_sid=([^;]+)/);
  if (!m) return null;
  const [body, sig] = m[1].split('.');
  if (!body || !sig || !safeEqual(sig, b64u(hmac(body)))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (p.exp < Date.now()) return null;
    return db.users[p.uid] || null;
  } catch {
    return null;
  }
}
function sessionCookie(value, maxAge) {
  return `fier_sid=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${COOKIE_SECURE ? '; Secure' : ''}`;
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function send(res, status, data, headers = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': typeof data === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > 64 * 1024) throw new HttpError(413, 'Request too large');
    chunks.push(c);
  }
  if (!chunks.length) return req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

const clientIp = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'x';

const buckets = new Map();
function rateLimit(req, key, max, windowMs = 60_000) {
  const ip = clientIp(req);
  const k = key + ':' + ip;
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || b.reset < now) return void buckets.set(k, { n: 1, reset: now + windowMs });
  if (++b.n > max) throw new HttpError(429, 'Slow down, warrior — try again in a minute.');
}
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
}, 60_000).unref();

const EMAIL_RE = /^[^\s@<>]{1,64}@[^\s@<>]{1,255}\.[a-z]{2,}$/i;
const str = (v, max = 120) => String(v ?? '').trim().slice(0, max);

async function upsertUser({ sub, email, name, picture, provider }) {
  const id = provider + ':' + sub;
  const existing = db.users[id];
  db.users[id] = { id, email, name: name || email.split('@')[0], picture: picture || '', provider, createdAt: existing?.createdAt || new Date().toISOString() };
  await saveDb();
  return db.users[id];
}
const publicUser = (u) => u && { id: u.id, email: u.email, name: u.name, picture: u.picture, provider: u.provider };

// ---------- Google Sign-In ----------
async function verifyGoogleCredential(credential) {
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
  if (!r.ok) throw new HttpError(401, 'Google could not verify this sign-in.');
  const p = await r.json();
  if (p.aud !== GOOGLE_CLIENT_ID) throw new HttpError(401, 'Sign-in was issued for a different app.');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(p.iss)) throw new HttpError(401, 'Bad token issuer.');
  if (String(p.email_verified) !== 'true') throw new HttpError(401, 'Please use a verified Google email.');
  if (Number(p.exp) * 1000 < Date.now()) throw new HttpError(401, 'Sign-in expired, try again.');
  return { sub: p.sub, email: p.email, name: p.name, picture: p.picture, provider: 'google' };
}

// ---------- orders & tracking ----------
export const STAGES = [
  { key: 'confirmed', label: 'Order Confirmed', desc: 'Your vow is sealed — we have your order.' },
  { key: 'printing', label: 'DTF Printing', desc: 'Your design is being heat-fused onto the fabric.' },
  { key: 'quality', label: 'Quality Check', desc: 'Stretch test, wash test, fear test — passed.' },
  { key: 'shipped', label: 'Shipped', desc: 'Crossing the Setu with our courier partner.' },
  { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Leaping to your doorstep like Hanuman.' },
  { key: 'delivered', label: 'Delivered', desc: 'Wear it. Fear none. Burn bright.' },
];
const STAGE_KEYS = STAGES.map((s) => s.key);

function newOrderId() {
  const d = new Date();
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  let id;
  do id = `RARE-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  while (db.orders.some((o) => o.id === id));
  return id;
}

function trackingView(o, { full = false } = {}) {
  let status = o.status;
  let history = o.history || [];
  let courier = o.courier, awb = o.awb;

  if (o.status === 'pending_payment' || o.status === 'cancelled') {
    // not in the delivery pipeline
  } else if (!o.manualTracking && STEP_MIN > 0 && o.confirmedAt) {
    const start = new Date(o.confirmedAt).getTime();
    const stepMs = STEP_MIN * 60_000;
    const idx = Math.min(STAGES.length - 1, Math.floor((Date.now() - start) / stepMs));
    status = STAGES[idx].key;
    history = STAGES.slice(0, idx + 1).map((s, i) => ({ status: s.key, at: new Date(start + i * stepMs).toISOString() }));
    if (idx >= 3) {
      courier ||= 'Rare Express (demo courier)';
      awb ||= 'FX' + o.id.replace(/\W/g, '').slice(-8);
    }
  }
  const idx = STAGE_KEYS.indexOf(status);
  const view = {
    id: o.id,
    status,
    stageIndex: idx,
    stages: STAGES.map((s, i) => ({ ...s, done: idx >= i, at: history.find((h) => h.status === s.key)?.at || null })),
    eta: o.confirmedAt ? new Date(new Date(o.confirmedAt).getTime() + 5 * 864e5).toISOString() : null,
    courier: courier || null,
    awb: awb || null,
    createdAt: o.createdAt,
    city: o.address.city,
    items: o.items.map(({ productId, name, fit, size, color, colorName, qty }) => ({ productId, name, fit, size, color, colorName, qty })),
    total: o.totals.total,
    paymentMethod: o.payment.method,
    paymentStatus: o.payment.status,
  };
  if (full) Object.assign(view, { totals: o.totals, address: o.address, email: o.email });
  return view;
}

function validateItems(items) {
  if (!Array.isArray(items) || !items.length) throw new HttpError(400, 'Your cart is empty.');
  if (items.length > 40) throw new HttpError(400, 'Too many cart lines.');
  const clean = items.map((i) => {
    const p = getProduct(i.productId);
    if (!p) throw new HttpError(400, 'Unknown design in cart.');
    if (!FITS[i.fit]) throw new HttpError(400, 'Pick a fit (men / women).');
    if (!SIZES.includes(i.size)) throw new HttpError(400, 'Pick a size (S, M, L, XL).');
    if (!p.colors.includes(i.color)) throw new HttpError(400, `${p.name} isn't available in that colour.`);
    const qty = Number(i.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new HttpError(400, 'Quantity must be 1–20.');
    return { productId: p.id, name: p.name, fit: i.fit, size: i.size, color: i.color, colorName: TEE_COLORS[i.color].name, qty };
  });
  if (clean.reduce((s, i) => s + i.qty, 0) > 50) throw new HttpError(400, 'For orders over 50 tees, write to us for bulk pricing.');
  return clean;
}

function validateAddress(a = {}) {
  const addr = {
    name: str(a.name, 80), phone: str(a.phone, 15).replace(/\D/g, ''), line1: str(a.line1, 160), line2: str(a.line2, 160),
    city: str(a.city, 60), state: str(a.state, 60), pincode: str(a.pincode, 6),
  };
  if (addr.name.length < 2) throw new HttpError(400, 'Enter the receiver’s name.');
  if (!/^[6-9]\d{9}$/.test(addr.phone.slice(-10))) throw new HttpError(400, 'Enter a valid 10-digit Indian mobile number.');
  addr.phone = addr.phone.slice(-10);
  if (addr.line1.length < 5) throw new HttpError(400, 'Enter your full address.');
  if (!addr.city || !addr.state) throw new HttpError(400, 'Enter city and state.');
  if (!/^[1-9]\d{5}$/.test(addr.pincode)) throw new HttpError(400, 'Enter a valid 6-digit PIN code.');
  return addr;
}

function confirmOrder(o, note) {
  o.status = 'confirmed';
  o.confirmedAt = new Date().toISOString();
  o.history = [{ status: 'confirmed', at: o.confirmedAt, note }];
}

async function razorpayCreateOrder(order) {
  const r = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${RZP_ID}:${RZP_SECRET}`).toString('base64'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: order.totals.total * 100, currency: 'INR', receipt: order.id, notes: { fier_order: order.id } }),
  });
  if (!r.ok) {
    console.error('Razorpay order failed', r.status, await r.text());
    throw new HttpError(502, 'Payment gateway is unavailable. Try Cash on Delivery or retry shortly.');
  }
  return r.json();
}

// ---------- offers ----------
function nextMidnightIST() {
  const IST = 5.5 * 3600_000;
  const nowIst = Date.now() + IST;
  return Math.ceil(nowIst / 864e5) * 864e5 - IST;
}
function teeOfTheDay() {
  const day = Math.floor((Date.now() + 5.5 * 3600_000) / 864e5);
  return PRODUCTS[day % PRODUCTS.length].id;
}

const spinLog = new Map();

// ---------- routes ----------
const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern, handler });

route('GET', /^\/api\/config$/, () => ({
  googleClientId: GOOGLE_CLIENT_ID,
  demoLogin: ALLOW_DEMO_LOGIN,
  razorpayKeyId: RAZORPAY_ON ? RZP_ID : '',
  paymentMethods: [...(RAZORPAY_ON ? ['razorpay'] : ['demo']), 'cod'],
  trackingStepMinutes: STEP_MIN,
}));

route('GET', /^\/api\/offers$/, () => ({
  ticker: TICKER,
  teeOfTheDay: teeOfTheDay(),
  flash: { code: 'BURNBRIGHT20', endsAt: nextMidnightIST(), label: '20% off orders of ₹1,299+' },
}));

route('GET', /^\/api\/me$/, ({ user }) => ({ user: publicUser(user) }));

route('POST', /^\/api\/auth\/google$/, async ({ req, res }) => {
  rateLimit(req, 'auth', 20);
  if (!GOOGLE_CLIENT_ID) throw new HttpError(400, 'Google Sign-In is not configured on this server.');
  const { credential } = await readJson(req);
  if (!credential) throw new HttpError(400, 'Missing Google credential.');
  const user = await upsertUser(await verifyGoogleCredential(credential));
  res.setHeader('Set-Cookie', sessionCookie(signSession({ uid: user.id }), 30 * 86400));
  return { user: publicUser(user) };
});

route('POST', /^\/api\/auth\/demo$/, async ({ req, res }) => {
  rateLimit(req, 'auth', 20);
  if (!ALLOW_DEMO_LOGIN) throw new HttpError(403, 'Demo login is disabled. Please sign in with Google.');
  const body = await readJson(req);
  const email = str(body.email, 200).toLowerCase();
  if (!/^[a-z0-9._%+-]+@gmail\.com$/.test(email)) throw new HttpError(400, 'Use a @gmail.com address.');
  const user = await upsertUser({ sub: email, email, name: str(body.name, 60) || email.split('@')[0], provider: 'demo' });
  res.setHeader('Set-Cookie', sessionCookie(signSession({ uid: user.id }), 30 * 86400));
  return { user: publicUser(user) };
});

route('POST', /^\/api\/auth\/logout$/, ({ res }) => {
  res.setHeader('Set-Cookie', sessionCookie('', 0));
  return { ok: true };
});

route('POST', /^\/api\/cart\/quote$/, async ({ req }) => {
  const { items, coupon } = await readJson(req);
  return computeTotals(validateItems(items), coupon);
});

route('POST', /^\/api\/orders$/, async ({ req, user }) => {
  if (!user) throw new HttpError(401, 'Please log in with Gmail to check out.');
  rateLimit(req, 'order', 15);
  const body = await readJson(req);
  const items = validateItems(body.items);
  const address = validateAddress(body.address);
  const totals = computeTotals(items, body.coupon);
  if (totals.couponError) throw new HttpError(400, totals.couponError);
  const method = body.paymentMethod;
  const allowed = [...(RAZORPAY_ON ? ['razorpay'] : ['demo']), 'cod'];
  if (!allowed.includes(method)) throw new HttpError(400, 'Choose a payment method.');

  const order = {
    id: newOrderId(),
    userId: user.id,
    email: user.email,
    items,
    totals,
    address,
    payment: { method, status: method === 'cod' ? 'cod_pending' : 'pending' },
    status: 'pending_payment',
    history: [],
    createdAt: new Date().toISOString(),
  };
  if (method === 'cod') confirmOrder(order, 'Cash on delivery');
  let razorpay = null;
  if (method === 'razorpay') {
    const rz = await razorpayCreateOrder(order);
    order.payment.razorpayOrderId = rz.id;
    razorpay = { keyId: RZP_ID, orderId: rz.id, amount: rz.amount, currency: rz.currency };
  }
  db.orders.push(order);
  await saveDb();
  return { order: trackingView(order, { full: true }), razorpay };
});

route('POST', /^\/api\/orders\/([\w-]+)\/pay$/, async ({ req, user, params }) => {
  if (!user) throw new HttpError(401, 'Please log in.');
  const o = db.orders.find((x) => x.id === params[0] && x.userId === user.id);
  if (!o) throw new HttpError(404, 'Order not found.');
  if (o.payment.status === 'paid') return { order: trackingView(o, { full: true }) };
  const body = await readJson(req);
  if (o.payment.method === 'razorpay') {
    const { razorpay_payment_id: pid, razorpay_order_id: oid, razorpay_signature: sig } = body;
    const expected = crypto.createHmac('sha256', RZP_SECRET).update(`${oid}|${pid}`).digest('hex');
    if (!pid || oid !== o.payment.razorpayOrderId || !safeEqual(sig || '', expected)) throw new HttpError(400, 'Payment signature mismatch.');
    o.payment.paymentId = pid;
  } else if (o.payment.method === 'demo') {
    if (RAZORPAY_ON) throw new HttpError(400, 'Demo payments are disabled.');
    o.payment.paymentId = 'DEMO-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  } else throw new HttpError(400, 'Nothing to pay for this order.');
  o.payment.status = 'paid';
  o.payment.paidAt = new Date().toISOString();
  confirmOrder(o, 'Payment received');
  await saveDb();
  return { order: trackingView(o, { full: true }) };
});

route('GET', /^\/api\/orders$/, ({ user }) => {
  if (!user) throw new HttpError(401, 'Please log in.');
  return { orders: db.orders.filter((o) => o.userId === user.id).reverse().map((o) => trackingView(o, { full: true })) };
});

route('GET', /^\/api\/track$/, ({ req, url, user }) => {
  rateLimit(req, 'track', 40);
  const id = str(url.searchParams.get('order'), 40).toUpperCase();
  const pin = str(url.searchParams.get('pincode'), 6);
  const o = db.orders.find((x) => x.id === id);
  const mine = o && user && o.userId === user.id;
  if (!o || (!mine && o.address.pincode !== pin)) throw new HttpError(404, 'No order matches that ID and PIN code.');
  return { order: trackingView(o) };
});

route('POST', /^\/api\/subscribe$/, async ({ req }) => {
  rateLimit(req, 'subscribe', 10);
  const { email, name } = await readJson(req);
  const e = str(email, 200).toLowerCase();
  if (!EMAIL_RE.test(e)) throw new HttpError(400, 'That email doesn’t look right.');
  const already = db.subscribers.some((s) => s.email === e);
  if (!already) {
    db.subscribers.push({ email: e, name: str(name, 60), at: new Date().toISOString() });
    await saveDb();
  }
  return { ok: true, already, code: 'FEARNONE10' };
});

route('POST', /^\/api\/spin$/, ({ req }) => {
  const key = clientIp(req) + ':' + new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  const prev = spinLog.get(key) || 0;
  if (prev >= 3) throw new HttpError(429, 'The Agni Chakra rests until midnight. Come back tomorrow!');
  spinLog.set(key, prev + 1);
  if (spinLog.size > 50_000) spinLog.clear();
  const total = SPIN_REWARDS.reduce((s, r) => s + r.weight, 0);
  let roll = crypto.randomInt(total);
  const index = SPIN_REWARDS.findIndex((r) => (roll -= r.weight) < 0);
  return { index, reward: SPIN_REWARDS[index] };
});

// ----- admin -----
function requireAdmin(req) {
  if (!safeEqual(req.headers['x-admin-key'] || '', adminKey())) throw new HttpError(401, 'Wrong admin key.');
}
route('GET', /^\/api\/admin\/orders$/, ({ req }) => {
  requireAdmin(req);
  return { orders: db.orders.slice().reverse().map((o) => ({ ...trackingView(o, { full: true }), manualTracking: !!o.manualTracking })), stages: STAGES };
});
route('POST', /^\/api\/admin\/orders\/([\w-]+)$/, async ({ req, params }) => {
  requireAdmin(req);
  const o = db.orders.find((x) => x.id === params[0]);
  if (!o) throw new HttpError(404, 'Order not found.');
  const body = await readJson(req);
  if (body.status) {
    if (![...STAGE_KEYS, 'cancelled'].includes(body.status)) throw new HttpError(400, 'Unknown status.');
    const current = trackingView(o);
    o.manualTracking = true;
    o.confirmedAt ||= new Date().toISOString();
    o.history = current.stages.filter((s) => s.done && s.at).map((s) => ({ status: s.key, at: s.at }));
    o.history = o.history.filter((h) => STAGE_KEYS.indexOf(h.status) < STAGE_KEYS.indexOf(body.status));
    o.history.push({ status: body.status, at: new Date().toISOString() });
    o.status = body.status;
    if (o.payment.method === 'cod' && body.status === 'delivered') o.payment.status = 'paid';
  }
  if (body.courier !== undefined) o.courier = str(body.courier, 60);
  if (body.awb !== undefined) o.awb = str(body.awb, 40);
  await saveDb();
  return { order: trackingView(o, { full: true }) };
});
route('GET', /^\/api\/admin\/subscribers$/, ({ req }) => {
  requireAdmin(req);
  return { subscribers: db.subscribers };
});
route('GET', /^\/api\/print\/([\w-]+)\.svg$/, ({ url, params, res }) => {
  const side = url.searchParams.get('side') === 'back' ? 'back' : 'front';
  const svg = printFileSVG(params[0], url.searchParams.get('color') || 'black', side);
  if (!svg) throw new HttpError(404, 'Unknown design.');
  res.writeHead(200, {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Content-Disposition': `attachment; filename="RareCollections-${params[0]}-${side}-${url.searchParams.get('color') || 'black'}-DTF.svg"`,
  });
  res.end(svg);
});

// ---------- static files ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
};
async function serveStatic(pathname, res, status = 200) {
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/admin') pathname = '/admin.html';
  const file = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(pathname)));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return false;
  try {
    const data = await readFile(file);
    res.writeHead(status, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': file.endsWith('.html') ? 'no-cache' : 'public, max-age=300',
    });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  // Google Sign-In popups need same-origin-allow-popups
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
};

// Request handler shared by the local Node server and the Vercel function (api/index.js).
export async function handler(req, res) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      await ensureDb();
      // CSRF guard: state-changing API calls must come from our own pages (JSON + same origin)
      if (req.method === 'POST') {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== (req.headers['x-forwarded-host'] || req.headers.host)) throw new HttpError(403, 'Cross-site request blocked.');
        if (!String(req.headers['content-type'] || '').includes('application/json')) throw new HttpError(415, 'Send JSON.');
      }
      for (const r of routes) {
        const m = r.method === req.method && url.pathname.match(r.pattern);
        if (!m) continue;
        const result = await r.handler({ req, res, url, params: m.slice(1), user: readSession(req) });
        if (!res.headersSent) send(res, 200, result);
        return;
      }
      throw new HttpError(404, 'Not found');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed');
    if (!(await serveStatic(url.pathname, res))) {
      if (!(await serveStatic('/404.html', res, 404))) send(res, 404, 'Not found');
    }
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) send(res, status, { error: status === 500 ? 'Something broke on our side. Try again.' : e.message });
  }
}

export const server = http.createServer(handler);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureDb().then(() => server.listen(PORT, () => {
    console.log(`\n✦ Rare Collections by Sathish is live at http://localhost:${PORT}`);
    console.log(`   Google login: ${GOOGLE_CLIENT_ID ? 'ON' : 'not configured'} · demo login: ${ALLOW_DEMO_LOGIN ? 'ON' : 'off'}`);
    console.log(`   Payments: ${RAZORPAY_ON ? 'Razorpay' : 'demo pay (set RAZORPAY_KEY_ID/SECRET for real payments)'} + COD`);
    console.log(`   Storage: ${STORAGE === 'redis' ? 'Redis' : DB_FILE}`);
    console.log(`   Admin: http://localhost:${PORT}/admin  key: ${process.env.ADMIN_KEY ? '(from ADMIN_KEY)' : adminKey()}\n`);
  }));
}

import { PRODUCTS, SIZES, FITS, TEE_COLORS, SIZE_CHART, getProduct } from './catalog.js';
import { BUNDLES, UNIT_PRICE, SPIN_REWARDS, TICKER, computeTotals, inr } from './pricing.js';
import { teeSVG } from './tee.js';
import { Boutique } from './store.js';
import { foldedSVG } from './tee.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data;
}

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2800);
}

async function copy(text, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${label}: ${text}`);
  } catch {
    toast(text);
  }
}

// ---------------- state ----------------
const state = {
  config: { paymentMethods: ['demo', 'cod'] },
  user: null,
  cart: JSON.parse(localStorage.getItem('fier_cart') || '[]').filter((i) => getProduct(i.productId)),
  coupon: localStorage.getItem('fier_coupon') || '',
  totd: null,
};
const saveCart = () => {
  localStorage.setItem('fier_cart', JSON.stringify(state.cart));
  localStorage.setItem('fier_coupon', state.coupon);
};

// ---------------- ticker ----------------
function renderTicker(items) {
  const html = items.map((t) => `<span>${esc(t)}</span>`).join('');
  $('#tickerTrack').innerHTML = html + html; // duplicated for a seamless loop
}

// ---------------- flash countdown ----------------
function startCountdown(endsAt) {
  const el = $('#flashTimer');
  const tick = () => {
    let ms = endsAt - Date.now();
    if (ms <= 0) endsAt += 864e5, (ms = endsAt - Date.now());
    const h = Math.floor(ms / 36e5), m = Math.floor((ms % 36e5) / 6e4), s = Math.floor((ms % 6e4) / 1e3);
    el.textContent = [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  };
  tick();
  setInterval(tick, 1000);
}

// ---------------- virtual boutique + product panel ----------------
let shop;
const pdpSel = { size: null };
const HINTS = {
  intro: 'Click the rail to browse the collection',
  store: 'Click the rail, or scroll, to browse the collection',
  rail: 'Drag, scroll or use ← → to browse. Click a tee to view it.',
  focus: 'Pick your size and make it yours',
  shelves: 'Bundles: mix any designs. Click a shelf.',
  gallery: 'Click the portrait to read Sathish’s story',
};

function buildBoutique() {
  shop = new Boutique({
    viewport: $('#viewport'),
    camera: $('#camera'),
    room: $('#room'),
    onView: (v) => {
      $('#store').dataset.view = v;
      $('#storeHint').textContent = HINTS[v] || '';
      $$('#pills [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === v || (v === 'focus' && b.dataset.view === 'rail')));
      const pdp = $('#pdp');
      const open = v === 'focus';
      pdp.classList.toggle('open', open);
      pdp.setAttribute('aria-hidden', String(!open));
    },
    onFocus: (i) => renderPDP(i),
    onBlur: () => {},
    onBundle: (qty) => {
      toast(`${BUNDLES[qty - 1].name}: any ${qty} tee${qty > 1 ? 's' : ''} for ${inr(BUNDLES[qty - 1].price)}. Mix designs freely!`);
      shop.setView('rail');
    },
    onFounder: () => $('#story').scrollIntoView({ behavior: 'smooth' }),
  });
  $$('#pills [data-view]').forEach((b) => (b.onclick = () => shop.setView(b.dataset.view)));
  $('#railPrev').onclick = () => shop.step(-1);
  $('#railNext').onclick = () => shop.step(1);
  $('#pdpClose').onclick = () => shop.setView('rail');

  $('#pdpBody').addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const i = shop.focusIndex;
    if (i < 0) return;
    const p = PRODUCTS[i];
    if (t.dataset.color) {
      shop.restyle(i, { color: t.dataset.color });
      renderPDP(i);
    } else if (t.dataset.fit) {
      shop.restyle(i, { fit: t.dataset.fit });
      renderPDP(i);
    } else if (t.dataset.size) {
      pdpSel.size = t.dataset.size;
      renderPDP(i);
    } else if (t.id === 'pdpFlip') {
      const back = shop.flip(i);
      t.textContent = back ? 'View front' : 'View back';
    } else if (t.id === 'pdpAdd' || t.id === 'pdpBuy') {
      if (!pdpSel.size) {
        $('#pdpSizeErr').textContent = 'Select a size first';
        $('.sizes', $('#pdpBody')).animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 });
        return;
      }
      addToCart({ productId: p.id, fit: shop.fits[i], color: shop.colors[i], size: pdpSel.size, qty: 1 });
      if (t.id === 'pdpBuy') return openCheckout();
      t.classList.add('added');
      t.textContent = 'Added to bag ✓';
      $('#pdpViewBag').hidden = false;
      toast(`${p.name} (${shop.fits[i] === 'women' ? 'Women' : 'Men'} · ${pdpSel.size}) added to your bag`);
      setTimeout(() => {
        t.classList.remove('added');
        t.textContent = `Add to bag · ${inr(UNIT_PRICE)}`;
      }, 1800);
    } else if (t.id === 'pdpViewBag') $('#cartBtn').click();
    else if (t.id === 'pdpSize') $('#sizeGuideOpen').click();
    else if (t.dataset.nav) shop.focus(i + Number(t.dataset.nav));
  });
}

function renderPDP(i) {
  const p = PRODUCTS[i];
  const color = shop.colors[i], fit = shop.fits[i];
  const prevScroll = $('#pdpBody .pdp-scroll')?.scrollTop || 0;
  // Two parts: details scroll; size + "Add to bag" are pinned to the bottom so they are
  // always visible, even when the panel is a short bottom sheet on phones.
  $('#pdpBody').innerHTML = `
  <div class="pdp-scroll">
    <p class="pdp-cat">Rare Tee · No. ${String(p.no).padStart(2, '0')} / ${String(PRODUCTS.length).padStart(2, '0')}</p>
    <h2>${esc(p.name)} <span class="deva">${esc(p.deva)}</span></h2>
    <p class="tagline">${esc(p.tagline)}</p>
    <div class="pdp-price"><b>${inr(UNIT_PRICE)}</b><span>or any 2 for ₹899 · 4 for ₹1,599</span></div>
    <span class="ltd">Limited edition · 150 pieces${state.totd === p.id ? ' · Tee of the day' : ''}</span>
    <div class="opt"><div class="opt-label"><span>Colour <em>${TEE_COLORS[color].name}</em></span><button class="link" id="pdpFlip">${shop.garments[i].classList.contains('flipped') ? 'View front' : 'View back'}</button></div>
      <div class="swatches" role="radiogroup" aria-label="Colour">${p.colors.map((k) => `<button role="radio" aria-checked="${k === color}" aria-label="${TEE_COLORS[k].name}" title="${TEE_COLORS[k].name}" data-color="${k}" style="--sw:${TEE_COLORS[k].hex}"></button>`).join('')}</div></div>
    <div class="opt"><div class="opt-label">Fit</div>
      <div class="seg" role="radiogroup" aria-label="Fit">${Object.entries(FITS).map(([k, f]) => `<button role="radio" aria-checked="${k === fit}" data-fit="${k}">${f.label}<small>${f.sub}</small></button>`).join('')}</div></div>
    <p class="pdp-story">${esc(p.story)}</p>
    <ul class="pdp-specs"><li>DTF print: vivid, soft-hand, stretch-safe</li><li>Premium combed cotton, ${fit === 'women' ? 'fitted women’s cut' : 'regular men’s fit'}</li><li>Free shipping on ₹799+ · COD available</li><li>7-day size exchange</li></ul>
    <div class="pdp-nav"><button data-nav="-1">← ${esc(PRODUCTS[(i + PRODUCTS.length - 1) % PRODUCTS.length].name)}</button><button data-nav="1">${esc(PRODUCTS[(i + 1) % PRODUCTS.length].name)} →</button></div>
  </div>
  <div class="pdp-buy">
    <div class="opt-label">Select size <span><button class="link" id="pdpSize">Size guide</button> <button class="view-cart" id="pdpViewBag" hidden>View bag →</button></span></div>
    <div class="sizes" role="radiogroup" aria-label="Size">${SIZES.map((z) => `<button role="radio" aria-checked="${pdpSel.size === z}" data-size="${z}">${z}</button>`).join('')}</div>
    <p class="err" id="pdpSizeErr"></p>
    <div class="pdp-actions">
      <button class="btn primary lg grow" id="pdpAdd">Add to bag · ${inr(UNIT_PRICE)}</button>
      <button class="btn ghost lg" id="pdpBuy">Buy now</button>
    </div>
  </div>`;
  $('#pdpBody .pdp-scroll').scrollTop = prevScroll;
}

function openSizeGuide() {
  $('#sizeTable').innerHTML = Object.entries(SIZE_CHART)
    .map(([fit, rows]) => `<h4>${FITS[fit].label} · ${FITS[fit].sub}</h4><table><tr><th>Size</th><th>Chest</th><th>Length</th></tr>${Object.entries(rows).map(([z, [c, l]]) => `<tr><td>${z}</td><td>${c}"</td><td>${l}"</td></tr>`).join('')}</table>`)
    .join('');
  $('#sizeModal').showModal();
}

function renderMarquee() {
  const words = ['Fear none', 'Rare Collections', 'Burn bright', 'by Sathish', 'Limited to 150 pieces', 'Drop 01 · Ramayana'];
  const html = words.map((w) => `<span>${esc(w)}</span>`).join('');
  $('#marquee').innerHTML = html + html + html;
}

// ---------------- cart ----------------
const lineKey = (i) => `${i.productId}|${i.fit}|${i.color}|${i.size}`;
function addToCart(sel) {
  const key = lineKey(sel);
  const line = state.cart.find((i) => lineKey(i) === key);
  if (line) line.qty = Math.min(20, line.qty + sel.qty);
  else state.cart.push({ productId: sel.productId, fit: sel.fit, color: sel.color, size: sel.size, qty: sel.qty });
  saveCart();
  renderCart();
  const b = $('#cartBtn');
  b.classList.remove('bump');
  void b.offsetWidth;
  b.classList.add('bump');
}

function totalsRows(t, { withCoupon = true } = {}) {
  return `
    <div class="sum-row"><span>${t.qty} tee${t.qty === 1 ? '' : 's'} @ ${inr(UNIT_PRICE)}</span><span>${inr(t.mrp)}</span></div>
    ${t.bundleSavings ? `<div class="sum-row save"><span>${t.bundleName} bundle</span><span>−${inr(t.bundleSavings)}</span></div>` : ''}
    ${withCoupon && t.discount ? `<div class="sum-row save"><span>Code ${esc(t.coupon.code)}</span><span>−${inr(t.discount)}</span></div>` : ''}
    <div class="sum-row"><span>Shipping${withCoupon && t.coupon?.code === 'FREESHIP' ? ' (FREESHIP)' : ''}</span><span>${t.shipping ? inr(t.shipping) : 'FREE'}</span></div>
    <div class="sum-row total"><span>Total</span><span>${inr(t.total)}</span></div>`;
}

function renderCart() {
  const count = state.cart.reduce((s, i) => s + i.qty, 0);
  $('#cartCount').textContent = count;
  const t = computeTotals(state.cart, state.coupon);

  // bundle meter
  const pct = Math.min(100, (count / 4) * 100);
  $('#bundleMeter').innerHTML = count
    ? `${count >= 4 ? `<b>Squad unlocked.</b> Every extra tee is just ₹399.` : `Add <b>1 more</b> tee for just <b>${inr(t.next.extra)}</b> to unlock the <b>${t.next.name}</b> bundle (save ${inr(t.next.totalSave)})`}<div class="meter"><span style="width:${pct}%"></span></div>`
    : `Bundle any 2 for ₹899 · 3 for ₹1,299 · 4 for ₹1,599<div class="meter"><span style="width:0"></span></div>`;

  if (!state.cart.length) {
    $('#cartItems').innerHTML = `<div class="cart-empty"><div class="big">Your bag is empty.</div><p>Rare things don’t wait long on the rail.</p><button class="btn primary" data-goto="#store">Visit the boutique</button></div>`;
    $('#cartSummary').innerHTML = '';
    return;
  }
  $('#cartItems').innerHTML = state.cart
    .map((i, idx) => {
      const p = getProduct(i.productId);
      return `<div class="ci" style="--p1:${p.palette[0]}">
        <div class="thumb">${teeSVG({ product: p, color: i.color, fit: i.fit, detail: 'low' })}</div>
        <div><h5>${esc(p.name)}</h5><div class="sub">${FITS[i.fit].label} · ${i.size} · ${TEE_COLORS[i.color].name}</div>
          <div class="qty"><button data-dec="${idx}" aria-label="Decrease">−</button><output>${i.qty}</output><button data-inc="${idx}" aria-label="Increase">+</button></div></div>
        <div style="text-align:right"><div>${inr(UNIT_PRICE * i.qty)}</div><button class="rm" data-rm="${idx}">Remove</button></div>
      </div>`;
    })
    .join('');
  $('#cartSummary').innerHTML = `${totalsRows(t)}
    ${t.coupon ? `<p class="coupon-msg ok">✓ ${esc(t.coupon.label)} applied</p>` : state.coupon && t.couponError ? `<p class="coupon-msg bad">${esc(t.couponError)}</p>` : ''}
    <button class="btn primary full lg" id="toCheckout" style="margin-top:12px">Checkout · ${inr(t.total)}</button>`;
  $('#toCheckout').onclick = openCheckout;
}

function bindCart() {
  const drawer = $('#cartDrawer'), scrim = $('#scrim');
  const open = () => { drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); scrim.hidden = false; };
  const close = () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); scrim.hidden = true; };
  state.closeCart = close;
  $('#cartBtn').onclick = open;
  scrim.onclick = close;
  $('[data-close]', drawer).onclick = close;
  addEventListener('keydown', (e) => e.key === 'Escape' && close());
  $('#cartItems').onclick = (e) => {
    const t = e.target;
    if (t.dataset.inc) state.cart[t.dataset.inc].qty = Math.min(20, state.cart[t.dataset.inc].qty + 1);
    else if (t.dataset.dec) {
      const l = state.cart[t.dataset.dec];
      if (--l.qty < 1) state.cart.splice(t.dataset.dec, 1);
    } else if (t.dataset.rm) state.cart.splice(t.dataset.rm, 1);
    else if (t.dataset.goto) { close(); $(t.dataset.goto).scrollIntoView({ behavior: 'smooth' }); return; }
    else return;
    saveCart();
    renderCart();
  };
}

// ---------------- bundles ----------------
function renderBundles() {
  $('#bundleGrid').innerHTML = BUNDLES.map((b) => {
    const mrp = b.qty * UNIT_PRICE;
    const hot = b.qty === 4;
    const stack = Array.from({ length: b.qty }, (_, j) => {
      const p = PRODUCTS[(j * 3 + b.qty) % PRODUCTS.length];
      return `<div class="fold" style="--j:${j}">${foldedSVG({ product: p, color: p.colors[0] })}</div>`;
    }).join('');
    return `<div class="bundle ${hot ? 'hot' : ''}">
      ${hot ? '<span class="ribbon">Best value</span>' : b.qty === 2 ? '<span class="ribbon">Most loved</span>' : ''}
      <div class="b-art"><div class="b-stack">${stack}</div></div>
      <h3>${b.name}</h3>
      <div class="bp"><b>${inr(b.price)}</b>${b.qty > 1 ? `<s>${inr(mrp)}</s>` : ''}</div>
      <div class="per">${b.qty > 1 ? `${inr(b.price / b.qty)} per tee · save ${inr(mrp - b.price)}` : 'per tee'}</div>
      <p>${esc(b.blurb)}</p>
      <button class="btn ${hot ? 'light' : 'primary'} full" data-shop="${b.qty}">Build your ${b.name}</button>
    </div>`;
  }).join('');
  $('#bundleGrid').onclick = (e) => {
    const b = e.target.closest('[data-shop]');
    if (!b) return;
    $('#store').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => shop.setView('rail'), 500);
    toast(`Pick any ${b.dataset.shop} tee${b.dataset.shop > 1 ? 's' : ''}. The bundle price applies in your bag.`);
  };
}

// ---------------- spin wheel ----------------
function buildWheel() {
  const n = SPIN_REWARDS.length, R = 150, seg = 360 / n;
  const pt = (deg, r) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [Math.cos(a) * r, Math.sin(a) * r].map((v) => v.toFixed(2)).join(',');
  };
  const ink = (hex) => (['#e9dcc4', '#e3c98f', '#b8924f'].includes(hex) ? '#1d1611' : '#fff');
  let svg = `<circle r="${R + 10}" fill="#1d1611"/><circle r="${R + 6}" fill="none" stroke="#b8924f" stroke-width="3"/>`;
  SPIN_REWARDS.forEach((r, i) => {
    const a0 = i * seg, a1 = a0 + seg, mid = a0 + seg / 2;
    svg += `<path d="M0,0 L${pt(a0, R)} A${R},${R} 0 0 1 ${pt(a1, R)}Z" fill="${r.color}" stroke="#1d1611" stroke-width="1.5"/>`;
    svg += `<text transform="rotate(${mid}) translate(0 ${-R + 26})" text-anchor="middle" font-family="Fraunces, Georgia" font-weight="900" font-size="19" fill="${ink(r.color)}">${esc(r.label.split(' ')[0])}</text>`;
    svg += `<text transform="rotate(${mid}) translate(0 ${-R + 46})" text-anchor="middle" font-family="Manrope" font-weight="800" font-size="10" letter-spacing="1" fill="${ink(r.color)}" opacity=".85">${esc(r.label.split(' ').slice(1).join(' '))}</text>`;
  });
  for (let i = 0; i < n; i++) svg += `<circle cx="${pt(i * seg, R + 1).split(',')[0]}" cy="${pt(i * seg, R + 1).split(',')[1]}" r="3.5" fill="#e3c98f"/>`;
  svg += `<circle r="38" fill="#1d1611" stroke="#b8924f" stroke-width="3"/><text y="9" text-anchor="middle" font-family="Fraunces, Georgia" font-weight="900" font-size="24" fill="#e3c98f">Rare</text>`;
  $('#wheel').innerHTML = svg;

  let rotation = 0;
  const today = new Date().toISOString().slice(0, 10);
  const prev = JSON.parse(localStorage.getItem('fier_spin') || 'null');
  if (prev?.day === today) {
    $('#spinBtn').disabled = true;
    $('#spinBtn').textContent = 'Come back tomorrow';
    $('#spinResult').innerHTML = `Today’s win: <b>${esc(prev.label)}</b> — code <button class="code" data-copy="${esc(prev.code)}">${esc(prev.code)}</button>`;
  }
  $('#spinBtn').onclick = async () => {
    const btn = $('#spinBtn');
    btn.disabled = true;
    try {
      const { index, reward } = await api('/api/spin', { method: 'POST' });
      const target = 360 - (index * seg + seg / 2);
      rotation += 360 * 6 + ((target - (rotation % 360)) + 360) % 360;
      $('#wheel').style.transform = `rotate(${rotation}deg)`;
      setTimeout(() => {
        localStorage.setItem('fier_spin', JSON.stringify({ day: today, code: reward.code, label: reward.label }));
        state.coupon = reward.code;
        saveCart();
        renderCart();
        $('#spinResult').innerHTML = `You won <b>${esc(reward.label)}</b>. Code <button class="code" data-copy="${esc(reward.code)}">${esc(reward.code)}</button> is now in your bag.`;
        btn.textContent = 'Come back tomorrow';
        burst($('#spinResult'));
      }, 5100);
    } catch (e) {
      toast(e.message);
      btn.disabled = false;
    }
  };
}

// small emoji burst for celebrations
function burst(anchor) {
  const r = anchor.getBoundingClientRect();
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('span');
    s.textContent = ['✦', '✧', '✦', '❋'][i % 4];
    s.style.color = ['#d2552f', '#b8924f', '#1d1611', '#c69c6d'][i % 4];
    Object.assign(s.style, { position: 'fixed', left: r.left + r.width / 2 + 'px', top: r.top + 'px', fontSize: '22px', pointerEvents: 'none', zIndex: 70, transition: 'transform 1.2s cubic-bezier(.2,.8,.2,1), opacity 1.2s' });
    document.body.appendChild(s);
    requestAnimationFrame(() => {
      const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 140;
      s.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d - 60}px) rotate(${Math.random() * 360}deg)`;
      s.style.opacity = '0';
    });
    setTimeout(() => s.remove(), 1300);
  }
}

// ---------------- auth ----------------
function renderAccount() {
  const btn = $('#accountBtn');
  if (state.user) {
    const u = state.user;
    const avatar = u.picture ? `<img class="avatar" src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer"/>` : `<span class="avatar">${esc(u.name[0]?.toUpperCase() || 'F')}</span>`;
    btn.innerHTML = `${avatar}<span class="label-long">${esc(u.name.split(' ')[0])}</span>`;
    btn.title = 'My orders';
  } else {
    btn.innerHTML = `<span>Login</span><span class="label-long">with Gmail</span>`;
    btn.title = '';
  }
  renderQuickOrders();
}

let googleReady = null;
function loadGoogle() {
  if (googleReady) return googleReady;
  googleReady = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => {
      google.accounts.id.initialize({
        client_id: state.config.googleClientId,
        callback: async ({ credential }) => {
          try {
            const { user } = await api('/api/auth/google', { method: 'POST', body: { credential } });
            onLogin(user);
          } catch (e) {
            $('#loginErr').textContent = e.message;
          }
        },
      });
      resolve();
    };
    s.onerror = () => reject(new Error('Could not load Google Sign-In'));
    document.head.appendChild(s);
  });
  return googleReady;
}

let afterLogin = null;
function openLogin(then) {
  afterLogin = then || null;
  $('#loginErr').textContent = '';
  const m = $('#loginModal');
  m.showModal();
  if (state.config.googleClientId) {
    loadGoogle()
      .then(() => google.accounts.id.renderButton($('#googleBtn'), { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', width: 300 }))
      .catch((e) => ($('#loginErr').textContent = e.message));
  } else {
    $('#googleBtn').hidden = true;
  }
  $('#demoLogin').hidden = !state.config.demoLogin;
}

function onLogin(user) {
  state.user = user;
  $('#loginModal').close();
  renderAccount();
  toast(`Welcome, ${user.name.split(' ')[0]}. Fear none.`);
  const fn = afterLogin;
  afterLogin = null;
  fn?.();
}

function bindAuth() {
  $('#accountBtn').onclick = () => (state.user ? openOrders() : openLogin());
  $('#demoLogin').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const { user } = await api('/api/auth/demo', { method: 'POST', body: { name: f.get('name'), email: f.get('email') } });
      onLogin(user);
    } catch (err) {
      $('#loginErr').textContent = err.message;
    }
  };
}

// ---------------- checkout ----------------
function openCheckout() {
  if (!state.cart.length) return toast('Your cart is empty — pick a tee first!');
  if (!state.user) return openLogin(openCheckout);
  state.closeCart?.();
  const f = $('#checkoutForm');
  const saved = JSON.parse(localStorage.getItem('fier_addr') || '{}');
  for (const [k, v] of Object.entries(saved)) if (f.elements[k] && !f.elements[k].value) f.elements[k].value = v;
  if (!f.elements.name.value) f.elements.name.value = state.user.name;
  const labels = {
    razorpay: ['UPI · Cards · Netbanking', 'Secure payment via Razorpay'],
    demo: ['UPI (demo)', 'Prototype payment simulation — no money moves'],
    cod: ['Cash on Delivery', 'Pay when your tee arrives'],
  };
  $('#payMethods').innerHTML = state.config.paymentMethods
    .map((m, i) => `<label><input type="radio" name="pay" value="${m}" ${i === 0 ? 'checked' : ''}/><span><b>${labels[m][0]}</b><small>${labels[m][1]}</small></span></label>`)
    .join('');
  $('#couponInput').value = state.coupon;
  $('#checkoutErr').textContent = '';
  renderCheckoutSummary();
  $('#checkoutModal').showModal();
}

function renderCheckoutSummary() {
  const t = computeTotals(state.cart, state.coupon);
  $('#coItems').innerHTML = state.cart
    .map((i) => `<div><span>${i.qty} × ${esc(getProduct(i.productId).name)} <small>(${FITS[i.fit].label[0]} · ${i.size} · ${TEE_COLORS[i.color].name})</small></span><span>${inr(UNIT_PRICE * i.qty)}</span></div>`)
    .join('');
  $('#coTotals').innerHTML = totalsRows(t);
  const msg = $('#couponMsg');
  msg.className = 'coupon-msg ' + (t.coupon ? 'ok' : t.couponError ? 'bad' : '');
  msg.textContent = t.coupon ? `✓ ${t.coupon.label}` : t.couponError || '';
  $('#placeOrder').textContent = `Place order · ${inr(t.total)}`;
}

function bindCheckout() {
  $('#applyCoupon').onclick = () => {
    state.coupon = $('#couponInput').value.trim().toUpperCase();
    saveCart();
    renderCheckoutSummary();
    renderCart();
  };
  $('#couponInput').onkeydown = (e) => e.key === 'Enter' && (e.preventDefault(), $('#applyCoupon').click());

  $('#checkoutForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const address = Object.fromEntries(['name', 'phone', 'line1', 'line2', 'city', 'state', 'pincode'].map((k) => [k, f[k].value.trim()]));
    localStorage.setItem('fier_addr', JSON.stringify(address));
    const t = computeTotals(state.cart, state.coupon);
    const coupon = t.coupon ? state.coupon : '';
    const btn = $('#placeOrder');
    btn.disabled = true;
    $('#checkoutErr').textContent = '';
    try {
      const { order, razorpay } = await api('/api/orders', {
        method: 'POST',
        body: { items: state.cart, address, coupon, paymentMethod: f.pay.value },
      });
      if (f.pay.value === 'cod') return orderDone(order);
      if (f.pay.value === 'demo') return demoPay(order);
      if (razorpay) return razorpayPay(order, razorpay, address);
    } catch (err) {
      $('#checkoutErr').textContent = err.message;
      if (err.status === 401) openLogin(openCheckout);
    } finally {
      btn.disabled = false;
    }
  };
}

function demoPay(order) {
  const m = $('#demoPayModal');
  $('#demoPayAmt').textContent = inr(order.total);
  m.showModal();
  $('#demoPayOk').onclick = async () => {
    try {
      const { order: paid } = await api(`/api/orders/${order.id}/pay`, { method: 'POST', body: {} });
      m.close();
      orderDone(paid);
    } catch (e) {
      toast(e.message);
    }
  };
  $('#demoPayCancel').onclick = () => {
    m.close();
    $('#checkoutErr').textContent = `Payment cancelled. Order ${order.id} is saved — retry from “My orders”.`;
  };
}

function loadScript(src) {
  return new Promise((res, rej) => {
    if ([...document.scripts].some((s) => s.src === src)) return res();
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error('Could not load payment gateway'));
    document.head.appendChild(s);
  });
}

async function razorpayPay(order, rz, address) {
  await loadScript('https://checkout.razorpay.com/v1/checkout.js');
  const rzp = new window.Razorpay({
    key: rz.keyId,
    amount: rz.amount,
    currency: rz.currency,
    order_id: rz.orderId,
    name: 'Rare Collections by Sathish',
    description: `Order ${order.id}`,
    prefill: { name: address.name, email: state.user.email, contact: address.phone },
    theme: { color: '#d2552f' },
    handler: async (resp) => {
      try {
        const { order: paid } = await api(`/api/orders/${order.id}/pay`, { method: 'POST', body: resp });
        orderDone(paid);
      } catch (e) {
        $('#checkoutErr').textContent = e.message;
      }
    },
    modal: { ondismiss: () => ($('#checkoutErr').textContent = `Payment not completed. Order ${order.id} is saved — retry from “My orders”.`) },
  });
  rzp.open();
}

function orderDone(order) {
  $('#checkoutModal').close();
  state.cart = [];
  state.coupon = '';
  saveCart();
  renderCart();
  $('#successId').textContent = order.id;
  const msg = encodeURIComponent(`Just got a limited-edition tee from Rare Collections by Sathish. Fear none. Burn bright. ${location.origin}`);
  $('#shareWa').href = `https://wa.me/?text=${msg}`;
  $('#copyOrderId').onclick = () => copy(order.id, 'Order ID copied');
  $('#successTrack').onclick = () => {
    $('#successModal').close();
    showTracking(order.id, order.address?.pincode);
  };
  $('#successModal').showModal();
  confetti($('#confetti'));
  renderQuickOrders();
}

function confetti(canvas) {
  const ctx = canvas.getContext('2d');
  const w = (canvas.width = canvas.offsetWidth), h = (canvas.height = canvas.offsetHeight);
  const cols = ['#d2552f', '#b8924f', '#e3c98f', '#1d1611', '#c69c6d'];
  const ps = Array.from({ length: 140 }, () => ({ x: w / 2, y: h / 3, vx: (Math.random() - 0.5) * 12, vy: Math.random() * -10 - 3, r: Math.random() * 6 + 3, c: cols[(Math.random() * 5) | 0], a: Math.random() * 6 }));
  let frames = 0;
  (function f() {
    ctx.clearRect(0, 0, w, h);
    for (const p of ps) {
      p.vy += 0.3;
      p.x += p.vx;
      p.y += p.vy;
      p.a += 0.2;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      ctx.restore();
    }
    if (++frames < 150) requestAnimationFrame(f);
    else ctx.clearRect(0, 0, w, h);
  })();
}

// ---------------- orders & tracking ----------------
const STATUS_ICON = { confirmed: '✓', printing: '🖨', quality: '🔍', shipped: '📦', out_for_delivery: '🛵', delivered: '🏁' };
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const statusLabel = (o) => (o.status === 'pending_payment' ? 'Awaiting payment' : o.status === 'cancelled' ? 'Cancelled' : o.stages[o.stageIndex]?.label || o.status);

function trackingCard(o) {
  if (o.status === 'pending_payment' || o.status === 'cancelled') {
    return `<div class="track-card"><div class="track-head"><h3>${esc(o.id)}</h3><span class="status-chip">${statusLabel(o)}</span></div>
      <p class="muted">${o.status === 'cancelled' ? 'This order was cancelled. Reach out if that’s a surprise.' : 'We haven’t received payment for this order yet.'}</p></div>`;
  }
  const pct = (o.stageIndex / (o.stages.length - 1)) * 100;
  return `<div class="track-card">
    <div class="track-head"><h3>${esc(o.id)}</h3><span class="status-chip">${esc(statusLabel(o))}</span></div>
    <div class="progress"><span style="width:0" data-w="${pct}"></span></div>
    <ol class="timeline">${o.stages
      .map((s, i) => `<li class="${s.done ? 'done' : ''} ${i === o.stageIndex ? 'current' : ''}"><span class="dot">${s.done ? STATUS_ICON[s.key] : ''}</span><b>${esc(s.label)}</b><small>${s.done ? fmt(s.at) + ' · ' : ''}${esc(s.desc)}</small></li>`)
      .join('')}</ol>
    <div class="track-meta">
      <span>Delivering to <b>${esc(o.city)}</b></span>
      ${o.status !== 'delivered' && o.eta ? `<span>ETA <b>${new Date(o.eta).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</b></span>` : ''}
      ${o.courier ? `<span>Courier <b>${esc(o.courier)}</b></span>` : ''}
      ${o.awb ? `<span>AWB <b>${esc(o.awb)}</b></span>` : ''}
      <span>${o.items.reduce((s, i) => s + i.qty, 0)} tee(s) · <b>${inr(o.total)}</b> · ${o.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}</span>
    </div></div>`;
}

let trackTimer;
async function showTracking(id, pincode) {
  const box = $('#trackResult');
  $('#track').scrollIntoView({ behavior: 'smooth' });
  const f = $('#trackForm').elements;
  f.order.value = id;
  if (pincode) f.pincode.value = pincode;
  try {
    const { order } = await api(`/api/track?order=${encodeURIComponent(id)}&pincode=${encodeURIComponent(pincode || '')}`);
    box.innerHTML = trackingCard(order);
    renderQuickOrders();
    requestAnimationFrame(() => $$('.progress span', box).forEach((s) => (s.style.width = s.dataset.w + '%')));
    clearTimeout(trackTimer);
    if (order.status !== 'delivered' && order.status !== 'cancelled') trackTimer = setTimeout(() => showTracking(id, pincode), 30_000);
  } catch (e) {
    box.innerHTML = `<div class="track-card"><p class="err">${esc(e.message)}</p></div>`;
  }
}

async function renderQuickOrders() {
  const el = $('#myOrdersQuick');
  if (!state.user) return (el.innerHTML = '');
  try {
    const { orders } = await api('/api/orders');
    el.innerHTML = orders.slice(0, 4).map((o) => `<button class="chip" data-track="${esc(o.id)}">${esc(o.id)} · ${esc(statusLabel(o))}</button>`).join('');
  } catch {
    el.innerHTML = '';
  }
}

async function openOrders() {
  const m = $('#ordersModal');
  $('#ordersList').innerHTML = '<p class="muted">Loading…</p>';
  m.showModal();
  try {
    const { orders } = await api('/api/orders');
    $('#ordersList').innerHTML =
      (orders.length
        ? orders
            .map(
              (o) => `<div class="order-row"><div><b>${esc(o.id)}</b> <span class="status-chip">${esc(statusLabel(o))}</span>
          <div class="oi">${fmt(o.createdAt)} · ${o.items.map((i) => `${i.qty}× ${esc(i.name)} (${i.fit === 'women' ? 'W' : 'M'}·${i.size})`).join(', ')} · <b>${inr(o.total)}</b></div></div>
          <div class="row gap">${o.status === 'pending_payment' && o.paymentMethod === 'demo' ? `<button class="btn primary sm" data-pay="${esc(o.id)}" data-amt="${o.total}">Pay now</button>` : ''}<button class="btn ghost sm" data-track="${esc(o.id)}">Track</button></div></div>`,
            )
            .join('')
        : '<p class="muted">No orders yet. The rail is waiting.</p>') +
      `<p style="margin-top:18px"><span class="muted small">Signed in as ${esc(state.user.email)}</span> · <button class="link" id="logoutBtn">Log out</button></p>`;
    $('#logoutBtn').onclick = async () => {
      await api('/api/auth/logout', { method: 'POST' });
      state.user = null;
      m.close();
      renderAccount();
      toast('Logged out. Stay fearless.');
    };
  } catch (e) {
    $('#ordersList').innerHTML = `<p class="err">${esc(e.message)}</p>`;
  }
}

function bindTracking() {
  $('#trackForm').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target.elements;
    showTracking(f.order.value.trim().toUpperCase(), f.pincode.value.trim());
  };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-track]');
    if (t) {
      $$('dialog[open]').forEach((d) => d.close());
      showTracking(t.dataset.track);
    }
    const p = e.target.closest('[data-pay]');
    if (p) {
      $('#ordersModal').close();
      demoPay({ id: p.dataset.pay, total: Number(p.dataset.amt) });
    }
    const c = e.target.closest('[data-copy]');
    if (c) {
      state.coupon = c.dataset.copy;
      saveCart();
      renderCart();
      copy(c.dataset.copy, 'Code copied & applied');
    }
  });
}

// ---------------- newsletter ----------------
function bindJoin() {
  $('#joinForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const msg = $('#joinMsg');
    try {
      const r = await api('/api/subscribe', { method: 'POST', body: { email: f.get('email'), name: f.get('name') } });
      msg.innerHTML = r.already
        ? `You’re already in the circle. Your code: <button class="code" data-copy="${r.code}">${r.code}</button>`
        : `Welcome to the inner circle. Your 10% code: <button class="code" data-copy="${r.code}">${r.code}</button>`;
      e.target.reset();
      burst(msg);
    } catch (err) {
      msg.textContent = err.message;
    }
  };
}

// ---------------- misc ----------------
function bindModals() {
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
  });
}
function revealOnScroll() {
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { threshold: 0.2 });
  $$('.chapter').forEach((c) => io.observe(c));
}

// ---------------- boot ----------------
function intro() {
  const c = $('#curtain');
  const reveal = () => {
    if (c.classList.contains('gone')) return;
    c.classList.add('gone');
    // walk in through the storefront doorway
    setTimeout(() => shop.setView('store'), 250);
  };
  setTimeout(reveal, 1700);
  c.addEventListener('click', reveal);
}

async function boot() {
  $('#year').textContent = new Date().getFullYear();
  renderTicker(TICKER);
  renderMarquee();
  buildBoutique();
  intro();
  bindCart();
  bindAuth();
  bindCheckout();
  bindTracking();
  bindJoin();
  bindModals();
  renderBundles();
  buildWheel();
  revealOnScroll();
  renderCart();
  renderAccount();
  const sg = document.createElement('button');
  sg.id = 'sizeGuideOpen';
  sg.hidden = true;
  sg.onclick = openSizeGuide;
  document.body.appendChild(sg);

  const [config, offers, me] = await Promise.allSettled([api('/api/config'), api('/api/offers'), api('/api/me')]);
  if (config.status === 'fulfilled') state.config = config.value;
  if (offers.status === 'fulfilled') {
    renderTicker(offers.value.ticker);
    startCountdown(offers.value.flash.endsAt);
    state.totd = offers.value.teeOfTheDay;
  } else {
    const d = new Date();
    d.setHours(24, 0, 0, 0);
    startCountdown(d.getTime());
  }
  if (me.status === 'fulfilled' && me.value.user) {
    state.user = me.value.user;
    renderAccount();
  }
  const q = new URLSearchParams(location.search);
  if (q.get('track')) showTracking(q.get('track'), q.get('pincode'));
}

boot();

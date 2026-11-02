// Rare Collections — walk-in virtual boutique built with pure CSS 3D.
// World units are CSS px. Back wall at z = 0, floor at y = 0 (y grows downward), room opens toward +z.
import { PRODUCTS, TEE_COLORS, COLLECTIONS, productsIn } from './catalog.js';
import { BUNDLES, inr } from './pricing.js';
import { teeSVG, foldedSVG, printArtSVG, photoTee } from './tee.js';

const W = 3400, H = 1500, D = 2500;
const RAIL_Y = -1000, RAIL_Z = 70;
const GW = 360, GH = (GW * 640) / 500, GAP = 390;
const RAIL_SLOTS = 8; // the wall rail is built for the largest collection
const DRAWN = PRODUCTS.filter((p) => p.art); // products with vector art (folded stacks, prints)
const face = (p, color, fit, view = 'front') => (p.photo ? photoTee({ product: p, view }) : teeSVG({ product: p, color, fit, view, detail: DETAIL }));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Phones/tablets (and every iOS browser, which is WebKit) get lighter garments: SVG filters are
// expensive to rasterise there and iOS caps graphics memory per tab.
const LITE = matchMedia('(pointer: coarse)').matches || /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const DETAIL = LITE ? 'low' : 'high';
const KW = LITE ? 3 : 2; // wall render-resolution factor
const KF = LITE ? 6 : 4; // floor / light pools
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function el(cls, html = '') {
  const e = document.createElement('div');
  e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}
// k > 1 renders the element at 1/k resolution and scales it up: for soft, text-free surfaces
// (walls, floor, light pools) this cuts GPU memory by k² with no visible difference.
function place(e, { x = 0, y = 0, z = 0, ry = 0, rx = 0, w, h, k = 1 }) {
  e._c = { x, y, z };
  e._r = w && h ? Math.hypot(w, h) / 2 : 0;
  if (w && h) {
    e.style.width = w / k + 'px';
    e.style.height = h / k + 'px';
    if (k !== 1) e.style.setProperty('--k', k);
    e.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) rotateX(${rx}deg) translate(${-w / 2}px,${-h / 2}px)${k !== 1 ? ` scale(${k})` : ''}`;
  } else {
    if (w) e.style.width = w + 'px';
    if (h) e.style.height = h + 'px';
    e.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) rotateX(${rx}deg) translate(-50%,-50%)`;
  }
  return e;
}
// axis-aligned box (for plinth / shelving depth)
function box(cls, { x, y, z, w, h, d }) {
  const g = el('box ' + cls);
  g.style.transform = `translate3d(${x}px,${y}px,${z}px)`;
  const faces = [
    ['front', { z: d / 2, w, h }],
    ['back', { z: -d / 2, ry: 180, w, h }],
    ['left', { x: -w / 2, ry: -90, w: d, h }],
    ['right', { x: w / 2, ry: 90, w: d, h }],
    ['top', { y: -h / 2, rx: 90, w, h: d }],
  ];
  for (const [n, p] of faces) g.appendChild(place(el('face ' + n), p));
  return g;
}

// Large surfaces are split into tiles so each tile can be hidden when it falls behind the
// camera (browsers render planes that cross the camera plane with heavy distortion).
function surface(cls, { cx, cy, cz, ry = 0, rx = 0, w, h, nx, ny, k = 1 }) {
  const tw = w / nx, th = h / ny;
  const ax = rx ? [1, 0, 0] : [Math.cos((ry * Math.PI) / 180), 0, -Math.sin((ry * Math.PI) / 180)];
  const ay = rx ? [0, Math.cos((rx * Math.PI) / 180), Math.sin((rx * Math.PI) / 180)] : [0, 1, 0];
  const out = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      const u = -w / 2 + tw * (i + 0.5), v = -h / 2 + th * (j + 0.5);
      const t = el('tile ' + cls);
      t.style.setProperty('--ox', (-tw * i) / k + 'px');
      t.style.setProperty('--oy', (-th * j) / k + 'px');
      t.style.setProperty('--pw', w / k + 'px');
      t.style.setProperty('--ph', h / k + 'px');
      out.push(place(t, { x: cx + ax[0] * u + ay[0] * v, y: cy + ax[1] * u + ay[1] * v, z: cz + ax[2] * u + ay[2] * v, ry, rx, w: tw + 2, h: th + 2, k }));
    }
  return out;
}

const PLANT = `<svg viewBox="0 0 300 520" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>
<linearGradient id="pot" x1="0" x2="1"><stop offset="0" stop-color="#a99a87"/><stop offset=".45" stop-color="#e9e1d4"/><stop offset="1" stop-color="#8f8170"/></linearGradient>
<linearGradient id="lf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7f9c63"/><stop offset="1" stop-color="#2f4a2a"/></linearGradient></defs>
<path d="M150,380 C148,300 140,220 150,120 M150,300 C120,250 100,220 80,200 M150,250 C180,210 210,190 230,170 M150,200 C130,160 120,130 110,100" stroke="#5a4630" stroke-width="5" fill="none"/>
${[[80,200,-40],[230,170,30],[110,100,-25],[150,120,5],[60,260,-60],[240,250,50],[120,160,-10],[190,120,20],[95,310,-35],[210,300,40],[170,210,15],[130,230,-20]]
  .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="34" ry="44" transform="rotate(${r} ${x} ${y})" fill="url(#lf)"/><path d="M${x},${y + 40} L${x},${y - 40}" transform="rotate(${r} ${x} ${y})" stroke="#c7d7a8" stroke-width="1.5" opacity=".55"/>`).join('')}
<path d="M88,380 L212,380 L198,510 Q150,520 102,510Z" fill="url(#pot)"/><rect x="82" y="372" width="136" height="16" rx="4" fill="#d9cfc0"/></svg>`;

export class Boutique {
  constructor({ viewport, camera, room, onFocus, onBlur, onView, onBundle, onFounder, onCollection }) {
    Object.assign(this, { viewport, camera, room, onFocus, onBlur, onView, onBundle, onFounder, onCollection });
    this.colorOf = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.colors[0]]));
    this.fitOf = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.fit || 'men']));
    this.collection = COLLECTIONS[0].id;
    this.items = productsIn(this.collection);
    this.view = 'intro';
    viewport.classList.toggle('lite', LITE);
    this.focusIndex = -1;
    this.hover = -1;
    this.railX = this.gx(Math.min(2, this.items.length - 1));
    this.cur = { x: 0, y: -760, z: 4300, yaw: 0, pitch: 0 };
    this.target = { ...this.cur };
    this.prevX = this.cur.x;
    this.build();
    this.bind();
    this.resize();
    addEventListener('resize', () => this.resize());
    requestAnimationFrame(() => this.tick());
  }

  // per-item colour / fit (index into the active collection)
  get colors() { return this.items.map((p) => this.colorOf[p.id]); }
  get fits() { return this.items.map((p) => this.fitOf[p.id]); }
  // small capsules get gallery spacing; full drops use the standard gap
  get gap() { return this.items.length <= 4 ? 640 : GAP; }
  gx(i) { return (i - (this.items.length - 1) / 2) * this.gap; }
  indexAt(x) { return clamp(Math.round(x / this.gap + (this.items.length - 1) / 2), 0, this.items.length - 1); }
  get portrait() { return innerWidth / innerHeight < 0.9; }

  resize() {
    this.P = Math.round(Math.max(innerWidth, innerHeight * 1.15) * 0.62);
    this.viewport.style.perspective = this.P + 'px';
    if (this.view !== 'intro') this.setView(this.view, { keepFocus: true });
  }

  // ---------- build the room ----------
  build() {
    const r = this.room;
    const add = (e) => (r.appendChild(e), e);

    // shell (tiled)
    this.cull = [];
    const shell = [
      ...surface('wall back plaster', { cx: 0, cy: -H / 2, cz: 0, w: W, h: H, nx: 5, ny: 2, k: KW }),
      ...surface('wall side left plaster', { cx: -W / 2, cy: -H / 2, cz: D / 2, ry: 90, w: D, h: H, nx: 5, ny: 2, k: KW }),
      ...surface('wall side right plaster', { cx: W / 2, cy: -H / 2, cz: D / 2, ry: -90, w: D, h: H, nx: 5, ny: 2, k: KW }),
      ...surface('floor', { cx: 0, cy: 0, cz: D / 2, rx: 90, w: W, h: D, nx: 6, ny: 5, k: KF }),
    ];
    shell.forEach((t) => add(t));
    this.cull.push(...shell);
    add(place(el('baseboard'), { y: -22, z: 2, w: W, h: 44, k: 2 }));
    for (const [x, ry] of [[-W / 2 + 2, 90], [W / 2 - 2, -90]])
      for (let k = 0; k < 5; k++) this.cull.push(add(place(el('baseboard'), { x, y: -22, z: (D / 5) * (k + 0.5), ry, w: D / 5 + 1, h: 44, k: 2 })));

    // storefront facade (you start outside and walk in through the doorway)
    const doorW = 1700, doorH = 1180;
    this.facade = [
      add(place(el('facade'), { x: -(W / 2 + doorW / 2) / 2 - 300, y: -H / 2, z: D, w: W / 2 - doorW / 2 + 600, h: H, k: 4 })),
      add(place(el('facade'), { x: (W / 2 + doorW / 2) / 2 + 300, y: -H / 2, z: D, w: W / 2 - doorW / 2 + 600, h: H, k: 4 })),
      add(place(el('facade top', `<div class="sign"><span>Rare</span><em>Collections</em><small>by Sathish</small></div>`), { y: -(H + doorH) / 2 - 150, z: D, w: doorW, h: H - doorH + 300 })),
    ];

    // light pools on the back wall + ceiling fixtures + light cones
    for (const x of [-1170, -390, 390, 1170]) {
      add(place(el('pool'), { x, y: -900, z: 1, w: 1100, h: 1300, k: KF }));
      add(place(el('fixture'), { x, y: -H + 2, z: 420, rx: -90, w: 70, h: 70 }));
      add(place(el('cone'), { x, y: -H + 380, z: 300, w: 520, h: 760, k: KF }));
    }

    // wordmark + neon on the back wall
    add(place(el('wall-mark', `<p class="wmk-top" id="wmkTop">${esc(COLLECTIONS[0].wall)}</p><div class="wmk"><span class="wmk-rare">Rare</span><span class="wmk-col"><em>Collections</em><b>by Sathish</b></span></div>`), { y: -1290, z: 2, w: 1700, h: 300 }));
    add(place(el('neon', '<span>Fear none.</span><i>Burn bright.</i>'), { x: -1260, y: -1270, z: 4, w: 520, h: 210 }));
    add(place(el('badge-disc', `<span>No.</span><b>01</b><small>Limited<br/>150 pcs</small>`), { x: 1380, y: -1290, z: 3, w: 170, h: 170 }));

    // rail (segmented) with wall brackets
    const railW = GAP * RAIL_SLOTS + 260;
    for (let k = 0; k < 4; k++) this.cull.push(add(place(el('rail'), { x: -railW / 2 + (railW / 4) * (k + 0.5), y: RAIL_Y, z: RAIL_Z, w: railW / 4 + 1, h: 14 })));
    for (const x of [-(GAP * RAIL_SLOTS) / 2 - 90, (GAP * RAIL_SLOTS) / 2 + 90, 0])
      add(place(el('bracket'), { x, y: RAIL_Y, z: RAIL_Z / 2, ry: 90, w: RAIL_Z, h: 12 }));

    this.shellCull = this.cull.slice();
    this.buildRail();

    // center plinth with folded stacks (Tee of the Day)
    add(place(el('floor-shadow'), { y: -2, z: 1350, rx: 90, w: 1150, h: 520, k: 4 }));
    add(place(el('table', '<div class="table-top"></div><div class="table-front"><span>Folded · Ready to ship</span></div>'), { y: -95, z: 1420, w: 980, h: 190 }));
    [[-300, 0], [0, 1], [300, 2]].forEach(([x, k]) => {
      const p = DRAWN[(k * 3 + 1) % DRAWN.length];
      const stack = el('stack', [0, 1, 2].map((j) => `<div class="fold" style="--j:${j}">${foldedSVG({ product: p, color: p.colors[j % p.colors.length] })}</div>`).join(''));
      stack.dataset.pid = p.id;
      add(place(stack, { x, y: -190 - 62, z: 1400, w: 260, h: 150 }));
    });

    // right wall: oak shelving = bundles
    const shelf = el('shelving', BUNDLES.map((b) => `
      <div class="cubby" data-bundle="${b.qty}">
        <div class="cubby-stack">${Array.from({ length: b.qty }, (_, j) => { const p = DRAWN[(j * 2 + b.qty) % DRAWN.length]; return `<div class="fold" style="--j:${j}">${foldedSVG({ product: p, color: p.colors[0] })}</div>`; }).join('')}</div>
      </div>`).join('') + BUNDLES.map((b) => `
      <div class="cubby price" data-bundle="${b.qty}">
        <div class="brass"><small>${esc(b.name)}</small><b>${inr(b.price)}</b><span>${b.qty > 1 ? `${b.qty} tees · save ${inr(b.qty * 499 - b.price)}` : 'one tee'}</span></div>
      </div>`).join(''));
    add(place(shelf, { x: W / 2 - 40, y: -640, z: 1250, ry: -90, w: 1560, h: 980 }));
    add(place(el('shelf-title', 'Bundles · Mix any designs'), { x: W / 2 - 40, y: -1250, z: 1250, ry: -90, w: 900, h: 80 }));
    this.shelf = shelf;

    // left wall: gallery
    add(place(el('frame poster', `<div class="mat"><div class="manifesto"><small>The Rare Manifesto</small><h3>Fear<br/>none.</h3><h3 class="it">Burn<br/>bright.</h3><p>Small runs. Numbered pieces.<br/>Stories you can wear.</p></div></div>`), { x: -W / 2 + 12, y: -760, z: 1550, ry: 90, w: 560, h: 760 }));
    const founder = add(place(el('frame founder', `<div class="mat dark"><div class="portrait-art"><svg viewBox="0 0 240 300"><defs><radialGradient id="fpl" cx=".5" cy=".32" r=".7"><stop offset="0" stop-color="#e2793f" stop-opacity=".6"/><stop offset="1" stop-color="#e2793f" stop-opacity="0"/></radialGradient></defs><rect width="240" height="300" fill="#16110d"/><rect width="240" height="300" fill="url(#fpl)"/><path d="M120,40 C96,40 80,60 80,86 C80,104 88,118 98,126 L98,140 C70,150 46,170 40,210 L36,300 L204,300 L200,210 C194,170 170,150 142,140 L142,126 C152,118 160,104 160,86 C160,60 144,40 120,40Z" fill="#0b0806"/><path d="M120,40 C96,40 80,60 80,86 C80,104 88,118 98,126" fill="none" stroke="#e2793f" stroke-width="2.5"/><path d="M142,140 C170,150 194,170 200,210" fill="none" stroke="#e2793f" stroke-width="2"/></svg></div></div>`), { x: -W / 2 + 12, y: -820, z: 950, ry: 90, w: 440, h: 560 }));
    add(place(el('plaque', `<b>Sathish</b><span>Founder · Rare Collections</span><em>Click to read his story →</em>`), { x: -W / 2 + 10, y: -440, z: 950, ry: 90, w: 380, h: 110 }));
    founder.addEventListener('click', () => this.onFounder?.());
    [[2150, -980, 0], [2150, -560, 4]].forEach(([z, y, k]) =>
      add(place(el('frame small', `<div class="mat">${printArtSVG(DRAWN[k])}</div>`), { x: -W / 2 + 12, y, z, ry: 90, w: 300, h: 360 })),
    );

    // plants
    add(place(el('plant', PLANT), { x: W / 2 - 230, y: -300, z: 240, w: 340, h: 600 }));
    add(place(el('plant', PLANT), { x: -W / 2 + 230, y: -300, z: 240, w: 340, h: 600 }));
  }

  // ---------- the rail (one collection at a time) ----------
  buildRail() {
    const add = (e) => (this.room.appendChild(e), e);
    this.garments = this.items.map((p, i) => {
      const g = el('garment', `<div class="g-swing"><div class="g-flip"><div class="g-face front">${face(p, this.colorOf[p.id], this.fitOf[p.id])}</div><div class="g-face back"></div></div></div>`);
      g.dataset.i = i;
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `${p.name} tee, ${inr(499)}`);
      g.tabIndex = -1;
      add(place(g, { x: this.gx(i), y: RAIL_Y - 18 + GH / 2, z: RAIL_Z, w: GW, h: GH }));
      g._label = add(place(el('g-label', `<b>${esc(p.name)}</b><span>${esc(p.tagline)} · ${inr(499)}</span>`), { x: this.gx(i), y: RAIL_Y + GH + 40, z: 6, w: 360, h: 60 }));
      return g;
    });
    this.swingEls = this.garments.map((g) => g.querySelector('.g-swing'));
    this.swing = this.items.map((_, i) => ({ a: (i % 2 ? 1 : -1) * 1.5, w: 0 }));
    this.cull = [...this.shellCull, ...this.garments, ...this.garments.map((g) => g._label)];
    this.hover = -1;
  }

  setCollection(id) {
    if (id === this.collection || this.switching) return;
    const c = COLLECTIONS.find((x) => x.id === id);
    if (!c) return;
    this.switching = true;
    if (this.view === 'focus') this.setView('rail');
    const old = this.garments;
    old.forEach((g, k) => setTimeout(() => g.classList.add('leaving'), k * 40));
    setTimeout(() => {
      old.forEach((g) => (g._label.remove(), g.remove()));
      this.collection = id;
      this.items = productsIn(id);
      this.viewport.dataset.collection = id;
      const top = this.room.querySelector('#wmkTop');
      if (top) top.textContent = c.wall;
      this.buildRail();
      this.garments.forEach((g, k) => {
        g.classList.add('arriving');
        setTimeout(() => g.classList.remove('arriving'), 60 + k * 70);
        this.swing[k].w += (k % 2 ? 1 : -1) * 1.2;
      });
      this.railX = this.gx(Math.min(1, this.items.length - 1));
      if (this.view === 'rail' || this.view === 'store') this.setView('rail');
      this.switching = false;
      this.onCollection?.(c);
    }, 420 + old.length * 40);
  }

  // open any product, switching the rail to its collection first if needed
  focusProduct(id) {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) return;
    const open = () => this.focus(this.items.findIndex((x) => x.id === id));
    if (p.collection === this.collection) return open();
    this.setCollection(p.collection);
    setTimeout(open, 900);
  }

  // ---------- camera views ----------
  viewTarget(name) {
    const pt = this.portrait;
    switch (name) {
      case 'store': return { x: 0, y: -740, z: pt ? D + 520 : D + 460, yaw: 0, pitch: -1.5 };
      case 'rail': return { x: this.railX, y: -800, z: pt ? 1250 : 1180, yaw: 0, pitch: 0 };
      case 'focus': {
        const x = this.gx(this.focusIndex);
        return pt ? { x, y: -290, z: 1350, yaw: 0, pitch: 0 } : { x: x + 175, y: -786, z: 660, yaw: 0, pitch: 0 };
      }
      case 'shelves': return { x: W / 2 - (pt ? 2000 : 1650), y: -700, z: 1250, yaw: 90, pitch: 0 };
      case 'gallery': return { x: -W / 2 + (pt ? 1500 : 1350), y: -760, z: 1250, yaw: -90, pitch: 0 };
      default: return { ...this.cur };
    }
  }

  setView(name, { keepFocus = false } = {}) {
    if (name !== 'focus' && this.focusIndex >= 0 && !keepFocus) {
      this.garments[this.focusIndex].classList.remove('focused', 'flipped');
      this.focusIndex = -1;
      this.onBlur?.();
    }
    this.view = name;
    this.viewport.dataset.view = name;
    this.target = this.viewTarget(name);
    this.onView?.(name);
  }

  focus(i) {
    i = (i + this.items.length) % this.items.length;
    if (this.focusIndex >= 0) this.garments[this.focusIndex].classList.remove('focused', 'flipped');
    this.focusIndex = i;
    this.railX = this.gx(i);
    this.garments[i].classList.add('focused');
    this.swing[i].w += 0.8;
    this.setView('focus', { keepFocus: true });
    this.onFocus?.(i);
  }

  browse(dx) {
    this.railX = clamp(this.railX + dx, this.gx(0), this.gx(this.items.length - 1));
    if (this.view === 'rail') this.target.x = this.railX;
  }
  step(dir) {
    if (this.view === 'focus') return this.focus(this.focusIndex + dir);
    if (this.view !== 'rail') this.setView('rail');
    const i = clamp(this.indexAt(this.railX) + dir, 0, this.items.length - 1);
    this.railX = this.gx(i);
    this.target.x = this.railX;
  }

  restyle(i, { color, fit }) {
    const p = this.items[i];
    if (color) this.colorOf[p.id] = color;
    if (fit) this.fitOf[p.id] = fit;
    const g = this.garments[i];
    g.querySelector('.g-face.front').innerHTML = face(p, this.colorOf[p.id], this.fitOf[p.id]);
    g.querySelector('.g-face.back').innerHTML = '';
    if (g.classList.contains('flipped')) this.flip(i, true);
  }
  flip(i, force) {
    const g = this.garments[i];
    const back = g.querySelector('.g-face.back');
    const p = this.items[i];
    if (!back.innerHTML) back.innerHTML = face(p, this.colorOf[p.id], this.fitOf[p.id], 'back');
    g.classList.toggle('flipped', force ?? !g.classList.contains('flipped'));
    return g.classList.contains('flipped');
  }

  // the boutique owns the wheel/keys only while it fills the screen
  inView() {
    const r = this.viewport.getBoundingClientRect();
    return r.top > -120 && r.top < 160 && r.bottom > innerHeight * 0.7;
  }

  // ---------- input ----------
  bind() {
    const vp = this.viewport;
    let down = null, moved = 0, lastX = 0;
    vp.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY };
      lastX = e.clientX;
      moved = 0;
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved = Math.max(moved, Math.abs(e.clientX - down.x));
      if (moved > 6 && Math.abs(e.clientX - down.x) > Math.abs(e.clientY - down.y)) {
        vp.classList.add('dragging');
        if (this.view === 'store') this.setView('rail');
        if (this.view === 'rail') this.browse((-dx * (this.cur.z - RAIL_Z)) / this.P);
      }
    });
    addEventListener('pointerup', (e) => {
      if (!down) return;
      const wasClick = moved < 6;
      down = null;
      vp.classList.remove('dragging');
      if (!wasClick) return;
      const t = e.target;
      const g = t.closest?.('.garment');
      const stack = t.closest?.('.stack');
      const cubby = t.closest?.('.cubby');
      if (g) {
        const i = +g.dataset.i;
        if (this.view === 'rail' || this.view === 'focus') this.focus(i);
        else { this.railX = this.gx(i); this.setView('rail'); }
      } else if (stack) {
        this.focusProduct(stack.dataset.pid);
      } else if (cubby) {
        this.onBundle?.(+cubby.dataset.bundle);
      } else if (t.closest?.('.rail, .bracket, .wall.back') && this.view === 'store') {
        this.setView('rail');
      } else if (this.view === 'focus' && t.closest?.('.viewport')) {
        this.setView('rail');
      }
    });

    vp.addEventListener('pointerover', (e) => {
      const g = e.target.closest?.('.garment');
      const i = g ? +g.dataset.i : -1;
      if (i === this.hover) return;
      if (this.hover >= 0) this.garments[this.hover].classList.remove('hover');
      this.hover = i;
      if (i >= 0) {
        g.classList.add('hover');
        this.swing[i].w += 0.35;
      }
    });
    vp.addEventListener('pointerleave', () => {
      if (this.hover >= 0) this.garments[this.hover].classList.remove('hover');
      this.hover = -1;
    });

    // wheel: walk in → browse along the rail → continue down the page
    let wheelLock = 0;
    vp.addEventListener('wheel', (e) => {
      if (!this.inView()) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const now = performance.now();
      if (this.view === 'store' || this.view === 'intro') {
        if (d > 0) { e.preventDefault(); if (now > wheelLock) { wheelLock = now + 700; this.setView('rail'); } }
        return;
      }
      if (this.view === 'rail') {
        const atEnd = this.railX >= this.gx(this.items.length - 1) - 1 && d > 0;
        const atStart = this.railX <= this.gx(0) + 1 && d < 0;
        if (atEnd && now > wheelLock) return; // let the page scroll on
        e.preventDefault();
        if (atStart) { if (now > wheelLock) { wheelLock = now + 700; this.setView('store'); } return; }
        this.browse(d * 1.6);
        wheelLock = now + 350;
      }
    }, { passive: false });

    addEventListener('keydown', (e) => {
      if (document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
      if (!this.inView()) return;
      if (e.key === 'ArrowRight') { this.step(1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { this.step(-1); e.preventDefault(); }
      if (e.key === 'Escape') this.setView(this.view === 'focus' ? 'rail' : 'store');
      if (e.key === 'Enter' && this.view === 'rail') this.focus(this.indexAt(this.railX));
    });
  }

  // ---------- render loop ----------
  tick(now = performance.now()) {
    const c = this.cur, t = this.target;
    const dt = Math.min(100, now - (this.last || now));
    this.last = now;
    this.fps = this.fps ? this.fps * 0.95 + (1000 / Math.max(dt, 1)) * 0.05 : 60;
    const k = 1 - Math.pow(1 - 0.075, dt / 16.7); // frame-rate independent easing
    for (const key of ['x', 'y', 'z', 'yaw', 'pitch']) c[key] += (t[key] - c[key]) * k;
    this.camera.style.transform = `translateZ(${this.P}px) rotateX(${c.pitch.toFixed(3)}deg) rotateY(${c.yaw.toFixed(3)}deg) translate3d(${(-c.x).toFixed(2)}px,${(-c.y).toFixed(2)}px,${(-c.z).toFixed(2)}px)`;
    // the storefront facade only exists for the walk-in; drop it once inside to free GPU memory
    if (this.facade && c.z < D + 700) {
      this.facade.forEach((f) => f.remove());
      this.facade = null;
    }
    // hide anything that is (partly) behind the camera
    const yaw = (c.yaw * Math.PI) / 180;
    const fx = Math.sin(yaw), fz = -Math.cos(yaw);
    for (const e of this.cull) {
      const d = (e._c.x - c.x) * fx + (e._c.z - c.z) * fz;
      const vis = d > e._r * 0.9 + 40;
      if (vis !== e._vis) {
        e._vis = vis;
        e.style.visibility = vis ? '' : 'hidden';
      }
    }

    // garments sway from the "air" moved by the camera, and settle
    const vel = c.x - this.prevX;
    this.prevX = c.x;
    for (let i = 0; i < this.garments.length; i++) {
      const s = this.swing[i];
      s.w += (-0.045 * s.a - 0.06 * s.w - vel * 0.012) * Math.min(3, dt / 16.7);
      s.a = clamp(s.a + s.w, -7, 7);
      this.swingEls[i].style.transform = `rotate(${s.a.toFixed(2)}deg)`;
    }
    requestAnimationFrame((n) => this.tick(n));
  }
}

import { SECTIONS, CATEGORIES, ITEMS, ITEM_BY_ID, PER_SHIRT, SHEET_TITLE } from './sheet.js';
import { compute, baselineInputs, sanitizeInputs, diffFromBaseline, LIMITS } from './model.js';
import { inr, num, pct, shirts, delta, esc, ICON, CAT_COLOR, timeAgo, debounce } from './util.js';
import { stackBar, paybackChart } from './charts.js';
import { storage } from './storage.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clone = (o) => JSON.parse(JSON.stringify(o));
const B = compute(baselineInputs()); // the spreadsheet, untouched

const DRAFT_KEY = 'cea.draft.v1';
const loadDraft = () => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (d && d.inputs) return { id: d.id || null, name: d.name || '', note: d.note || '', inputs: sanitizeInputs(d.inputs), savedJSON: d.savedJSON || null, where: d.where || null };
  } catch {}
  return null;
};
const freshDraft = () => ({ id: null, name: '', note: '', inputs: baselineInputs(), savedJSON: null, where: null });

const state = {
  view: 'summary',
  draft: loadDraft() || freshDraft(),
  sims: [],
  selected: new Set(),
  est: { prio: 'All', cat: 'All', q: '' },
  saved: { q: '', sort: 'updated' },
  openAcc: new Set(['inventory']),
};
const saveDraft = debounce(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state.draft)); } catch {} }, 250);
const isDirty = () => JSON.stringify(state.draft.inputs) !== (state.draft.savedJSON ?? JSON.stringify(baselineInputs()));

// ============================================================ shared UI

function toast(msg, { error = false } = {}) {
  const el = document.createElement('div');
  el.className = `toast${error ? ' err' : ''}`;
  el.innerHTML = `<span class="tdot"></span><span>${esc(msg)}</span>`;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2600);
}

let sheetCloseHook = null;
function openSheet(html, onMount) {
  const sheet = $('#sheet');
  $('#sheet-body').innerHTML = html;
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  onMount?.($('#sheet-body'));
  const first = $('#sheet-body input, #sheet-body textarea, #sheet-body button');
  setTimeout(() => first?.focus({ preventScroll: true }), 60);
}
function closeSheet() {
  const sheet = $('#sheet');
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  sheetCloseHook?.(); sheetCloseHook = null;
}
function confirmSheet({ title, body, ok = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    sheetCloseHook = () => { if (!done) resolve(false); };
    openSheet(`<h2 id="sheet-title">${esc(title)}</h2><p class="lead">${body}</p>
      <div class="btn-row"><button class="btn ${danger ? 'danger' : 'primary'}" data-ok style="flex:1">${esc(ok)}</button><button class="btn" data-close style="flex:1">Cancel</button></div>`,
    (root) => { $('[data-ok]', root).onclick = () => { done = true; closeSheet(); resolve(true); }; });
  });
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#sheet').classList.contains('open')) closeSheet(); });

function download(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const chip = (txt, cls = '', sw) => `<span class="chip ${cls}">${sw ? `<i class="sw" style="background:${sw}"></i>` : ''}${esc(txt)}</span>`;
const catChip = (c) => chip(c, '', CAT_COLOR[c]);
const prioChip = (p) => chip(p, p === 'Later' ? 'later' : 'must');

function animateCount(el, to, fmt) {
  const from = Number(el.dataset.from || 0);
  el.dataset.from = to;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) { el.innerHTML = fmt(to); return; }
  const t0 = performance.now(), dur = 700;
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3;
    el.innerHTML = fmt(k === 1 ? to : from + (to - from) * e);
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
const heroMoney = (n) => `<span class="cur">₹</span>${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n))}`;

// ============================================================ the report (Summary tab, reused for simulations)

// Which category each per-shirt component belongs to (for "where each ₹ goes").
const COMP_CAT = { blank: 'Inventory', dtf: 'Inventory', label: 'Branding', hangTag: 'Packaging', zipper: 'Packaging', keychain: 'Packaging', card: 'Packaging', mailer: 'Packaging' };

function perShirtRows(r) {
  const rows = PER_SHIRT.map((c) => ({ key: c.key, label: c.label, hint: c.key === 'dtf' ? `DTF total ÷ ${num(r.batch)} blanks` : '', value: r.perShirt[c.key], cat: COMP_CAT[c.key] }));
  for (const c of r.inputs.custom) if (c.perShirt && !c.off) rows.push({ key: c.id, label: c.name, hint: 'custom item', value: r.perShirt[c.id] || 0, cat: c.category });
  return rows;
}

function reportHTML(r, base) {
  const d = (cur, b, o) => (base ? delta(cur, b, o) : '');
  const laterNames = r.lines.filter((l) => l.priority === 'Later' && !l.off && l.total > 0).map((l) => l.name);
  const inv = r.investment, bi = base?.investment || {};
  const lossy = r.profit <= 0;
  const groups = [
    { k: 'Equipment', v: inv.equipment, b: bi.equipment, sw: [CAT_COLOR.Equipment], ref: 'B5' },
    { k: 'Workspace setup', v: inv.workspace, b: bi.workspace, sw: [CAT_COLOR.Workspace], ref: 'B6' },
    { k: 'Legal + domain', v: inv.legalDomain, b: bi.legalDomain, sw: [CAT_COLOR.Legal, CAT_COLOR.Online], ref: 'B7' },
    { k: 'First inventory (blanks + DTF)', v: inv.inventory, b: bi.inventory, sw: [CAT_COLOR.Inventory], ref: 'B8' },
    { k: 'Packaging + branding (labels, bags, keychains…)', v: inv.packagingBranding, b: bi.packagingBranding, sw: [CAT_COLOR.Packaging, CAT_COLOR.Branding], ref: 'B9' },
  ];
  const psRows = perShirtRows(r);
  const maxPay = Math.max(...r.whatIf.map((w) => w.payback || 0), 1);

  return `
  <div class="hero">
    <div class="eyebrow">Estimated revenue · whole batch sells</div>
    <div class="hero-value" data-count="${r.revenue}">${heroMoney(r.revenue)}</div>
    <div class="hero-sub"><span><b>${num(r.batch)}</b> shirts × <b>${inr(r.price)}</b></span>${d(r.revenue, base?.revenue)}</div>
    <div class="hero-grid">
      <div class="hero-stat"><div class="k">Profit / shirt</div><div class="v">${inr(r.profit)}</div>${d(r.profit, base?.profit)}</div>
      <div class="hero-stat"><div class="k">Margin</div><div class="v">${pct(r.margin)}</div>${d(r.margin, base?.margin, { kind: 'pct' })}</div>
      <div class="hero-stat"><div class="k">Payback</div><div class="v">${r.payback === null ? 'Never' : `${num(r.payback)}<small style="font-size:11px"> shirts</small>`}</div>${d(r.payback, base?.payback, { better: 'down', kind: 'count' })}</div>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><div><div class="eyebrow"><span class="idx">1</span>Investment</div><h2 class="section-title">${inr(inv.total)}</h2><div class="small muted">Total investment · all items</div></div><div class="right">${d(inv.total, bi.total, { better: 'down' })}</div></div>
    <div data-chart="invest"></div>
    <div class="legend" style="margin-bottom:6px">${CATEGORIES.filter((c) => r.byCategory[c] > 0).map((c) => `<span><i class="sw" style="background:${CAT_COLOR[c]}"></i>${c}</span>`).join('')}</div>
    ${groups.map((g) => `<div class="total-line"><span class="lbl">${g.sw.map((s) => `<i class="sw" style="background:${s}"></i>`).join('')}<span>${esc(g.k)}</span></span><span class="vals">${d(g.v, g.b, { better: 'down' })}<span class="num">${inr(g.v)}</span></span></div>`).join('')}
    <div class="total-line grand"><span class="lbl">TOTAL INVESTMENT</span><span class="vals">${d(inv.total, bi.total, { better: 'down' })}<span class="num">${inr(inv.total)}</span></span></div>
    <div class="total-line"><span class="lbl"><span>Minimum to launch <span class="muted small">(Must items only)</span><br><span class="muted small">${laterNames.length ? `Excludes the ${esc(laterNames.join(', ').toLowerCase())}` : 'No Later items in this estimate'}</span></span></span><span class="vals">${d(inv.minimum, bi.minimum, { better: 'down' })}<span class="num">${inr(inv.minimum)}</span></span></div>
  </div>

  <div class="card">
    <div class="card-head"><div><div class="eyebrow"><span class="idx">2</span>Selling price</div><h2 class="section-title">${inr(r.price)} <span class="muted small" style="font-family:var(--body)">per T-shirt</span></h2></div><div class="right">${d(r.price, base?.price, { better: 'none' })}</div></div>
  </div>

  <div class="card">
    <div class="eyebrow"><span class="idx">3</span>Cost per T-shirt</div>
    <div class="receipt" style="margin-top:12px">
      <div class="receipt-title">PACKED SHIRT · COST SLIP</div>
      <div class="receipt-big">One shirt, ready to ship</div>
      ${psRows.map((p) => {
        const bv = base ? (base.perShirt[p.key] ?? 0) : undefined;
        return `<div class="leader"><span class="l">${esc(p.label)}${p.hint ? `<small>${esc(p.hint)}</small>` : ''}</span><span class="dots"></span><span class="r">${inr(p.value)}</span></div>${base && Math.abs(p.value - bv) > 1e-9 ? `<div style="text-align:right;margin:-2px 0 3px">${delta(p.value, bv, { better: 'down' })}</div>` : ''}`;
      }).join('')}
      <div class="leader sum"><span class="l">PRODUCT COST</span><span class="dots"></span><span class="r">${inr(r.productCost)}</span></div>
      ${base ? `<div style="text-align:right;margin-top:3px">${delta(r.productCost, base.productCost, { better: 'down' })}</div>` : ''}
      <div class="barcode" aria-hidden="true"></div>
    </div>
    <div class="small muted" style="margin-top:-8px">DTF: ${esc(PER_SHIRT[1].note)}.</div>
  </div>

  <div class="card">
    <div class="card-head"><div><div class="eyebrow"><span class="idx">4</span>Profit per T-shirt</div><h2 class="section-title">Where each ${inr(r.price)} goes</h2></div><div class="right">${d(r.profit, base?.profit)}</div></div>
    <div data-chart="pershirt"></div>
    <div class="legend" style="margin-bottom:10px">${[...new Set(psRows.filter((p) => p.value > 0).map((p) => p.cat))].map((c) => `<span><i class="sw" style="background:${CAT_COLOR[c]}"></i>${c}</span>`).join('')}<span><i class="sw ${lossy ? '' : 'hatch'}" style="${lossy ? 'background:var(--bad)' : ''}"></i>${lossy ? 'Loss' : 'Profit'}</span></div>
    <div class="leader"><span class="l">Selling price</span><span class="dots"></span><span class="r num">${inr(r.price)}</span></div>
    <div class="leader"><span class="l">− Cost per packed shirt</span><span class="dots"></span><span class="r num">${inr(r.productCost)}</span></div>
    <div class="leader sum ${lossy ? 'loss' : 'profit'}"><span class="l">PROFIT PER SHIRT</span><span class="dots"></span><span class="r num">${inr(r.profit)}</span></div>
    <div class="leader"><span class="l">Profit margin <span class="muted small">(on selling price)</span></span><span class="dots"></span><span class="r num">${pct(r.margin)}</span></div>
  </div>

  <div class="card">
    <div class="card-head"><div><div class="eyebrow"><span class="idx">5</span>Launch batch & payback</div><h2 class="section-title">${r.payback === null ? 'Never — losing money per shirt' : `Recover everything after ${num(r.payback)} shirts`}</h2></div></div>
    <div class="tiles">
      <div class="tile"><div class="k">Shirts in launch batch</div><div class="v">${num(r.batch)}</div>${d(r.batch, base?.batch, { better: 'none', kind: 'count' })}</div>
      <div class="tile ink"><div class="k">Revenue if whole batch sells</div><div class="v">${inr(r.revenue)}</div>${d(r.revenue, base?.revenue)}</div>
      <div class="tile"><div class="k">Profit if whole batch sells</div><div class="v">${inr(r.batchProfit)}</div>${d(r.batchProfit, base?.batchProfit)}</div>
      <div class="tile"><div class="k">One-time equipment & setup</div><div class="v">${inr(r.oneTime)}</div><div class="s">Equipment + workspace + legal + domain</div>${d(r.oneTime, base?.oneTime, { better: 'down' })}</div>
      <div class="tile wide"><div class="k">Shirts to sell to recover the full investment</div><div class="v">${r.payback === null ? 'Never — losing money per shirt' : num(r.payback)}</div><div class="s">${inr(r.total)} ÷ ${inr(r.profit)} profit per shirt, rounded up</div>${d(r.payback, base?.payback, { better: 'down', kind: 'count' })}</div>
    </div>
    <div style="margin-top:16px"><div class="small" style="font-weight:700">Cumulative profit as shirts sell</div>
      ${base ? `<div class="legend" style="margin-top:6px"><span><i class="sw line" style="background:var(--c1)"></i>This simulation</span><span><i class="sw dash"></i>Sheet (₹${B.price})</span><span><i class="sw dash" style="border-color:var(--ink-2)"></i>Investment</span></div>` : ''}
      <div data-chart="payback"></div>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><div><div class="eyebrow"><span class="idx">6</span>What if?</div><h2 class="section-title">Profit per shirt at different prices</h2></div></div>
    <div class="bars">
      <div class="bar-row small muted" style="font-weight:700"><span>Price</span><span>Shirts to recover investment</span><span>Profit / shirt</span></div>
      ${r.whatIf.map((w) => `<div class="bar-row ${w.price === r.price ? 'current' : ''} ${w.payback === null ? 'loss' : ''}" title="At ${inr(w.price)}: ${inr(w.profit)} profit per shirt, ${w.payback === null ? 'loss' : `${w.payback} shirts to recover`}">
        <span class="price">${inr(w.price)}</span>
        <span class="track">${w.payback === null ? '<span class="chip off">Loss</span>' : `<span class="fill" style="width:${(w.payback / maxPay) * 100}%"></span>`}</span>
        <span class="vals">${w.payback === null ? 'Loss' : `${num(w.payback)} shirts`}<small>${inr(w.profit)}</small></span>
      </div>`).join('')}
    </div>
    <div class="small muted" style="margin-top:8px">Shorter bar = you break even sooner. ${r.whatIf.some((w) => w.price === r.price) ? 'Dark bar = your current price.' : ''}</div>
  </div>

  <div class="card">
    <div class="card-head"><div><div class="eyebrow"><span class="idx">7</span>What if?</div><h2 class="section-title">Fit 4 designs per DTF meter instead of 2 <span class="muted small" style="font-family:var(--body)">(at ${inr(r.price)})</span></h2></div></div>
    <div class="tiles">
      <div class="tile"><div class="k">Profit per shirt with DTF cost halved</div><div class="v">${inr(r.dtfHalved.profit)}</div>${d(r.dtfHalved.profit, base?.dtfHalved.profit)}</div>
      <div class="tile"><div class="k">Shirts to recover investment</div><div class="v">${r.dtfHalved.payback === null ? 'Loss' : num(r.dtfHalved.payback)}</div>${d(r.dtfHalved.payback, base?.dtfHalved.payback, { better: 'down', kind: 'count' })}</div>
    </div>
    <div class="small muted" style="margin-top:8px">Arrange designs tightly on the sheet / use slightly smaller prints.</div>
  </div>`;
}

function mountReport(root, r, base) {
  const inv = root.querySelector('[data-chart="invest"]');
  if (inv) stackBar(inv, CATEGORIES.map((c) => ({ label: c, value: r.byCategory[c], color: CAT_COLOR[c] })));
  const ps = root.querySelector('[data-chart="pershirt"]');
  if (ps) {
    const byCat = {};
    for (const p of perShirtRows(r)) byCat[p.cat] = (byCat[p.cat] || 0) + p.value;
    const order = ['Inventory', 'Packaging', 'Branding', ...CATEGORIES.filter((c) => !['Inventory', 'Packaging', 'Branding'].includes(c))];
    const segs = order.filter((c) => byCat[c] > 0).map((c) => ({ label: `${c} (per shirt)`, value: byCat[c], color: CAT_COLOR[c] }));
    if (r.profit > 0) segs.push({ label: 'Profit', value: r.profit, cls: 'profit' });
    else segs.push({ label: `Loss of ${inr(-r.profit)} per shirt`, value: 0 });
    stackBar(ps, segs);
  }
  const pb = root.querySelector('[data-chart="payback"]');
  if (pb) {
    const series = [{ label: base ? 'This simulation' : `At ${inr(r.price)}`, profit: r.profit, color: 'var(--c1)' }];
    if (base) series.push({ label: 'Sheet', profit: base.profit, color: 'var(--muted)', dashed: true });
    paybackChart(pb, { series, investment: r.total, batch: r.batch });
    pb._redraw = () => paybackChart(pb, { series, investment: r.total, batch: r.batch });
  }
}
addEventListener('resize', debounce(() => $$('[data-chart="payback"]').forEach((el) => el.offsetParent && el._redraw?.()), 200));

// ============================================================ Summary tab

function renderSummary() {
  const v = $('#view-summary');
  v.innerHTML = `
    <div class="eyebrow">Tab · Summary</div>
    <h1 class="page-title" id="t-summary">Final Summary — Selling at ${inr(B.price)}</h1>
    <p class="page-sub">Every figure is pulled live from your Startup Estimate, using the same formulas as the sheet.</p>
    ${reportHTML(B)}
    <button class="btn signal" style="width:100%;margin-bottom:8px" data-go="simulate">${ICON.simulate} Simulate different prices</button>
    <p class="foot-note">Source: Tshirt_Startup_Estimate_499.xlsx · ${esc(SHEET_TITLE)}</p>`;
  mountReport(v, B);
  const hv = $('.hero-value', v); hv.dataset.from = 0; animateCount(hv, B.revenue, heroMoney);
}

// ============================================================ Estimate tab (Startup Estimate sheet)

function renderEstimate() {
  const v = $('#view-estimate');
  const counts = { All: ITEMS.length, Must: ITEMS.filter((i) => i.priority === 'Must').length, Later: ITEMS.filter((i) => i.priority === 'Later').length };
  v.innerHTML = `
    <div class="eyebrow">Tab · Startup Estimate</div>
    <h1 class="page-title" id="t-estimate">${esc(SHEET_TITLE.replace('Startup Estimate — ', ''))}</h1>
    <p class="page-sub">Your figures as entered in the sheet: qty × unit cost = total. Tap any item with a note to read it.</p>
    <div class="tiles" style="margin-bottom:14px">
      <div class="tile ink"><div class="k">Total estimate (all items)</div><div class="v">${inr(B.total)}</div></div>
      <div class="tile"><div class="k">Must-have items only</div><div class="v">${inr(B.mustTotal)}</div><div class="s">minimum to launch</div></div>
    </div>
    <div class="search" style="margin-bottom:10px">${ICON.search}<input type="search" id="est-q" placeholder="Search items, notes…" value="${esc(state.est.q)}" aria-label="Search items"></div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
      <div class="seg" role="group" aria-label="Priority">${['All', 'Must', 'Later'].map((p) => `<button data-prio="${p}" class="${state.est.prio === p ? 'on' : ''}">${p} <span class="muted">${counts[p]}</span></button>`).join('')}</div>
    </div>
    <div class="scroller" style="margin-bottom:12px" role="group" aria-label="Category">
      ${['All', ...CATEGORIES].map((c) => `<button class="filter-chip ${state.est.cat === c ? 'on' : ''}" data-cat="${c}">${c !== 'All' ? `<i class="sw" style="background:${CAT_COLOR[c]}"></i>` : ''}${c}</button>`).join('')}
    </div>
    <div id="est-list"></div>
    <div class="card">
      <div class="eyebrow" style="margin-bottom:10px">Totals by category</div>
      <div data-chart="cats"></div>
      ${CATEGORIES.map((c) => `<div class="total-line"><span class="lbl"><i class="sw" style="background:${CAT_COLOR[c]}"></i>${c}</span><span class="num">${inr(B.byCategory[c])}</span></div>`).join('')}
      <div class="total-line grand"><span class="lbl">TOTAL ESTIMATE (all items)</span><span class="num">${inr(B.total)}</span></div>
      <div class="total-line"><span class="lbl">Must-have items only (minimum to launch)</span><span class="num">${inr(B.mustTotal)}</span></div>
      <div class="total-line"><span class="lbl muted">Later items</span><span class="num muted">${inr(B.laterTotal)}</span></div>
    </div>
    <button class="btn signal" style="width:100%" data-go="simulate">${ICON.simulate} Change these prices in the simulator</button>`;
  stackBar($('[data-chart="cats"]', v), CATEGORIES.map((c) => ({ label: c, value: B.byCategory[c], color: CAT_COLOR[c] })));
  renderEstimateList();
}

function renderEstimateList() {
  const { prio, cat, q } = state.est;
  const ql = q.trim().toLowerCase();
  const html = SECTIONS.map((s) => {
    const rows = B.lines.filter((l) => l.section === s.id
      && (prio === 'All' || l.priority === prio) && (cat === 'All' || l.category === cat)
      && (!ql || `${l.name} ${l.note} ${l.category}`.toLowerCase().includes(ql)));
    if (!rows.length) return '';
    const sum = rows.reduce((a, l) => a + l.total, 0);
    return `<div class="card flush section-block"><div class="section-head"><h3>${esc(s.title)}</h3><span class="num">${inr(sum)}</span></div>
      ${rows.map((l) => `<div class="row ${l.note ? 'expandable' : ''}" ${l.note ? 'tabindex="0" role="button" aria-expanded="false"' : ''}>
        <div><div class="row-name"><span class="row-ref">R${l.row}</span>${esc(l.name)}</div>
          <div class="row-meta">${catChip(l.category)}${prioChip(l.priority)}<span class="row-calc">${num(l.qty)} × ${inr(l.unit)}</span>${l.note ? `<span class="note-hint">Note ${ICON.chevron}</span>` : ''}</div></div>
        <div class="row-total">${inr(l.total)}</div>
        ${l.note ? `<div class="row-note">${esc(l.note)}</div>` : ''}
      </div>`).join('')}</div>`;
  }).join('');
  $('#est-list').innerHTML = html || `<div class="card empty"><h3>No matches</h3><p>Try another search or filter.</p></div>`;
}

function bindEstimate() {
  const v = $('#view-estimate');
  v.addEventListener('click', (e) => {
    const p = e.target.closest('[data-prio]'); if (p) { state.est.prio = p.dataset.prio; $$('[data-prio]', v).forEach((b) => b.classList.toggle('on', b === p)); return renderEstimateList(); }
    const c = e.target.closest('[data-cat]'); if (c) { state.est.cat = c.dataset.cat; $$('[data-cat]', v).forEach((b) => b.classList.toggle('on', b === c)); return renderEstimateList(); }
    const row = e.target.closest('.row.expandable'); if (row) { row.classList.toggle('open'); row.setAttribute('aria-expanded', row.classList.contains('open')); }
  });
  v.addEventListener('keydown', (e) => { const row = e.target.closest('.row.expandable'); if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); row.click(); } });
  v.addEventListener('input', (e) => { if (e.target.id === 'est-q') { state.est.q = e.target.value; renderEstimateList(); } });
}

// ============================================================ Simulate tab

const OPTION_ROWS = [
  { id: 'blank-cost', label: 'Blank tee cost', from: 'Sheet note: ₹60–₹70 per blank (₹65 used)', item: 'blanks', field: 'unit', values: [60, 65, 70] },
  { id: 'press-cost', label: 'Heat press price', from: 'Your quote ₹17,000 · online listings ₹35,000–₹85,000', item: 'heat-press', field: 'unit', values: [17000, 35000, 60000, 85000] },
];

function ppmOf(inp) { const d = inp.items.dtf.qty; return d > 0 ? inp.items.blanks.qty / d : 0; }

function presetStates(inp) {
  const laterIds = ITEMS.filter((i) => i.priority === 'Later').map((i) => i.id);
  return {
    'must-only': laterIds.length > 0 && laterIds.every((id) => inp.items[id].off),
    'label-batch': inp.items.stitching.qty === inp.items.blanks.qty,
  };
}

function itemEditorHTML(item, v) {
  const base = ITEM_BY_ID[item.id];
  const changed = v.qty !== base.qty || v.unit !== base.unit || v.off;
  return `<div class="edit-item ${changed ? 'changed' : ''} ${v.off ? 'is-off' : ''}" data-item="${item.id}">
    <div class="top">
      <div class="nm"><span class="row-ref">R${item.row}</span>${esc(item.name)}<div class="row-meta">${catChip(item.category)}${prioChip(item.priority)}</div></div>
      ${item.locked ? '<span class="chip" title="The batch size comes from this row">batch</span>' : `<label class="switch" title="Include this item"><input type="checkbox" data-bind="off" data-id="${item.id}" ${v.off ? '' : 'checked'} aria-label="Include ${esc(item.name)}"><span></span></label>`}
    </div>
    <div class="fields">
      <div class="field"><label>Qty <span class="was">· sheet ${num(base.qty)}</span></label>
        <div class="stepper"><button type="button" data-step="-1" aria-label="Decrease quantity">−</button><input inputmode="decimal" data-bind="item" data-id="${item.id}" data-f="qty" value="${v.qty}" aria-label="Quantity"><button type="button" data-step="1" aria-label="Increase quantity">+</button></div></div>
      <div class="field"><label>Unit cost <span class="was">· sheet ${inr(base.unit)}</span></label>
        <div class="stepper"><span class="pre">₹</span><input inputmode="decimal" data-bind="item" data-id="${item.id}" data-f="unit" value="${v.unit}" aria-label="Unit cost in rupees"><button type="button" data-step="-1" aria-label="Decrease unit cost">−</button><button type="button" data-step="1" aria-label="Increase unit cost">+</button></div></div>
    </div>
    <div class="foot"><span class="was" data-was>${changed ? `sheet ${inr(base.qty * base.unit)}` : 'same as sheet'}</span><span style="display:flex;gap:8px;align-items:center"><button type="button" class="mini-btn" data-act="reset-item" data-id="${item.id}" ${changed ? '' : 'hidden'}>${ICON.reset}Reset</button><span class="num" data-total>${inr(v.off ? 0 : v.qty * v.unit)}</span></span></div>
    ${item.note ? `<div class="small muted" style="margin-top:6px">${esc(item.note)}</div>` : ''}
  </div>`;
}

function customEditorHTML(c, i) {
  return `<div class="edit-item changed ${c.off ? 'is-off' : ''}" data-custom="${i}">
    <div class="top"><div class="nm" style="display:grid;gap:6px">
      <input type="text" data-bind="custom" data-i="${i}" data-f="name" value="${esc(c.name)}" maxlength="${LIMITS.name}" aria-label="Item name" style="border:1px solid var(--line-strong);border-radius:10px;padding:8px 10px;font-weight:600;background:var(--surface)">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <select data-bind="custom" data-i="${i}" data-f="category" aria-label="Category" style="height:32px;border-radius:9px;border:1px solid var(--line);background:var(--surface-2);font-size:12.5px;font-weight:600">${CATEGORIES.map((k) => `<option ${k === c.category ? 'selected' : ''}>${k}</option>`).join('')}</select>
        <select data-bind="custom" data-i="${i}" data-f="priority" aria-label="Priority" style="height:32px;border-radius:9px;border:1px solid var(--line);background:var(--surface-2);font-size:12.5px;font-weight:600">${['Must', 'Later'].map((k) => `<option ${k === c.priority ? 'selected' : ''}>${k}</option>`).join('')}</select>
      </div></div>
      <label class="switch" title="Include this item"><input type="checkbox" data-bind="custom-off" data-i="${i}" ${c.off ? '' : 'checked'} aria-label="Include item"><span></span></label>
    </div>
    <div class="fields">
      <div class="field"><label>Qty</label><div class="stepper"><button type="button" data-step="-1" aria-label="Decrease">−</button><input inputmode="decimal" data-bind="custom" data-i="${i}" data-f="qty" value="${c.qty}" aria-label="Quantity"><button type="button" data-step="1" aria-label="Increase">+</button></div></div>
      <div class="field"><label>Unit cost</label><div class="stepper"><span class="pre">₹</span><input inputmode="decimal" data-bind="custom" data-i="${i}" data-f="unit" value="${c.unit}" aria-label="Unit cost"><button type="button" data-step="-1" aria-label="Decrease">−</button><button type="button" data-step="1" aria-label="Increase">+</button></div></div>
    </div>
    <div class="foot">
      <label class="check ${c.perShirt ? 'on' : ''}"><input type="checkbox" data-bind="custom-pershirt" data-i="${i}" ${c.perShirt ? 'checked' : ''}>Adds to cost per shirt</label>
      <span style="display:flex;gap:8px;align-items:center"><button type="button" class="mini-btn" data-act="remove-custom" data-i="${i}">${ICON.trash}Remove</button><span class="num" data-total>${inr(c.off ? 0 : c.qty * c.unit)}</span></span>
    </div>
  </div>`;
}

function renderSimulate() {
  const v = $('#view-simulate');
  const inp = state.draft.inputs;
  const scrollY = window.scrollY;
  const r = compute(inp);
  const ps = presetStates(inp);
  const ppm = ppmOf(inp);
  const sold = inp.soldQty;

  v.innerHTML = `
  <div class="sim-strip" id="sim-strip"></div>
  <div class="sim-title-row">
    <div class="name"><b id="sim-name">${esc(state.draft.name || 'New simulation')}</b><span id="sim-status"></span></div>
    <button class="icon-btn" data-act="sim-menu" aria-label="Simulation options">${ICON.more}</button>
  </div>

  <div class="card" id="sim-changes"></div>

  <div class="card">
    <div class="eyebrow"><span class="idx">₹</span>Selling price per T-shirt</div>
    <div class="price-dial">
      <button class="step" type="button" data-act="price-step" data-d="-10" aria-label="Lower price by ₹10">−</button>
      <label class="price-input"><span>₹</span><input inputmode="decimal" data-bind="price" value="${inp.sellingPrice}" aria-label="Selling price"></label>
      <button class="step" type="button" data-act="price-step" data-d="10" aria-label="Raise price by ₹10">+</button>
    </div>
    <input type="range" min="99" max="1499" step="1" data-bind="price-range" value="${Math.min(1499, Math.max(99, inp.sellingPrice))}" aria-label="Selling price slider">
    <div class="range-labels"><span>₹99</span><span>cost ${inr(r.productCost)}</span><span>₹1,499</span></div>
    <div class="quick" id="price-quick">${[...new Set([B.price, ...inp.whatIfPrices])].sort((a, b) => a - b).map((p) => `<button type="button" data-act="set-price" data-p="${p}" class="${p === inp.sellingPrice ? 'on' : ''}">${inr(p)}</button>`).join('')}</div>
  </div>

  <div class="card">
    <div class="eyebrow"><span class="idx">#</span>Batch & sales</div>
    <div class="fields" style="display:grid;grid-template-columns:1fr;gap:10px;margin-top:12px">
      <div class="field"><label>Shirts in launch batch <span class="was">· sheet ${B.batch} (blank tees qty)</span></label>
        <div class="stepper"><button type="button" data-step="-10" aria-label="Decrease batch">−</button><input inputmode="numeric" data-bind="item" data-id="blanks" data-f="qty" value="${inp.items.blanks.qty}" aria-label="Shirts in batch"><button type="button" data-step="10" aria-label="Increase batch">+</button></div></div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px">
      <div><b style="font-size:14px">Whole batch sells</b><div class="small muted">Turn off to test selling only part of it</div></div>
      <label class="switch"><input type="checkbox" data-bind="sold-all" ${sold === null ? 'checked' : ''} aria-label="Whole batch sells"><span></span></label>
    </div>
    <div id="sold-box" ${sold === null ? 'hidden' : ''} style="margin-top:10px">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="small" style="font-weight:700">Shirts sold</span><span class="num" style="font-weight:700" id="sold-val">${sold ?? r.batch}</span></div>
      <input type="range" min="0" max="${Math.max(1, r.batch)}" step="1" data-bind="sold" value="${Math.min(sold ?? r.batch, r.batch)}" aria-label="Shirts sold">
    </div>
    <div class="tiles" id="sales-tiles" style="margin-top:12px"></div>
  </div>

  <div class="card">
    <div class="eyebrow" style="margin-bottom:12px"><span class="idx">✦</span>Quick scenarios from your sheet notes</div>
    <div class="field" style="margin-bottom:12px"><label>DTF designs per meter <span class="was">· sheet: 50 m for 100 tees = 2 / m</span></label>
      <div class="seg" style="display:flex">${[2, 3, 4].map((p) => `<button type="button" style="flex:1" data-act="ppm" data-p="${p}" class="${Math.abs(ppm - p) < 0.02 || inp.items.dtf.qty === Math.ceil(inp.items.blanks.qty / p) ? 'on' : ''}">${p} per meter</button>`).join('')}</div>
      <div class="small muted" style="margin-top:5px" id="ppm-note">Now ${num(inp.items.dtf.qty)} m for ${num(inp.items.blanks.qty)} tees ≈ ${ppm ? ppm.toFixed(1) : '0'} per meter. Sets DTF meters from the batch size.</div>
    </div>
    ${OPTION_ROWS.map((o) => `<div class="field" style="margin-bottom:12px"><label>${esc(o.label)} <span class="was">· ${esc(o.from)}</span></label>
      <div class="quick" style="margin-top:4px">${o.values.map((val) => `<button type="button" data-act="opt" data-oitem="${o.item}" data-f="${o.field}" data-v="${val}" class="${inp.items[o.item][o.field] === val ? 'on' : ''}">${inr(val)}</button>`).join('')}</div></div>`).join('')}
    <div class="preset-list">
      <button type="button" class="preset ${ps['must-only'] ? 'on' : ''}" data-act="preset" data-p="must-only"><span class="ico">${ICON.check}</span><span><b>Launch with Must items only</b><span>Leaves out the thermal shipping-label printer (Later) — ${inr(B.laterTotal)}</span></span></button>
      <button type="button" class="preset ${ps['label-batch'] ? 'on' : ''}" data-act="preset" data-p="label-batch"><span class="ico">${ICON.tag}</span><span><b>Stitch labels on this batch only</b><span>Sheet note: stitching is 200 vs 100 blanks — sets it to the batch size</span></span></button>
    </div>
  </div>

  <div class="card flush" id="items-card">
    <div style="padding:16px 16px 6px"><div class="eyebrow">Every line item · qty & unit cost</div><div class="small muted" style="margin-top:6px">Switch an item off to drop it from the estimate (and from cost per shirt).</div></div>
    ${SECTIONS.map((s) => `<div class="acc ${state.openAcc.has(s.id) ? 'open' : ''}" data-acc="${s.id}">
      <button type="button" class="acc-head" data-act="acc" aria-expanded="${state.openAcc.has(s.id)}"><h3>${esc(s.title)}</h3><span class="chip changed" data-acc-changed hidden></span><span class="num" data-acc-total></span>${ICON.chevron}</button>
      <div class="acc-body">${s.items.map((i) => itemEditorHTML(i, inp.items[i.id])).join('')}</div></div>`).join('')}
    <div class="acc ${state.openAcc.has('custom') ? 'open' : ''}" data-acc="custom">
      <button type="button" class="acc-head" data-act="acc" aria-expanded="${state.openAcc.has('custom')}"><h3>Your extra items</h3><span class="chip" >${inp.custom.length}</span><span class="num" data-acc-total></span>${ICON.chevron}</button>
      <div class="acc-body">${inp.custom.length ? inp.custom.map(customEditorHTML).join('') : '<div class="small muted" style="padding:0 4px 6px">Nothing added yet. Extra costs that are not in the sheet go here.</div>'}</div>
    </div>
    <div style="padding:4px 12px 12px"><button type="button" class="btn" style="width:100%" data-act="add-custom" ${inp.custom.length >= LIMITS.maxCustom ? 'disabled' : ''}>${ICON.plus} Add an item (ads, photoshoot, samples…)</button></div>
  </div>

  <div class="card">
    <div class="eyebrow" style="margin-bottom:10px"><span class="idx">6</span>What-if prices to compare</div>
    <div class="quick">${inp.whatIfPrices.map((p, i) => `<button type="button" data-act="rm-whatif" data-i="${i}" aria-label="Remove ${inr(p)}">${inr(p)} <span aria-hidden="true">×</span></button>`).join('')}</div>
    <form data-form="whatif" style="display:flex;gap:8px;margin-top:10px">
      <div class="stepper" style="flex:1"><span class="pre">₹</span><input inputmode="decimal" name="p" placeholder="Add a price, e.g. 649" aria-label="Add a what-if price"></div>
      <button class="btn sm" style="height:42px" ${inp.whatIfPrices.length >= LIMITS.maxWhatIf ? 'disabled' : ''}>${ICON.plus}Add</button>
    </form>
  </div>

  <div class="divider-label"><span>Results of this simulation</span></div>
  <div id="sim-report"></div>

  <div class="action-bar">
    <button class="btn ghost" data-act="reset-all" aria-label="Reset to sheet">${ICON.reset}</button>
    <button class="btn" data-act="export-draft">${ICON.download}CSV</button>
    <button class="btn primary" data-act="save" id="save-btn">${ICON.save}<span>Save</span></button>
  </div>`;
  v.classList.add('has-action-bar');
  refreshSim({ full: true });
  window.scrollTo(0, scrollY);
}

function refreshSim({ full = false } = {}) {
  const v = $('#view-simulate');
  if (!v.innerHTML) return;
  const inp = state.draft.inputs;
  const r = compute(inp);

  // strip
  const cell = (k, val, dl, main) => `<div class="strip-cell ${main ? 'main' : ''}"><div class="k">${k}</div><div class="v">${val}</div>${dl}</div>`;
  const sd = (cur, b, o) => delta(cur, b, { ...o, cls: 'd' }).replace(/[▲▼] /, (m) => m);
  $('#sim-strip').innerHTML = `<div class="strip-grid">
    ${cell('Revenue', inr(r.revenue), sd(r.revenue, B.revenue), true)}
    ${cell('Profit/tee', inr(r.profit), sd(r.profit, B.profit))}
    ${cell('Payback', r.payback === null ? 'Never' : `${num(r.payback)}`, sd(r.payback, B.payback, { better: 'down', kind: 'count' }))}
    ${cell('Invest', inr(r.total), sd(r.total, B.total, { better: 'down' }))}
  </div>`;

  // changes
  const changes = diffFromBaseline(inp);
  $('#sim-changes').innerHTML = changes.length
    ? `<div class="card-head" style="margin-bottom:6px"><div><div class="eyebrow">Changed from the sheet</div><h2 class="section-title">${changes.length} change${changes.length === 1 ? '' : 's'}</h2></div><button class="btn sm" data-act="reset-all">${ICON.reset}Reset all</button></div>
       <ul class="changes">${changes.slice(0, 8).map((c) => `<li><span>${esc(c.field)}</span><span class="ft">${typeof c.from === 'number' ? (c.money || c.field === 'Selling price' ? inr(c.from) : num(c.from)) : esc(c.from)} → <b>${typeof c.to === 'number' ? (c.money || c.field === 'Selling price' ? inr(c.to) : num(c.to)) : esc(c.to)}</b></span></li>`).join('')}</ul>
       ${changes.length > 8 ? `<div class="small muted" style="margin-top:6px">+${changes.length - 8} more</div>` : ''}`
    : `<div style="display:flex;gap:12px;align-items:center"><span class="logo-mark" style="width:38px;height:38px;font-size:13px">${ICON.check.replace('<svg', '<svg width="18" height="18"')}</span><div><b>Starting from your sheet</b><div class="small muted">Change any price below. Every result updates instantly and is compared against the sheet.</div></div></div>`;

  // status + save button
  const dirty = isDirty();
  $('#sim-status').innerHTML = state.draft.id
    ? `${state.draft.where === 'device' || state.draft.id.startsWith('local-') ? 'Saved on this device' : 'Saved to cloud'} · ${dirty ? '<b style="color:var(--warn)">unsaved changes</b>' : 'up to date'}`
    : changes.length ? 'Not saved yet' : 'Same as the sheet';
  $('#save-btn span').textContent = state.draft.id ? (dirty ? 'Save changes' : 'Saved') : 'Save simulation';

  // sync bound inputs (except the one being typed in)
  const active = document.activeElement;
  $$('[data-bind="item"]', v).forEach((el) => { if (el !== active) el.value = inp.items[el.dataset.id][el.dataset.f]; });
  const pi = $('[data-bind="price"]', v); if (pi !== active) pi.value = inp.sellingPrice;
  const pr = $('[data-bind="price-range"]', v); if (pr !== active) pr.value = Math.min(1499, Math.max(99, inp.sellingPrice));
  $$('#price-quick button', v).forEach((b) => b.classList.toggle('on', +b.dataset.p === inp.sellingPrice));
  $('.range-labels span:nth-child(2)', v).textContent = `cost ${inr(r.productCost)}`;

  // item cards
  for (const item of ITEMS) {
    const card = $(`.edit-item[data-item="${item.id}"]`, v); if (!card) continue;
    const val = inp.items[item.id], base = ITEM_BY_ID[item.id];
    const changed = val.qty !== base.qty || val.unit !== base.unit || val.off;
    card.classList.toggle('changed', changed); card.classList.toggle('is-off', val.off);
    $('[data-total]', card).textContent = inr(val.off ? 0 : val.qty * val.unit);
    $('[data-was]', card).textContent = changed ? `sheet ${inr(base.qty * base.unit)}` : 'same as sheet';
    $('[data-act="reset-item"]', card).hidden = !changed;
    const sw = $('[data-bind="off"]', card); if (sw) sw.checked = !val.off;
  }
  inp.custom.forEach((c, i) => { const card = $(`[data-custom="${i}"]`, v); if (card) { $('[data-total]', card).textContent = inr(c.off ? 0 : c.qty * c.unit); card.classList.toggle('is-off', c.off); } });
  for (const s of SECTIONS) {
    const acc = $(`[data-acc="${s.id}"]`, v);
    const sum = r.lines.filter((l) => l.section === s.id).reduce((a, l) => a + l.total, 0);
    $('[data-acc-total]', acc).textContent = inr(sum);
    const n = s.items.filter((i) => { const x = inp.items[i.id], b = ITEM_BY_ID[i.id]; return x.qty !== b.qty || x.unit !== b.unit || x.off; }).length;
    const c = $('[data-acc-changed]', acc); c.hidden = !n; c.textContent = `${n} changed`;
  }
  $('[data-acc="custom"] [data-acc-total]', v).textContent = inr(r.lines.filter((l) => l.custom).reduce((a, l) => a + l.total, 0));

  // presets & options
  const ps = presetStates(inp);
  $$('[data-act="preset"]', v).forEach((b) => b.classList.toggle('on', !!ps[b.dataset.p]));
  $$('[data-act="opt"]', v).forEach((b) => b.classList.toggle('on', inp.items[b.dataset.oitem][b.dataset.f] === +b.dataset.v));
  const ppm = ppmOf(inp);
  $$('[data-act="ppm"]', v).forEach((b) => b.classList.toggle('on', inp.items.dtf.qty === Math.ceil(inp.items.blanks.qty / +b.dataset.p)));
  $('#ppm-note').textContent = `Now ${num(inp.items.dtf.qty)} m for ${num(inp.items.blanks.qty)} tees ≈ ${ppm ? ppm.toFixed(1) : '0'} per meter. Sets DTF meters from the batch size.`;

  // sales
  const soldRange = $('[data-bind="sold"]', v);
  soldRange.max = Math.max(1, r.batch);
  if (soldRange !== active) soldRange.value = Math.min(r.sales.sold, r.batch);
  $('#sold-val').textContent = num(r.sales.sold);
  $('#sold-box').hidden = inp.soldQty === null;
  $('#sales-tiles').innerHTML = `
    <div class="tile ink"><div class="k">Revenue from ${num(r.sales.sold)} shirts</div><div class="v">${inr(r.sales.revenue)}</div>${delta(r.sales.revenue, B.revenue)}</div>
    <div class="tile"><div class="k">Profit from those sales</div><div class="v">${inr(r.sales.profit)}</div>${delta(r.sales.profit, B.batchProfit)}</div>
    <div class="tile wide"><div class="k">Position after paying back the whole investment</div><div class="v" style="color:${r.sales.net >= 0 ? 'var(--good)' : 'var(--bad)'}">${inr(r.sales.net, { sign: true })}</div><div class="s">${r.sales.net >= 0 ? 'Investment fully recovered' : r.payback === null ? 'Every shirt loses money at this price' : `${num(Math.max(0, r.payback - r.sales.sold))} more shirts to break even`}</div></div>`;

  // report
  const rep = $('#sim-report');
  rep.innerHTML = reportHTML(r, B);
  mountReport(rep, r, B);

  saveDraft();
}

function suggestName(inp) {
  const parts = [];
  if (inp.sellingPrice !== B.price) parts.push(`₹${inp.sellingPrice}`);
  if (inp.items.blanks.qty !== B.batch) parts.push(`${inp.items.blanks.qty} shirts`);
  if (inp.items.blanks.unit !== 65) parts.push(`blanks ₹${inp.items.blanks.unit}`);
  const ppm = ppmOf(inp); if (Math.abs(ppm - 2) > 0.05 && ppm) parts.push(`${+ppm.toFixed(1)} DTF/m`);
  if (inp.items['heat-press'].unit !== 17000) parts.push(`press ₹${num(inp.items['heat-press'].unit)}`);
  const rest = diffFromBaseline(inp).length - parts.length;
  if (!parts.length) return rest > 0 ? `Custom estimate (${rest} changes)` : `Sheet copy · ₹${inp.sellingPrice}`;
  return parts.join(' · ') + (rest > 0 ? ` +${rest}` : '');
}

function openSaveSheet({ asNew = false } = {}) {
  const d = state.draft;
  const name = asNew || !d.id ? (d.name && asNew ? `${d.name} (copy)` : d.name || suggestName(d.inputs)) : d.name;
  openSheet(`<h2 id="sheet-title">${asNew ? 'Save as a new simulation' : d.id ? 'Rename & notes' : 'Save this simulation'}</h2>
    <p class="lead">${storage.mode === 'cloud' ? 'Saved to the cloud: anyone with the app can open it.' : 'Saved in this browser (cloud storage is not connected yet).'}</p>
    <form data-form="save">
      <div class="form-field"><label for="sv-name">Name</label><input type="text" id="sv-name" name="name" required maxlength="${LIMITS.name}" value="${esc(name)}"></div>
      <div class="form-field"><label for="sv-note">Notes (optional)</label><textarea id="sv-note" name="note" maxlength="${LIMITS.note}" placeholder="Why this scenario? Supplier quotes, assumptions…">${esc(asNew ? '' : d.note)}</textarea></div>
      <button class="btn primary" style="width:100%">${ICON.save}${asNew || !d.id ? 'Save simulation' : 'Save'}</button>
    </form>`, (root) => {
    $('form', root).onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const btn = $('button', e.target); btn.disabled = true;
      try {
        await persistDraft({ name: String(fd.get('name')), note: String(fd.get('note')), asNew });
        closeSheet();
      } catch (err) { toast(err.message, { error: true }); btn.disabled = false; }
    };
  });
}

async function persistDraft({ name, note, asNew = false } = {}) {
  const d = state.draft;
  const payload = { name: name ?? d.name, note: note ?? d.note, inputs: d.inputs };
  const { simulation, where } = d.id && !asNew ? await storage.update(d.id, payload) : await storage.create(payload);
  state.draft = { id: simulation.id, name: simulation.name, note: simulation.note, inputs: sanitizeInputs(simulation.inputs), savedJSON: JSON.stringify(sanitizeInputs(simulation.inputs)), where };
  $('#sim-name').textContent = simulation.name;
  refreshSim();
  await loadSims();
  toast(where === 'cloud' ? `Saved “${simulation.name}” to the cloud` : `Saved “${simulation.name}” on this device`);
}

function simMenu() {
  const d = state.draft;
  openSheet(`<h2 id="sheet-title">${esc(d.name || 'New simulation')}</h2><p class="lead">${diffFromBaseline(d.inputs).length} changes from the sheet</p>
    <div class="menu-list">
      ${d.id ? `<button data-m="rename">${ICON.edit}Rename & notes</button><button data-m="saveas">${ICON.copy}Save as a new simulation</button>` : `<button data-m="save">${ICON.save}Save simulation</button>`}
      ${d.id && !d.id.startsWith('local-') ? `<button data-m="share">${ICON.share}Share link</button>` : ''}
      <button data-m="csv">${ICON.download}Export CSV</button>
      <button data-m="print">${ICON.print}Print / PDF</button>
      <button data-m="new">${ICON.plus}Start a new simulation from the sheet</button>
    </div>`, (root) => {
    root.onclick = async (e) => {
      const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return;
      if (m === 'rename') return openSaveSheet();
      if (m === 'saveas') return openSaveSheet({ asNew: true });
      if (m === 'save') return openSaveSheet();
      closeSheet();
      if (m === 'share') shareSim({ id: d.id, name: d.name });
      if (m === 'csv') download(`${slug(d.name || 'cea-simulation')}.csv`, toCSV({ name: d.name || 'Unsaved simulation', note: d.note, inputs: d.inputs }));
      if (m === 'print') setTimeout(() => print(), 100);
      if (m === 'new') newSimulation();
    };
  });
}

async function newSimulation() {
  if (isDirty() && !(await confirmSheet({ title: 'Discard unsaved changes?', body: 'Your current simulation has changes that are not saved.', ok: 'Discard', danger: true }))) return;
  state.draft = freshDraft();
  renderSimulate();
  toast('New simulation started from the sheet');
}

function setItem(id, f, value) { state.draft.inputs.items[id][f] = value; }
function parseNum(s) { const n = Number(String(s).replace(/[₹,\s]/g, '')); return Number.isFinite(n) && n >= 0 ? Math.min(n, LIMITS.maxNumber) : null; }
function unitStep(v) { return v >= 10000 ? 1000 : v >= 1000 ? 500 : v >= 100 ? 10 : v >= 10 ? 1 : 0.5; }

function bindSimulate() {
  const v = $('#view-simulate');
  v.addEventListener('input', (e) => {
    const t = e.target, b = t.dataset.bind; if (!b) return;
    const inp = state.draft.inputs;
    if (b === 'price' || b === 'price-range') { const n = parseNum(t.value); if (n === null) return; inp.sellingPrice = n; }
    else if (b === 'item') { const n = parseNum(t.value); if (n === null) return; setItem(t.dataset.id, t.dataset.f, n); }
    else if (b === 'sold') { inp.soldQty = Math.round(+t.value); }
    else if (b === 'custom') {
      const c = inp.custom[+t.dataset.i]; const f = t.dataset.f;
      if (f === 'qty' || f === 'unit') { const n = parseNum(t.value); if (n === null) return; c[f] = n; } else c[f] = t.value;
      if (f === 'name' || f === 'category' || f === 'priority') { saveDraft(); return refreshSim(); }
    } else return;
    refreshSim();
  });
  v.addEventListener('change', (e) => {
    const t = e.target, b = t.dataset.bind, inp = state.draft.inputs;
    if (b === 'off') { setItem(t.dataset.id, 'off', !t.checked); refreshSim(); }
    if (b === 'sold-all') { inp.soldQty = t.checked ? null : compute(inp).batch; refreshSim(); }
    if (b === 'custom-off') { inp.custom[+t.dataset.i].off = !t.checked; refreshSim(); }
    if (b === 'custom-pershirt') { inp.custom[+t.dataset.i].perShirt = t.checked; t.closest('.check').classList.toggle('on', t.checked); refreshSim(); }
    if (b === 'item' || b === 'price') { t.value = b === 'price' ? inp.sellingPrice : inp.items[t.dataset.id][t.dataset.f]; }
  });
  v.addEventListener('focusout', (e) => { if (e.target.dataset.bind === 'item' || e.target.dataset.bind === 'price') refreshSim(); });
  v.addEventListener('submit', (e) => {
    if (e.target.dataset.form !== 'whatif') return;
    e.preventDefault();
    const n = parseNum(e.target.p.value);
    if (!n) return toast('Enter a price above ₹0', { error: true });
    const list = state.draft.inputs.whatIfPrices;
    if (!list.includes(n)) { list.push(n); list.sort((a, b) => a - b); }
    renderSimulate();
  });
  v.addEventListener('click', async (e) => {
    const stepBtn = e.target.closest('[data-step]');
    if (stepBtn) {
      const input = $('input', stepBtn.closest('.stepper'));
      const cur = parseNum(input.value) ?? 0;
      const isUnit = input.dataset.f === 'unit';
      const s = +stepBtn.dataset.step * (isUnit ? unitStep(cur) : Math.abs(+stepBtn.dataset.step) >= 10 ? 1 : 1);
      input.value = Math.max(0, Math.round((cur + s) * 100) / 100);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const a = e.target.closest('[data-act]'); if (!a) return;
    const inp = state.draft.inputs, act = a.dataset.act;
    if (act === 'price-step') { inp.sellingPrice = Math.max(0, inp.sellingPrice + +a.dataset.d); refreshSim(); }
    if (act === 'set-price') { inp.sellingPrice = +a.dataset.p; refreshSim(); }
    if (act === 'opt') { setItem(a.dataset.oitem, a.dataset.f, +a.dataset.v); refreshSim(); }
    if (act === 'ppm') { inp.items.dtf.qty = Math.ceil(inp.items.blanks.qty / +a.dataset.p); inp.items.dtf.off = false; refreshSim(); }
    if (act === 'preset') {
      const on = presetStates(inp)[a.dataset.p];
      if (a.dataset.p === 'must-only') ITEMS.filter((i) => i.priority === 'Later').forEach((i) => { inp.items[i.id].off = !on; });
      if (a.dataset.p === 'label-batch') inp.items.stitching.qty = on ? ITEM_BY_ID.stitching.qty : inp.items.blanks.qty;
      refreshSim();
    }
    if (act === 'reset-item') { const b = ITEM_BY_ID[a.dataset.id]; inp.items[b.id] = { qty: b.qty, unit: b.unit, off: false }; refreshSim(); }
    if (act === 'acc') {
      const acc = a.closest('.acc'); acc.classList.toggle('open');
      const open = acc.classList.contains('open'); a.setAttribute('aria-expanded', open);
      open ? state.openAcc.add(acc.dataset.acc) : state.openAcc.delete(acc.dataset.acc);
    }
    if (act === 'add-custom') {
      inp.custom.push({ id: `custom-${Date.now().toString(36)}`, name: 'New item', category: 'Online', priority: 'Must', qty: 1, unit: 1000, perShirt: false, off: false });
      state.openAcc.add('custom'); renderSimulate();
      const cards = $$('[data-custom]', v); const last = cards[cards.length - 1];
      last?.scrollIntoView({ block: 'center', behavior: 'smooth' }); $('input[type="text"]', last)?.select();
    }
    if (act === 'remove-custom') { inp.custom.splice(+a.dataset.i, 1); renderSimulate(); }
    if (act === 'rm-whatif') {
      if (inp.whatIfPrices.length <= 1) return toast('Keep at least one what-if price', { error: true });
      inp.whatIfPrices.splice(+a.dataset.i, 1); renderSimulate();
    }
    if (act === 'reset-all') {
      if (!diffFromBaseline(inp).length) return toast('Already the same as the sheet');
      if (!(await confirmSheet({ title: 'Reset to the sheet?', body: 'Every price, quantity and extra item goes back to your spreadsheet values.', ok: 'Reset' }))) return;
      state.draft.inputs = baselineInputs(); renderSimulate(); toast('Reset to the sheet');
    }
    if (act === 'save') {
      if (state.draft.id) { if (!isDirty()) return toast('Already saved'); try { await persistDraft(); } catch (err) { toast(err.message, { error: true }); } }
      else openSaveSheet();
    }
    if (act === 'sim-menu') simMenu();
    if (act === 'export-draft') download(`${slug(state.draft.name || 'cea-simulation')}.csv`, toCSV({ name: state.draft.name || 'Unsaved simulation', note: state.draft.note, inputs: inp }));
  });
}

// ============================================================ Saved tab

async function loadSims() {
  try { state.sims = await storage.list(); } catch { state.sims = storage.localList(); }
  $('#saved-badge').textContent = state.sims.length || '';
  updateStoragePill();
  if (state.view === 'saved') renderSaved();
}

function renderSaved() {
  const v = $('#view-saved');
  const { q, sort } = state.saved;
  const ql = q.trim().toLowerCase();
  const sorters = {
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    revenue: (a, b) => b.headline.revenue - a.headline.revenue,
    profit: (a, b) => b.headline.profit - a.headline.profit,
    payback: (a, b) => (a.headline.payback ?? 1e12) - (b.headline.payback ?? 1e12),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  const list = state.sims.filter((s) => !ql || `${s.name} ${s.note}`.toLowerCase().includes(ql)).sort(sorters[sort]);
  const localCount = state.sims.filter((s) => s.local).length;
  for (const id of [...state.selected]) if (!state.sims.some((s) => s.id === id)) state.selected.delete(id);

  const banner = storage.mode !== 'cloud'
    ? `<div class="banner warn">${ICON.device}<div><b>Saving on this device only</b>Cloud storage isn't connected, so simulations are kept in this browser. Once you connect Upstash Redis in Vercel (see the README), everyone sees the same saved list.</div></div>`
    : localCount ? `<div class="banner warn">${ICON.sync}<div><b>${localCount} simulation${localCount === 1 ? ' is' : 's are'} only on this device</b>Upload ${localCount === 1 ? 'it' : 'them'} so everyone can see ${localCount === 1 ? 'it' : 'them'}.<br><button class="btn sm primary" data-act="sync">${ICON.cloud}Upload to cloud</button></div></div>`
    : `<div class="banner ok">${ICON.cloud}<div><b>Connected to the cloud</b>Saved simulations are shared with everyone who opens CEA.</div></div>`;

  v.innerHTML = `
    <div class="eyebrow">Your scenarios</div>
    <h1 class="page-title" id="t-saved">Saved simulations</h1>
    <p class="page-sub">Open one to keep tweaking it, or tick two to compare them side by side with the sheet.</p>
    ${banner}
    ${state.sims.length ? `<div class="toolbar"><div class="search">${ICON.search}<input type="search" id="saved-q" placeholder="Search saved…" value="${esc(q)}" aria-label="Search saved simulations"></div>
      <select id="saved-sort" aria-label="Sort">${[['updated', 'Newest'], ['revenue', 'Revenue'], ['profit', 'Profit/shirt'], ['payback', 'Fastest payback'], ['name', 'Name']].map(([k, l]) => `<option value="${k}" ${sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>` : ''}
    <div id="saved-list">${list.length ? list.map(simCardHTML).join('') : state.sims.length ? '<div class="card empty"><h3>No matches</h3><p>Try a different search.</p></div>' : emptyHTML()}</div>
    <div class="compare-bar" id="compare-bar" ${state.selected.size ? '' : 'hidden'}><span>${state.selected.size} selected</span><button class="btn sm" data-act="clear-sel" style="background:transparent;color:inherit;border-color:rgba(255,255,255,.25)">Clear</button><button class="btn sm signal" data-act="compare">${ICON.compare}Compare</button></div>`;
  v.style.paddingBottom = state.selected.size ? '70px' : '';
}

const emptyHTML = () => `<div class="card empty">
  <svg class="art" viewBox="0 0 120 120" aria-hidden="true"><rect x="22" y="14" width="76" height="92" rx="10" fill="var(--surface-2)" stroke="var(--line-strong)" stroke-width="2"/><path d="M36 36h48M36 50h34M36 64h42" stroke="var(--line-strong)" stroke-width="4" stroke-linecap="round"/><rect x="34" y="76" width="52" height="16" rx="5" fill="var(--signal)"/><text x="60" y="88" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="10" fill="#15161a">₹49,900</text></svg>
  <h3>No simulations yet</h3><p>Try a new price or supplier quote in the simulator, then save it to compare later.</p>
  <button class="btn primary" data-go="simulate">${ICON.simulate}Open the simulator</button></div>`;

function simCardHTML(s) {
  const h = s.headline, sel = state.selected.has(s.id);
  return `<div class="card sim-card" data-sim="${esc(s.id)}">
    <div class="top"><div class="t"><h3>${esc(s.name)}</h3>
      <div class="when">${s.local ? `<span class="chip later">${ICON.device.replace('<svg', '<svg width="11" height="11"')} device</span>` : `<span class="chip">cloud</span>`}<span>${timeAgo(s.updatedAt)}</span><span>· ${s.changes} change${s.changes === 1 ? '' : 's'}</span></div></div>
      <label class="check ${sel ? 'on' : ''}"><input type="checkbox" data-act="select" ${sel ? 'checked' : ''} aria-label="Select for comparison">Compare</label>
    </div>
    ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
    <div class="metrics">
      <div class="metric"><div class="k">Price</div><div class="v">${inr(h.price)}</div>${delta(h.price, B.price, { better: 'none' })}</div>
      <div class="metric"><div class="k">Revenue</div><div class="v">${inr(h.revenue)}</div>${delta(h.revenue, B.revenue)}</div>
      <div class="metric"><div class="k">Payback</div><div class="v">${h.payback === null ? 'Never' : num(h.payback)}</div>${delta(h.payback, B.payback, { better: 'down', kind: 'count' })}</div>
      <div class="metric"><div class="k">Profit/shirt</div><div class="v">${inr(h.profit)}</div>${delta(h.profit, B.profit)}</div>
      <div class="metric"><div class="k">Investment</div><div class="v">${inr(h.total)}</div>${delta(h.total, B.total, { better: 'down' })}</div>
      <div class="metric"><div class="k">Margin</div><div class="v">${pct(h.margin)}</div>${delta(h.margin, B.margin, { kind: 'pct' })}</div>
    </div>
    <div class="actions"><button class="btn sm primary" data-act="open">${ICON.open}Open</button><button class="btn sm" data-act="dup">${ICON.copy}Duplicate</button><button class="btn sm" data-act="card-menu" aria-label="More options" style="flex:none">${ICON.more}</button></div>
  </div>`;
}

async function openSim(id) {
  if (isDirty() && state.draft.id !== id && !(await confirmSheet({ title: 'Replace the current simulation?', body: 'Your simulator has unsaved changes. Opening another simulation will discard them.', ok: 'Open anyway', danger: true }))) return;
  try {
    const sim = await storage.get(id);
    const inputs = sanitizeInputs(sim.inputs);
    state.draft = { id: sim.id, name: sim.name, note: sim.note, inputs, savedJSON: JSON.stringify(inputs), where: sim.local ? 'device' : 'cloud' };
    renderSimulate();
    location.hash = '#/simulate';
    toast(`Opened “${sim.name}”`);
  } catch (e) { toast(e.status === 404 ? 'That simulation no longer exists' : e.message, { error: true }); }
}

async function shareSim(s) {
  const url = `${location.origin}${location.pathname}?sim=${encodeURIComponent(s.id)}`;
  try {
    if (navigator.share) { await navigator.share({ title: `CEA · ${s.name}`, text: `Cost estimate: ${s.name}`, url }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { prompt('Copy this link', url); }
}

function cardMenu(s) {
  openSheet(`<h2 id="sheet-title">${esc(s.name)}</h2><p class="lead">Updated ${timeAgo(s.updatedAt)}</p>
    <div class="menu-list">
      <button data-m="open">${ICON.open}Open in simulator</button>
      <button data-m="rename">${ICON.edit}Rename & notes</button>
      <button data-m="dup">${ICON.copy}Duplicate</button>
      ${s.local ? '' : `<button data-m="share">${ICON.share}Share link</button>`}
      <button data-m="csv">${ICON.download}Export CSV</button>
      <button data-m="delete" class="danger">${ICON.trash}Delete</button>
    </div>`, (root) => {
    root.onclick = async (e) => {
      const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return;
      if (m === 'rename') return renameSheet(s);
      closeSheet();
      if (m === 'open') openSim(s.id);
      if (m === 'dup') duplicateSim(s);
      if (m === 'share') shareSim(s);
      if (m === 'csv') { try { const full = await storage.get(s.id); download(`${slug(full.name)}.csv`, toCSV(full)); } catch (err) { toast(err.message, { error: true }); } }
      if (m === 'delete') deleteSim(s);
    };
  });
}

function renameSheet(s) {
  openSheet(`<h2 id="sheet-title">Rename & notes</h2><form data-form="rename">
    <div class="form-field"><label for="rn-name">Name</label><input type="text" id="rn-name" name="name" required maxlength="${LIMITS.name}" value="${esc(s.name)}"></div>
    <div class="form-field"><label for="rn-note">Notes</label><textarea id="rn-note" name="note" maxlength="${LIMITS.note}">${esc(s.note || '')}</textarea></div>
    <button class="btn primary" style="width:100%">${ICON.save}Save</button></form>`, (root) => {
    $('form', root).onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const { simulation } = await storage.update(s.id, { name: String(fd.get('name')), note: String(fd.get('note')) });
        if (state.draft.id === s.id) { state.draft.name = simulation.name; state.draft.note = simulation.note; saveDraft(); if ($('#sim-name')) $('#sim-name').textContent = simulation.name; }
        closeSheet(); toast('Updated'); loadSims();
      } catch (err) { toast(err.message, { error: true }); }
    };
  });
}

async function duplicateSim(s) {
  try {
    const full = await storage.get(s.id);
    const { simulation } = await storage.create({ name: `${full.name} (copy)`.slice(0, LIMITS.name), note: full.note, inputs: full.inputs });
    toast(`Duplicated as “${simulation.name}”`); loadSims();
  } catch (e) { toast(e.message, { error: true }); }
}

async function deleteSim(s) {
  if (!(await confirmSheet({ title: `Delete “${s.name}”?`, body: s.local ? 'It will be removed from this device.' : 'It will be removed for everyone. This cannot be undone.', ok: 'Delete', danger: true }))) return;
  try {
    await storage.remove(s.id);
    state.selected.delete(s.id);
    if (state.draft.id === s.id) { state.draft.id = null; state.draft.savedJSON = null; saveDraft(); }
    toast('Deleted'); loadSims();
  } catch (e) { toast(e.message, { error: true }); }
}

function compareSheet() {
  const sims = [...state.selected].map((id) => state.sims.find((s) => s.id === id)).filter(Boolean);
  const cols = [{ name: 'Sheet', h: { price: B.price, batch: B.batch, total: B.total, minimum: B.mustTotal, productCost: B.productCost, profit: B.profit, margin: B.margin, revenue: B.revenue, batchProfit: B.batchProfit, payback: B.payback } }, ...sims.map((s) => ({ name: s.name, h: s.headline, id: s.id }))];
  const rows = [
    ['Selling price', 'price', 'money', 'none'], ['Shirts in batch', 'batch', 'count', 'none'], ['Total investment', 'total', 'money', 'down'],
    ['Minimum to launch', 'minimum', 'money', 'down'], ['Cost per shirt', 'productCost', 'money', 'down'], ['Profit per shirt', 'profit', 'money', 'up'],
    ['Margin', 'margin', 'pct', 'up'], ['Revenue (whole batch)', 'revenue', 'money', 'up'], ['Profit (whole batch)', 'batchProfit', 'money', 'up'], ['Shirts to recover', 'payback', 'count', 'down'],
  ];
  const fmt = (v, k) => (v === null ? 'Never' : k === 'money' ? inr(v) : k === 'pct' ? pct(v) : num(v));
  openSheet(`<h2 id="sheet-title">Compare</h2><p class="lead">Each simulation against your sheet. Green = best in the row.</p>
    <div style="overflow-x:auto;margin:0 -4px"><table class="cmp-table"><thead><tr><th></th>${cols.map((c) => `<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(([label, key, kind, better]) => {
      const vals = cols.map((c) => c.h[key]);
      const valid = vals.filter((x) => x !== null && x !== undefined);
      const best = better === 'none' || valid.length < 2 || new Set(valid).size === 1 ? null : better === 'up' ? Math.max(...valid) : Math.min(...valid);
      return `<tr><td>${label}</td>${cols.map((c, i) => `<td class="${best !== null && vals[i] === best ? 'win' : ''}">${fmt(vals[i], kind)}${i ? `<br>${delta(vals[i], cols[0].h[key], { better: better === 'none' ? 'none' : better, kind: kind === 'pct' ? 'pct' : kind === 'count' ? 'count' : 'money' })}` : ''}</td>`).join('')}</tr>`;
    }).join('')}
    </tbody></table></div>
    <div class="btn-row" style="margin-top:14px">${sims.map((s) => `<button class="btn sm" data-open="${esc(s.id)}" style="flex:1">${ICON.open}Open ${esc(s.name.slice(0, 18))}</button>`).join('')}</div>`, (root) => {
    root.onclick = (e) => { const b = e.target.closest('[data-open]'); if (b) { closeSheet(); openSim(b.dataset.open); } };
  });
}

function bindSaved() {
  const v = $('#view-saved');
  v.addEventListener('input', (e) => {
    if (e.target.id === 'saved-q') { state.saved.q = e.target.value; const pos = e.target.selectionStart; renderSaved(); const i = $('#saved-q'); i.focus(); i.setSelectionRange(pos, pos); }
  });
  v.addEventListener('change', (e) => {
    if (e.target.id === 'saved-sort') { state.saved.sort = e.target.value; renderSaved(); }
    if (e.target.dataset.act === 'select') {
      const id = e.target.closest('[data-sim]').dataset.sim;
      if (e.target.checked) {
        if (state.selected.size >= 3) { e.target.checked = false; return toast('Compare up to 3 at a time', { error: true }); }
        state.selected.add(id);
      } else state.selected.delete(id);
      renderSaved();
    }
  });
  v.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]'); if (!a || a.dataset.act === 'select') return;
    const card = a.closest('[data-sim]');
    const s = card && state.sims.find((x) => x.id === card.dataset.sim);
    const act = a.dataset.act;
    if (act === 'open') openSim(s.id);
    if (act === 'dup') duplicateSim(s);
    if (act === 'card-menu') cardMenu(s);
    if (act === 'clear-sel') { state.selected.clear(); renderSaved(); }
    if (act === 'compare') compareSheet();
    if (act === 'sync') {
      a.disabled = true;
      try { const n = await storage.syncLocal(); toast(`Uploaded ${n} simulation${n === 1 ? '' : 's'}`); if (state.draft.id?.startsWith('local-')) { state.draft.id = null; state.draft.savedJSON = null; saveDraft(); } }
      catch (err) { toast(err.message, { error: true }); }
      loadSims();
    }
  });
}

// ============================================================ CSV export

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'cea';
function toCSV(sim) {
  const r = compute(sim.inputs);
  const q = (x) => { const s = String(x ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = [
    ['CEA — Cost Estimating Application'], ['Simulation', sim.name], ...(sim.note ? [['Notes', sim.note]] : []), ['Exported', new Date().toLocaleString('en-IN')], [],
    ['STARTUP ESTIMATE'], ['Item', 'Category', 'Priority', 'Included', 'Qty', 'Unit cost (₹)', 'Total (₹)', 'Sheet qty', 'Sheet unit cost (₹)', 'Sheet total (₹)', 'Notes'],
    ...r.lines.map((l) => { const b = ITEM_BY_ID[l.id]; return [l.name, l.category, l.priority, l.off ? 'No' : 'Yes', l.qty, l.unit, l.total, b ? b.qty : '', b ? b.unit : '', b ? b.qty * b.unit : '', l.note || '']; }),
    [], ['TOTALS BY CATEGORY', 'Simulation (₹)', 'Sheet (₹)'], ...CATEGORIES.map((c) => [c, r.byCategory[c], B.byCategory[c]]),
    ['TOTAL ESTIMATE (all items)', r.total, B.total], ['Must-have items only', r.mustTotal, B.mustTotal],
    [], ['SUMMARY', 'Simulation', 'Sheet'],
    ['Selling price per T-shirt', r.price, B.price],
    ...PER_SHIRT.map((c) => [`Cost per shirt: ${c.label}`, r.perShirt[c.key], B.perShirt[c.key]]),
    ...r.inputs.custom.filter((c) => c.perShirt && !c.off).map((c) => [`Cost per shirt: ${c.name}`, c.unit, 0]),
    ['PRODUCT COST (packed shirt)', r.productCost, B.productCost], ['PROFIT PER SHIRT', r.profit, B.profit], ['Profit margin', r.margin.toFixed(4), B.margin.toFixed(4)],
    ['Shirts in launch batch', r.batch, B.batch], ['Revenue if whole batch sells', r.revenue, B.revenue], ['Profit if whole batch sells', r.batchProfit, B.batchProfit],
    ['Spent on one-time equipment & setup', r.oneTime, B.oneTime], ['Shirts to recover the full investment', r.payback ?? 'Never — losing money per shirt', B.payback],
    ['Profit per shirt with DTF cost halved', r.dtfHalved.profit, B.dtfHalved.profit], ['Shirts to recover (DTF halved)', r.dtfHalved.payback ?? 'Loss', B.dtfHalved.payback],
    [], ['WHAT IF? Selling price', 'Profit per shirt', 'Shirts to recover investment'], ...r.whatIf.map((w) => [w.price, w.profit, w.payback ?? 'Loss']),
  ];
  return '﻿' + rows.map((row) => row.map(q).join(',')).join('\n');
}

// ============================================================ chrome: routing, theme, storage pill

function updateStoragePill() {
  const p = $('#storage-pill');
  p.className = `pill ${storage.mode === 'cloud' ? 'cloud' : 'device'}`;
  $('.lbl', p).textContent = storage.mode === 'cloud' ? 'Cloud' : 'This device';
  p.title = storage.mode === 'cloud' ? 'Simulations are saved to the cloud and shared with everyone' : 'Cloud storage not connected — simulations are saved in this browser';
}

const THEMES = ['auto', 'light', 'dark'];
function applyTheme(t) {
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  try { localStorage.setItem('cea.theme', t); } catch {}
  const btn = $('#theme-btn');
  btn.innerHTML = ICON[t === 'auto' ? 'auto' : t === 'light' ? 'sun' : 'moon'];
  btn.setAttribute('aria-label', `Theme: ${t}. Change theme`);
  btn.title = `Theme: ${t}`;
  $$('[data-chart="payback"]').forEach((el) => el.offsetParent && el._redraw?.());
}

const VIEWS = ['summary', 'estimate', 'simulate', 'saved'];
function route() {
  const v = (location.hash.match(/^#\/(\w+)/) || [])[1];
  const view = VIEWS.includes(v) ? v : 'summary';
  const changed = state.view !== view;
  state.view = view;
  $$('.view').forEach((el) => el.classList.toggle('active', el.id === `view-${view}`));
  $$('.nav a').forEach((a) => { const on = a.dataset.view === view; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  if (view === 'saved') renderSaved();
  if (view === 'simulate') { if (!$('#view-simulate').innerHTML) renderSimulate(); else $$('#view-simulate [data-chart="payback"]').forEach((el) => el._redraw?.()); }
  if (view === 'summary') $$('#view-summary [data-chart="payback"]').forEach((el) => el._redraw?.());
  if (changed) window.scrollTo({ top: 0 });
}

document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) location.hash = `#/${g.dataset.go}`; });
addEventListener('beforeunload', (e) => { if (state.draft.id && isDirty()) { e.preventDefault(); e.returnValue = ''; } });

async function boot() {
  $$('[data-icon]').forEach((el) => { el.outerHTML = ICON[el.dataset.icon]; });
  let theme = 'auto'; try { theme = localStorage.getItem('cea.theme') || 'auto'; } catch {}
  applyTheme(THEMES.includes(theme) ? theme : 'auto');
  $('#theme-btn').onclick = () => { const cur = document.documentElement.dataset.theme || 'auto'; applyTheme(THEMES[(THEMES.indexOf(cur) + 1) % 3]); };

  renderSummary(); renderEstimate();
  bindEstimate(); bindSimulate(); bindSaved();
  addEventListener('hashchange', route);
  route();

  await storage.init();
  updateStoragePill();
  await loadSims();

  const shared = new URLSearchParams(location.search).get('sim');
  if (shared) {
    history.replaceState(null, '', location.pathname + '#/simulate');
    await openSim(shared);
  }
}
boot();

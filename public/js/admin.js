import { PRODUCTS, TEE_COLORS } from './catalog.js';
import { inr } from './pricing.js';
import { teeSVG } from './tee.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let key = sessionStorage.getItem('fier_admin') || '';
let stages = [];

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data;
}

const printLink = (i) => `/api/print/${i.productId}.svg?color=${i.color}`;

async function load() {
  try {
    const [{ orders, stages: st }, { subscribers }] = await Promise.all([api('/api/admin/orders'), api('/api/admin/subscribers')]);
    stages = st;
    sessionStorage.setItem('fier_admin', key);
    $('#login').hidden = true;
    $('#app').hidden = false;
    render(orders, subscribers);
  } catch (e) {
    $('#login').hidden = false;
    $('#app').hidden = true;
    if (key) $('#err').textContent = e.message;
  }
}

function render(orders, subscribers) {
  const live = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'pending_payment');
  const revenue = live.reduce((s, o) => s + o.total, 0);
  const tees = live.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  const toPrint = live.filter((o) => ['confirmed', 'printing'].includes(o.status)).length;
  $('#stats').innerHTML = [
    [inr(revenue), 'Revenue (confirmed)'],
    [live.length, 'Confirmed orders'],
    [tees, 'Tees sold'],
    [toPrint, 'In print queue'],
    [subscribers.length, 'Inner circle subscribers'],
  ].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('');

  $('#orders').innerHTML = orders.length
    ? `<table><thead><tr><th>Order</th><th>Customer</th><th>Items (click for DTF file)</th><th>Total</th><th>Status</th><th>Courier / AWB</th></tr></thead><tbody>${orders
        .map(
          (o) => `<tr data-id="${esc(o.id)}">
        <td><b>${esc(o.id)}</b><br/><small class="muted">${new Date(o.createdAt).toLocaleString('en-IN')}</small></td>
        <td>${esc(o.address.name)}<br/><small class="muted">${esc(o.email)} · ${esc(o.address.phone)}<br/>${esc(o.address.line1)}${o.address.line2 ? ', ' + esc(o.address.line2) : ''}, ${esc(o.address.city)}, ${esc(o.address.state)} ${esc(o.address.pincode)}</small></td>
        <td class="items">${o.items.map((i) => `${i.qty}× ${esc(i.name)} · ${i.fit === 'women' ? 'Women' : 'Men'} ${i.size} · ${esc(i.colorName)} <a href="${printLink(i)}">⬇ DTF</a>`).join('<br/>')}</td>
        <td>${inr(o.total)}<br/><small class="muted">${o.paymentMethod.toUpperCase()} · ${esc(o.paymentStatus)}${o.totals.coupon ? ' · ' + esc(o.totals.coupon.code) : ''}</small></td>
        <td><select data-status>${[...stages, { key: 'cancelled', label: 'Cancelled' }]
          .map((s) => `<option value="${s.key}" ${s.key === o.status ? 'selected' : ''}>${s.label}</option>`)
          .join('')}${o.status === 'pending_payment' ? '<option selected disabled>Awaiting payment</option>' : ''}</select>
          <br/><small class="muted">${o.manualTracking ? 'manual' : 'auto-simulated'}</small></td>
        <td><input data-courier placeholder="Courier" value="${esc(o.courier || '')}"/><br/><input data-awb placeholder="AWB" value="${esc(o.awb || '')}" style="margin-top:6px"/></td>
      </tr>`,
        )
        .join('')}</tbody></table>`
    : '<p class="muted" style="padding:20px">No orders yet. Share the boutique!</p>';

  $('#print').innerHTML = `<p class="muted">Print-ready vector files (12" × 14.4", transparent background). Open in Illustrator/Inkscape, convert text to outlines, then send to your DTF RIP.</p>
    <div class="designs">${PRODUCTS.filter((p) => p.art).map(
      (p) => `<div class="d">${teeSVG({ product: p, color: p.colors[0], detail: 'low' })}<b>${esc(p.name)}</b><br/>${p.colors
        .map((c) => `<a href="/api/print/${p.id}.svg?color=${c}">⬇ for ${TEE_COLORS[c].name}</a>`)
        .join('')}${p.back ? `<a href="/api/print/${p.id}.svg?side=back">⬇ back print</a>` : ''}</div>`,
    ).join('')}</div>`;

  $('#subs').innerHTML = `<div class="row gap" style="margin-bottom:12px"><button class="btn primary sm" id="csv">Export CSV</button></div>
    <div class="wrap"><table><thead><tr><th>Email</th><th>Name</th><th>Joined</th></tr></thead><tbody>${subscribers
      .map((s) => `<tr><td>${esc(s.email)}</td><td>${esc(s.name)}</td><td>${new Date(s.at).toLocaleString('en-IN')}</td></tr>`)
      .join('')}</tbody></table></div>`;
  $('#csv').onclick = () => {
    const rows = [['email', 'name', 'joined'], ...subscribers.map((s) => [s.email, s.name, s.at])];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'rare-collections-subscribers.csv' });
    a.click();
  };
}

async function update(tr, body) {
  try {
    await api(`/api/admin/orders/${tr.dataset.id}`, { method: 'POST', body });
    load();
  } catch (e) {
    alert(e.message);
  }
}

$('#orders').addEventListener('change', (e) => {
  const tr = e.target.closest('tr');
  if (e.target.matches('[data-status]')) update(tr, { status: e.target.value });
  if (e.target.matches('[data-courier]')) update(tr, { courier: e.target.value });
  if (e.target.matches('[data-awb]')) update(tr, { awb: e.target.value });
});
$('#login').onsubmit = (e) => {
  e.preventDefault();
  key = new FormData(e.target).get('key');
  load();
};
$('#refresh').onclick = load;
$('#logout').onclick = () => {
  sessionStorage.removeItem('fier_admin');
  key = '';
  load();
};
document.querySelectorAll('[data-tab]').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x === b));
    for (const id of ['orders', 'print', 'subs']) $('#' + id).hidden = id !== b.dataset.tab;
  };
});
load();

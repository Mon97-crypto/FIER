// Hand-built, dependency-free charts. Every chart has hover/tap tooltips and text equivalents.
import { inr, compact, esc } from './util.js';

const NS = 'http://www.w3.org/2000/svg';

function tooltipFor(wrap) {
  let tip = wrap.querySelector(':scope > .tooltip');
  if (!tip) { tip = document.createElement('div'); tip.className = 'tooltip'; tip.setAttribute('role', 'status'); wrap.appendChild(tip); }
  return tip;
}
function placeTip(wrap, tip, x, y) {
  const w = wrap.clientWidth, tw = tip.offsetWidth || 160, th = tip.offsetHeight || 60;
  let left = x + 12; if (left + tw > w) left = x - tw - 12; if (left < 0) left = Math.max(0, Math.min(w - tw, x - tw / 2));
  let top = y - th - 10; if (top < -10) top = y + 14;
  tip.style.left = `${left}px`; tip.style.top = `${top}px`;
}

/** Horizontal part-to-whole bar. segments: [{ label, value, color?, cls?, detail? }] */
export function stackBar(el, segments, { total } = {}) {
  const sum = total ?? segments.reduce((a, s) => a + Math.max(0, s.value), 0);
  el.classList.add('chart-wrap');
  el.innerHTML = `<div class="stackbar" role="img" aria-label="${esc(segments.map((s) => `${s.label} ${inr(s.value)}`).join(', '))}">${segments
    .filter((s) => s.value > 0)
    .map((s, i) => `<div class="seg-fill ${s.cls || ''}" tabindex="0" data-i="${i}" style="flex-grow:${s.value};${s.color ? `background:${s.color}` : ''}"></div>`)
    .join('')}</div>`;
  const shown = segments.filter((s) => s.value > 0);
  const tip = tooltipFor(el);
  const show = (e) => {
    const seg = e.target.closest('.seg-fill'); if (!seg) return;
    const s = shown[+seg.dataset.i];
    tip.innerHTML = `<div class="t-head">${esc(s.label)}</div><div class="t-row"><span>Amount</span><span>${inr(s.value)}</span></div><div class="t-row"><span>Share</span><span>${sum ? ((s.value / sum) * 100).toFixed(1) : 0}%</span></div>${s.detail ? `<div class="t-row"><span>${esc(s.detail)}</span><span></span></div>` : ''}`;
    const r = seg.getBoundingClientRect(), w = el.getBoundingClientRect();
    tip.classList.add('show');
    placeTip(el, tip, r.left - w.left + r.width / 2, r.top - w.top);
  };
  const hide = () => tip.classList.remove('show');
  el.addEventListener('pointerover', show);
  el.addEventListener('focusin', show);
  el.addEventListener('pointerleave', hide);
  el.addEventListener('focusout', hide);
}

function niceStep(range, count) {
  const raw = range / count, mag = 10 ** Math.floor(Math.log10(raw)), n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

/**
 * Payback chart: cumulative profit as shirts sell, against the investment line.
 * series: [{ label, profit, color, dashed? }] (first = primary). Straight lines, so endpoints suffice.
 */
export function paybackChart(el, { series, investment, batch }) {
  el.classList.add('chart-wrap');
  const W = Math.max(280, el.clientWidth || 340), H = Math.round(Math.min(260, Math.max(190, W * 0.56)));
  const m = { t: 18, r: 14, b: 26, l: 46 };
  const pays = series.map((s) => (s.profit > 0 ? investment / s.profit : null)).filter((x) => x !== null);
  const xmaxRaw = Math.max(batch || 0, ...pays.map((p) => p * 1.18), 50);
  const xStep = niceStep(xmaxRaw, 4);
  const xmax = Math.ceil(xmaxRaw / xStep) * xStep;
  const ends = series.map((s) => s.profit * xmax);
  let ymin = Math.min(0, ...ends), ymax = Math.max(investment * 1.15, ...ends, 1);
  const yStep = niceStep(ymax - ymin, 4);
  ymin = Math.floor(ymin / yStep) * yStep; ymax = Math.ceil(ymax / yStep) * yStep;
  const x = (v) => m.l + (v / xmax) * (W - m.l - m.r);
  const y = (v) => m.t + (1 - (v - ymin) / (ymax - ymin)) * (H - m.t - m.b);

  let g = '';
  g += '<g class="grid">';
  for (let v = ymin; v <= ymax + 1e-9; v += yStep) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`;
  g += '</g><g class="axis">';
  for (let v = ymin; v <= ymax + 1e-9; v += yStep) g += `<text x="${m.l - 6}" y="${y(v) + 3.5}" text-anchor="end">${compact(v)}</text>`;
  for (let v = 0; v <= xmax + 1e-9; v += xStep) g += `<text x="${x(v)}" y="${H - 8}" text-anchor="middle">${Math.round(v)}</text>`;
  g += '</g>';
  g += `<line class="baseline" x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}"/>`;
  // investment line
  g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(investment)}" y2="${y(investment)}" stroke="var(--ink-2)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  g += `<text x="${m.l + 4}" y="${y(investment) - 6}" text-anchor="start" style="font:600 10.5px var(--mono);fill:var(--ink-2)">Investment ${compact(investment)}</text>`;
  // batch marker
  if (batch > 0 && batch <= xmax) {
    g += `<line x1="${x(batch)}" x2="${x(batch)}" y1="${m.t}" y2="${H - m.b}" stroke="var(--line-strong)" stroke-width="1" stroke-dasharray="2 3"/>`;
    g += `<text x="${x(batch) + 4}" y="${m.t + 8}" style="font:600 10px var(--mono);fill:var(--muted)">batch ${batch}</text>`;
  }
  // lines (draw secondary first so primary sits on top)
  [...series].reverse().forEach((s) => {
    g += `<line x1="${x(0)}" y1="${y(0)}" x2="${x(xmax)}" y2="${y(s.profit * xmax)}" stroke="${s.color}" stroke-width="2" stroke-linecap="round" ${s.dashed ? 'stroke-dasharray="6 5"' : ''}/>`;
  });
  // break-even markers + direct labels
  const labelled = new Set();
  series.forEach((s, i) => {
    if (s.profit <= 0) return;
    const p = investment / s.profit;
    if (p > xmax) return;
    const n = Math.ceil(p - 1e-9);
    g += `<circle cx="${x(p)}" cy="${y(investment)}" r="5" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`;
    if (labelled.has(n)) return;
    labelled.add(n);
    const lx = Math.min(W - m.r - 30, Math.max(m.l + 30, x(p)));
    g += `<text x="${lx}" y="${y(investment) + 20 + (labelled.size - 1) * 14}" text-anchor="middle" style="font:700 11px var(--mono);fill:var(--ink)">${n} shirts</text>`;
  });
  g += `<g class="hover" style="display:none"><line class="hx" y1="${m.t}" y2="${H - m.b}" stroke="var(--ink)" stroke-width="1"/>${series.map((s) => `<circle r="4.5" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`).join('')}</g>`;
  g += `<rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent" class="hit"/>`;

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(`Cumulative profit vs shirts sold. Investment ${inr(investment)}. ` + series.map((s) => `${s.label}: ${s.profit > 0 ? `recovers after ${Math.ceil(investment / s.profit - 1e-9)} shirts` : 'never recovers'}`).join('. '))}">${g}</svg>`;
  const svg = el.querySelector('svg'), hover = svg.querySelector('.hover'), hx = hover.querySelector('.hx'), dots = hover.querySelectorAll('circle');
  const tip = tooltipFor(el);
  const move = (e) => {
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const n = Math.max(0, Math.min(xmax, Math.round(((px - m.l) / (W - m.l - m.r)) * xmax)));
    hover.style.display = '';
    hx.setAttribute('x1', x(n)); hx.setAttribute('x2', x(n));
    series.forEach((s, i) => { dots[i].setAttribute('cx', x(n)); dots[i].setAttribute('cy', y(s.profit * n)); });
    tip.innerHTML = `<div class="t-head">${n} shirt${n === 1 ? '' : 's'} sold</div>` + series.map((s) => {
      const c = s.profit * n;
      return `<div class="t-row"><span><i class="sw" style="background:${s.color}"></i>${esc(s.label)}</span><span>${inr(c, { decimals: 0 })}</span></div><div class="t-row"><span>&nbsp;&nbsp;vs investment</span><span>${inr(c - investment, { sign: true, decimals: 0 })}</span></div>`;
    }).join('');
    tip.classList.add('show');
    placeTip(el, tip, (x(n) / W) * r.width, (y(series[0].profit * n) / H) * r.height);
  };
  const leave = () => { hover.style.display = 'none'; tip.classList.remove('show'); };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', leave);
}

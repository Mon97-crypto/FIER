// Formatting, escaping, icons, deltas.

const inrFmt0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inrFmt2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** ₹ with Indian grouping. Whole numbers stay whole; fractions get 2 decimals (₹223.50). */
export function inr(n, { sign = false, decimals } = {}) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const neg = n < 0;
  const abs = Math.abs(n);
  const whole = Math.abs(abs - Math.round(abs)) < 1e-9;
  const body = (decimals === 0 || (decimals === undefined && whole) ? inrFmt0.format(Math.round(abs)) : inrFmt2.format(abs));
  return `${neg ? '−' : sign && n > 0 ? '+' : ''}₹${body}`;
}
export const num = (n) => (n === null || n === undefined ? '—' : Number.isInteger(n) ? inrFmt0.format(n) : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n));
export const pct = (n, d = 1) => `${(n * 100).toFixed(d)}%`;
export function compact(n) {
  const a = Math.abs(n), s = n < 0 ? '−' : '';
  if (a >= 1e7) return `${s}₹${+(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${s}₹${+(a / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `${s}₹${+(a / 1e3).toFixed(1)}k`;
  return `${s}₹${Math.round(a)}`;
}
export const shirts = (n) => (n === null ? 'Never' : `${inrFmt0.format(n)} shirt${n === 1 ? '' : 's'}`);

/**
 * A change badge vs. the sheet. better: 'up' (more is good), 'down' (less is good) or 'none'.
 * kind: 'money' | 'pct' | 'count'
 */
export function delta(cur, base, { better = 'up', kind = 'money', cls = 'delta' } = {}) {
  if (base === undefined) return '';
  if (cur === null && base === null) return `<span class="${cls} flat">±0</span>`;
  if (cur === null) return `<span class="${cls} ${better === 'down' ? 'down' : 'up'}">no payback</span>`;
  if (base === null) return `<span class="${cls} ${better === 'down' ? 'up' : 'down'}">now pays back</span>`;
  const d = cur - base;
  if (Math.abs(d) < 1e-9) return `<span class="${cls} flat">±0</span>`;
  const good = better === 'none' ? null : (d > 0) === (better === 'up');
  const dir = good === null ? 'flat' : good ? 'up' : 'down';
  const arrow = d > 0 ? '▲' : '▼';
  let txt;
  if (kind === 'pct') txt = `${d > 0 ? '+' : '−'}${Math.abs(d * 100).toFixed(1)} pts`;
  else if (kind === 'count') txt = `${d > 0 ? '+' : '−'}${inrFmt0.format(Math.abs(d))}`;
  else txt = inr(d, { sign: true });
  return `<span class="${cls} ${dir}">${arrow} ${txt.replace(/^[+−]/, '')}</span>`;
}

export const CAT_COLOR = {
  Equipment: 'var(--c1)', Workspace: 'var(--c2)', Legal: 'var(--c3)', Online: 'var(--c4)',
  Inventory: 'var(--c5)', Packaging: 'var(--c6)', Branding: 'var(--c7)',
};

export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICON = {
  summary: P('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>'),
  sheet: P('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18"/>'),
  simulate: P('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  saved: P('<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>'),
  search: P('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  chevron: P('<path d="M6 9l6 6 6-6"/>'),
  sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: P('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  auto: P('<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'),
  save: P('<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M8 3v5h7M8 21v-7h8v7"/>'),
  reset: P('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  x: P('<path d="M6 6l12 12M18 6L6 18"/>'),
  more: P('<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>'),
  copy: P('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'),
  share: P('<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4M12 2v14"/>'),
  download: P('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>'),
  trash: P('<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>'),
  edit: P('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>'),
  open: P('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  cloud: P('<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1 0 8z"/>'),
  device: P('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'),
  info: P('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h0"/>'),
  alert: P('<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17h0"/>'),
  check: P('<path d="M5 12l5 5 9-10"/>'),
  print: P('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>'),
  layers: P('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
  tag: P('<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>'),
  shirt: P('<path d="M8 3l-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z"/>'),
  press: P('<rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M6 14V8h12v6M12 8V3"/>'),
  compare: P('<path d="M8 3v18M16 3v18M3 8h5M16 16h5"/>'),
  sync: P('<path d="M21 12a9 9 0 0 1-15.4 6.4L3 16M3 12a9 9 0 0 1 15.4-6.4L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>'),
};

// CEA calculation engine. Pure functions, shared by the browser and the API,
// so a saved simulation's numbers are identical everywhere.
// Each result is annotated with the spreadsheet cell it reproduces.

import { CATEGORIES, ITEMS, ITEM_BY_ID, PER_SHIRT, SELLING_PRICE, WHAT_IF_PRICES } from './sheet.js';

export const LIMITS = { maxNumber: 1e9, maxCustom: 40, maxWhatIf: 12, name: 80, note: 1000 };

/** The untouched spreadsheet as simulation inputs. */
export function baselineInputs() {
  return {
    sellingPrice: SELLING_PRICE,
    items: Object.fromEntries(ITEMS.map((i) => [i.id, { qty: i.qty, unit: i.unit, off: false }])),
    custom: [],
    whatIfPrices: [...WHAT_IF_PRICES],
    soldQty: null, // null = "whole batch sells", exactly like the sheet
  };
}

const num = (v, fallback = 0) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(LIMITS.maxNumber, Math.max(0, n));
};
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Coerces anything (form state, JSON from the network) into valid inputs. Never throws. */
export function sanitizeInputs(raw) {
  const base = baselineInputs();
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = { ...base, items: {} };
  out.sellingPrice = num(src.sellingPrice, base.sellingPrice);
  for (const item of ITEMS) {
    const s = (src.items && src.items[item.id]) || {};
    out.items[item.id] = {
      qty: num(s.qty, item.qty),
      unit: num(s.unit, item.unit),
      off: item.locked ? false : Boolean(s.off),
    };
  }
  out.custom = (Array.isArray(src.custom) ? src.custom : []).slice(0, LIMITS.maxCustom).map((c, i) => ({
    id: str(c && c.id, 40) || `custom-${i + 1}`,
    name: str(c && c.name, LIMITS.name) || `Custom item ${i + 1}`,
    category: CATEGORIES.includes(c && c.category) ? c.category : 'Equipment',
    priority: c && c.priority === 'Later' ? 'Later' : 'Must',
    qty: num(c && c.qty, 1),
    unit: num(c && c.unit, 0),
    perShirt: Boolean(c && c.perShirt),
    off: Boolean(c && c.off),
  }));
  const prices = (Array.isArray(src.whatIfPrices) ? src.whatIfPrices : base.whatIfPrices)
    .map((p) => num(p, NaN)).filter((p) => Number.isFinite(p) && p > 0);
  out.whatIfPrices = (prices.length ? prices : base.whatIfPrices).slice(0, LIMITS.maxWhatIf);
  out.soldQty = src.soldQty === null || src.soldQty === undefined || src.soldQty === '' ? null : Math.round(num(src.soldQty, 0));
  return out;
}

// Excel ROUNDUP(x, 0) for positive x, immune to float noise like 298.00000000001.
const roundUp = (x) => Math.ceil(Math.round(x * 1e6) / 1e6);
const paybackFor = (investment, profitPerShirt) => (profitPerShirt <= 0 ? null : roundUp(investment / profitPerShirt));

/** Runs both spreadsheet tabs on the given inputs. */
export function compute(rawInputs) {
  const inp = sanitizeInputs(rawInputs);

  // ---- Tab "Startup Estimate": rows 6–29, F = D × E ----
  const lines = ITEMS.map((item) => {
    const v = inp.items[item.id];
    return { ...item, qty: v.qty, unit: v.unit, off: v.off, total: v.off ? 0 : v.qty * v.unit, custom: false };
  });
  for (const c of inp.custom) {
    lines.push({ ...c, section: 'custom', note: c.perShirt ? 'Also counted in cost per shirt' : '', total: c.off ? 0 : c.qty * c.unit, custom: true });
  }
  const line = Object.fromEntries(lines.map((l) => [l.id, l]));

  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])); // F32:F38  SUMIFS by category
  let total = 0, mustTotal = 0;
  for (const l of lines) {
    byCategory[l.category] += l.total;
    total += l.total;                                   // F39  SUM(F5:F29)
    if (l.priority === 'Must') mustTotal += l.total;    // F40  SUMIFS(... "Must")
  }

  // ---- Tab "Summary" ----
  const investment = {
    equipment: byCategory.Equipment,                       // B5
    workspace: byCategory.Workspace,                       // B6
    legalDomain: byCategory.Legal + byCategory.Online,     // B7
    inventory: byCategory.Inventory,                       // B8
    packagingBranding: byCategory.Packaging + byCategory.Branding, // B9
    total,                                                 // B10
    minimum: mustTotal,                                    // B11
  };

  const batch = line.blanks.qty;                         // B34 = D21
  const perShirt = {};
  for (const comp of PER_SHIRT) {
    perShirt[comp.key] = comp.parts.reduce((sum, p) => {
      const l = line[p.id];
      if (l.off) return sum;
      if (p.mode === 'perBlank') return sum + (batch > 0 ? l.total / batch : 0); // B18 IFERROR(F22/D21, 0)
      return sum + l.unit;                                                       // B17, B19–B24
    }, 0);
  }
  for (const c of inp.custom) if (c.perShirt && !c.off) perShirt[c.id] = c.unit;
  const productCost = Object.values(perShirt).reduce((a, b) => a + b, 0); // B25

  const price = inp.sellingPrice;                        // B14
  const profit = price - productCost;                    // B30
  const margin = price > 0 ? profit / price : 0;         // B31 IFERROR(B30/B14, 0)
  const revenue = batch * price;                         // B35
  const batchProfit = batch * profit;                    // B36
  const oneTime = total - byCategory.Inventory - byCategory.Packaging - byCategory.Branding; // B37
  const payback = paybackFor(total, profit);             // B38 (null = "Never — losing money per shirt")

  const whatIf = inp.whatIfPrices.map((p) => {           // A42:C46
    const pr = p - productCost;
    return { price: p, profit: pr, payback: paybackFor(total, pr) };
  });

  const dtfProfit = profit + perShirt.dtf / 2;           // B49 = B30 + B18/2
  const dtfHalved = { profit: dtfProfit, payback: paybackFor(total, dtfProfit) }; // B50

  // Extra lever for the simulator (not in the sheet): what if only N shirts sell?
  const sold = inp.soldQty === null ? batch : inp.soldQty;
  const sales = {
    sold,
    revenue: sold * price,
    profit: sold * profit,
    net: sold * profit - total, // profit from sales minus the whole investment
  };

  return {
    inputs: inp, lines, byCategory, total, mustTotal, laterTotal: total - mustTotal,
    investment, perShirt, productCost, price, profit, margin, batch, revenue, batchProfit,
    oneTime, payback, whatIf, dtfHalved, sales,
  };
}

/** The headline numbers stored with each saved simulation (for lists and comparisons). */
export function headline(r) {
  return {
    price: r.price, revenue: r.revenue, total: r.total, minimum: r.mustTotal, productCost: r.productCost,
    profit: r.profit, margin: r.margin, batch: r.batch, batchProfit: r.batchProfit, payback: r.payback,
    salesRevenue: r.sales.revenue, sold: r.sales.sold,
  };
}

/** Lists every input that differs from the spreadsheet. */
export function diffFromBaseline(rawInputs) {
  const inp = sanitizeInputs(rawInputs);
  const base = baselineInputs();
  const changes = [];
  if (inp.sellingPrice !== base.sellingPrice) changes.push({ field: 'Selling price', from: base.sellingPrice, to: inp.sellingPrice });
  for (const item of ITEMS) {
    const a = base.items[item.id], b = inp.items[item.id];
    if (b.off) { changes.push({ id: item.id, field: `${item.name}`, from: 'included', to: 'removed' }); continue; }
    if (a.qty !== b.qty) changes.push({ id: item.id, field: `${item.name} · qty`, from: a.qty, to: b.qty });
    if (a.unit !== b.unit) changes.push({ id: item.id, field: `${item.name} · unit cost`, from: a.unit, to: b.unit, money: true });
  }
  for (const c of inp.custom) changes.push({ id: c.id, field: `${c.name} (added)`, from: 0, to: c.qty * c.unit, money: true });
  if (inp.soldQty !== null) changes.push({ field: 'Shirts sold', from: 'whole batch', to: inp.soldQty });
  return changes;
}

export { ITEM_BY_ID };

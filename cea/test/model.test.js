import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute, baselineInputs, sanitizeInputs, diffFromBaseline } from '../public/js/model.js';
import { SHEET_EXPECTED as X } from '../public/js/sheet.js';

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} != ${b}`);

test('baseline reproduces every number on the Startup Estimate tab', () => {
  const r = compute(baselineInputs());
  assert.deepEqual(r.byCategory, X.byCategory);
  assert.equal(r.total, X.total);
  assert.equal(r.mustTotal, X.mustTotal);
  assert.equal(r.laterTotal, 9000);
  assert.equal(r.lines.find((l) => l.id === 'racks').total, 7000);
  assert.equal(r.lines.find((l) => l.id === 'neck-labels').total, 750);
});

test('baseline reproduces every number on the Summary tab', () => {
  const r = compute(baselineInputs());
  for (const [k, v] of Object.entries(X.investment)) assert.equal(r.investment[k], v, k);
  assert.equal(r.investment.total, 82250);
  assert.equal(r.investment.minimum, 73250);
  assert.deepEqual(r.perShirt, X.perShirt);
  close(r.productCost, X.productCost, 'product cost');
  close(r.profit, X.profit, 'profit');
  close(r.margin, X.margin, 'margin');
  assert.equal(r.batch, X.batch);
  assert.equal(r.revenue, X.revenue);
  close(r.batchProfit, X.batchProfit, 'batch profit');
  assert.equal(r.oneTime, X.oneTime);
  assert.equal(r.payback, X.payback);
  assert.deepEqual(r.whatIf.map((w) => [w.price, w.profit, w.payback]), X.whatIf);
  close(r.dtfHalved.profit, X.dtfHalved.profit, 'dtf halved');
  assert.equal(r.dtfHalved.payback, X.dtfHalved.payback);
  assert.equal(r.sales.revenue, 49900);
  assert.equal(diffFromBaseline(baselineInputs()).length, 0);
});

test('simulating a price change flows through like the sheet', () => {
  const inp = baselineInputs();
  inp.sellingPrice = 599;
  const r = compute(inp);
  assert.equal(r.revenue, 59900);
  close(r.profit, 375.5, 'profit');
  assert.equal(r.payback, 220);
});

test('cost edits update totals, per-shirt cost and payback', () => {
  const inp = baselineInputs();
  inp.items.blanks.unit = 70;     // ₹70 blanks
  inp.items.dtf.qty = 25;         // 4 prints per meter
  inp.items['label-printer'].off = true;
  const r = compute(inp);
  assert.equal(r.total, 82250 + 500 - 6250 - 9000);
  assert.equal(r.perShirt.dtf, 62.5);
  close(r.productCost, 223.5 + 5 - 62.5, 'product cost');
  assert.equal(r.mustTotal, r.total);
});

test('loss per shirt reports no payback, like "Never — losing money per shirt"', () => {
  const inp = baselineInputs();
  inp.sellingPrice = 200;
  const r = compute(inp);
  assert.ok(r.profit < 0);
  assert.equal(r.payback, null);
  assert.equal(r.whatIf[0].payback, 299);
});

test('zero blanks does not divide by zero (IFERROR)', () => {
  const inp = baselineInputs();
  inp.items.blanks.qty = 0;
  const r = compute(inp);
  assert.equal(r.perShirt.dtf, 0);
  assert.equal(r.revenue, 0);
});

test('custom items count in investment and optionally per shirt', () => {
  const inp = baselineInputs();
  inp.custom = [{ name: 'Instagram ads', category: 'Online', qty: 1, unit: 5000 }, { name: 'Sticker', category: 'Packaging', qty: 100, unit: 2, perShirt: true }];
  const r = compute(inp);
  assert.equal(r.total, 82250 + 5200);
  assert.equal(r.investment.legalDomain, 6000);
  close(r.productCost, 225.5, 'product cost');
});

test('sanitizeInputs rejects junk', () => {
  const s = sanitizeInputs({ sellingPrice: -5, items: { blanks: { qty: 'abc', unit: 1e20, off: true } }, custom: 'x', whatIfPrices: [0, -1] });
  assert.equal(s.sellingPrice, 0);
  assert.equal(s.items.blanks.qty, 100);
  assert.equal(s.items.blanks.unit, 1e9);
  assert.equal(s.items.blanks.off, false);
  assert.deepEqual(s.custom, []);
  assert.deepEqual(s.whatIfPrices, [499, 549, 599, 699, 799]);
});

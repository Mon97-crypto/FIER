// Shared pricing rules — imported by both the browser and the server,
// so the cart you see is exactly the total you are charged.

export const UNIT_PRICE = 499;
export const EXTRA_UNIT_PRICE = 399; // every tee beyond the Squad bundle
export const FREE_SHIPPING_MIN = 799;
export const SHIPPING_FEE = 59;

export const BUNDLES = [
  { qty: 1, name: 'Solo', price: 499, blurb: 'One rare piece. One vow.', emoji: '' },
  { qty: 2, name: 'Duo', price: 899, blurb: 'Rama & Lakshmana energy. Any 2 designs.', emoji: '' },
  { qty: 3, name: 'Trio', price: 1299, blurb: 'Bring the whole Ayodhya crew. Any 3.', emoji: '' },
  { qty: 4, name: 'Squad', price: 1599, blurb: 'Vanara Sena mode. Any 4, then ₹399 for every tee after.', emoji: '' },
];

export const COUPONS = {
  FEARNONE10: { kind: 'percent', value: 10, label: '10% off — Vanara Sena welcome' },
  AGNI5: { kind: 'percent', value: 5, label: '5% off — Agni Chakra win' },
  AGNI15: { kind: 'percent', value: 15, min: 899, label: '15% off — Agni Chakra win' },
  SETU50: { kind: 'flat', value: 50, label: '₹50 off — Agni Chakra win' },
  VANARA100: { kind: 'flat', value: 100, min: 899, label: '₹100 off — Agni Chakra win' },
  FREESHIP: { kind: 'shipping', label: 'Free shipping' },
  BURNBRIGHT20: { kind: 'percent', value: 20, min: 1299, label: '20% off — Midnight Flash' },
};

// The Agni Chakra (daily spin wheel). Order = wheel segments clockwise from the top.
export const SPIN_REWARDS = [
  { code: 'AGNI5', label: '5% OFF', color: '#d2552f', weight: 22 },
  { code: 'FREESHIP', label: 'FREE SHIP', color: '#e9dcc4', weight: 20 },
  { code: 'SETU50', label: '₹50 OFF', color: '#1d1611', weight: 18 },
  { code: 'FEARNONE10', label: '10% OFF', color: '#b8924f', weight: 14 },
  { code: 'VANARA100', label: '₹100 OFF', color: '#d2552f', weight: 10 },
  { code: 'AGNI15', label: '15% OFF', color: '#e9dcc4', weight: 7 },
  { code: 'SETU50', label: '₹50 OFF', color: '#1d1611', weight: 6 },
  { code: 'BURNBRIGHT20', label: '20% OFF', color: '#b8924f', weight: 3 },
];

export const TICKER = [
  'Drop 01 · Ramayana: Part 1 · each design limited to 150 pieces',
  'Every tee ₹499 · DTF printed · S to XL · men & women',
  'Duo: any 2 for ₹899',
  'Trio: any 3 for ₹1,299',
  'Squad: any 4 for ₹1,599, then ₹399 per extra tee',
  'Free shipping on ₹799+ · Cash on delivery available',
  'Spin the Agni Chakra daily for a surprise code',
  'Join the inner circle for 10% off: FEARNONE10',
  'Midnight Flash: BURNBRIGHT20 takes 20% off ₹1,299+',
];

export function bundlePrice(qty) {
  if (qty <= 0) return 0;
  if (qty <= BUNDLES.length) return BUNDLES[qty - 1].price;
  const top = BUNDLES[BUNDLES.length - 1];
  return top.price + (qty - top.qty) * EXTRA_UNIT_PRICE;
}

export function bundleNameFor(qty) {
  if (qty <= 0) return '';
  return BUNDLES[Math.min(qty, BUNDLES.length) - 1].name;
}

export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

export function computeTotals(items, couponCode = '') {
  const qty = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const mrp = qty * UNIT_PRICE;
  const subtotal = bundlePrice(qty);
  const bundleSavings = mrp - subtotal;

  let discount = 0;
  let freeShip = false;
  let coupon = null;
  let couponError = null;
  const code = String(couponCode || '').trim().toUpperCase();
  if (code && qty > 0) {
    const c = COUPONS[code];
    if (!c) couponError = `"${code}" isn't a valid code.`;
    else if (c.min && subtotal < c.min) couponError = `${code} unlocks on carts of ${inr(c.min)}+`;
    else {
      if (c.kind === 'percent') discount = Math.round((subtotal * c.value) / 100);
      else if (c.kind === 'flat') discount = Math.min(c.value, subtotal);
      else if (c.kind === 'shipping') freeShip = true;
      coupon = { code, label: c.label };
    }
  }

  const shipping = qty === 0 || freeShip || subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
  const total = subtotal - discount + shipping;
  const next =
    qty > 0
      ? {
          name: bundleNameFor(qty + 1),
          extra: bundlePrice(qty + 1) - subtotal,
          totalSave: (qty + 1) * UNIT_PRICE - bundlePrice(qty + 1),
        }
      : null;

  return {
    qty,
    mrp,
    subtotal,
    bundleName: bundleNameFor(qty),
    bundleSavings,
    discount,
    coupon,
    couponError,
    shipping,
    total,
    next,
  };
}

// Baseline copied cell-for-cell from "Tshirt_Startup_Estimate_499.xlsx".
// Tab 1 "Startup Estimate" = SECTIONS (rows 5–29). Tab 2 "Summary" = SELLING_PRICE + WHAT_IF_PRICES.
// Every item id is stable: saved simulations reference items by id.

export const SHEET_TITLE = 'Startup Estimate — T-Shirt Brand, Bangalore';

export const CATEGORIES = ['Equipment', 'Workspace', 'Legal', 'Online', 'Inventory', 'Packaging', 'Branding'];

export const SECTIONS = [
  {
    id: 'equipment', title: 'Equipment', items: [
      { id: 'heat-press', row: 6, name: 'Automatic heat press, large 16"x20" (auto-open / pneumatic)', category: 'Equipment', priority: 'Must', qty: 1, unit: 17000, note: "Your quote. Online listings for auto presses run ₹35,000–₹85,000 — confirm it's truly automatic, 16x20, with warranty & local service" },
      { id: 'teflon', row: 7, name: 'Spare Teflon sheets + silicone pad', category: 'Equipment', priority: 'Must', qty: 1, unit: 1500, note: 'Teflon sheet protects prints and platen' },
      { id: 'tape-pillows', row: 8, name: 'Heat-resistant tape + pressing pillows', category: 'Equipment', priority: 'Must', qty: 1, unit: 1200, note: 'Pillows help press over seams/collars' },
      { id: 'steamer', row: 9, name: 'Standing garment steamer', category: 'Equipment', priority: 'Must', qty: 1, unit: 3000, note: 'Removes creases before pressing & packing — crisp finish for photos and delivery' },
      { id: 'work-table', row: 10, name: 'Work table (6 ft x 3 ft) for pressing & packing', category: 'Workspace', priority: 'Must', qty: 1, unit: 6000, note: '' },
      { id: 'racks', row: 11, name: 'Storage racks for blanks & packed stock', category: 'Workspace', priority: 'Must', qty: 2, unit: 3500, note: '' },
      { id: 'folding-board', row: 12, name: 'T-shirt folding board', category: 'Workspace', priority: 'Must', qty: 1, unit: 500, note: 'Consistent folds = premium unboxing' },
      { id: 'scale', row: 13, name: 'Digital weighing scale (30 kg)', category: 'Workspace', priority: 'Must', qty: 1, unit: 1500, note: 'Accurate weights avoid courier penalties' },
      { id: 'label-printer', row: 14, name: 'Thermal shipping-label printer', category: 'Workspace', priority: 'Later', qty: 1, unit: 9000, note: 'Saves time once you ship 10+ orders/day' },
    ],
  },
  {
    id: 'legal', title: 'Brand & Legal', items: [
      { id: 'udyam', row: 16, name: 'Udyam (MSME) registration', category: 'Legal', priority: 'Must', qty: 1, unit: 0, note: 'Free; unlocks the lower trademark fee' },
      { id: 'bank', row: 17, name: 'Current bank account', category: 'Legal', priority: 'Must', qty: 1, unit: 0, note: 'Usually free with min. balance' },
    ],
  },
  {
    id: 'online', title: 'Website & Launch Marketing', items: [
      { id: 'domain', row: 19, name: 'Domain name (1 year)', category: 'Online', priority: 'Must', qty: 1, unit: 1000, note: '' },
    ],
  },
  {
    id: 'inventory', title: 'First Inventory (launch batch)', items: [
      { id: 'blanks', row: 21, name: 'Blank oversized tees, 240 GSM (assorted sizes S–XXL)', category: 'Inventory', priority: 'Must', qty: 100, unit: 65, note: 'Your cost: ₹60–₹70 per blank (₹65 used). Check GSM & shrinkage on samples', locked: true },
      { id: 'dtf', row: 22, name: 'DTF printed sheets (meters)', category: 'Inventory', priority: 'Must', qty: 50, unit: 250, note: 'Gang multiple designs + small logos on each meter' },
      { id: 'zipper-bags', row: 23, name: 'Custom printed frosted zipper bags', category: 'Packaging', priority: 'Must', qty: 500, unit: 8, note: 'MOQ usually 500–1000; size ~ 25x35 cm for folded oversized tee' },
      { id: 'keychains', row: 24, name: 'Brand keychains', category: 'Packaging', priority: 'Must', qty: 500, unit: 10, note: 'Ask for a physical sample before bulk' },
      { id: 'neck-labels', row: 25, name: 'Woven neck labels', category: 'Branding', priority: 'Must', qty: 500, unit: 1.5, note: 'Include size + brand name' },
      { id: 'stitching', row: 26, name: 'Label stitching on launch batch', category: 'Branding', priority: 'Must', qty: 200, unit: 4, note: "Note: 200 here vs 100 blanks — set to 100 if you're only labelling this batch" },
      { id: 'hang-tags', row: 27, name: 'Hang tags + strings', category: 'Packaging', priority: 'Must', qty: 500, unit: 3, note: '' },
      { id: 'cards', row: 28, name: 'Thank-you / care cards', category: 'Packaging', priority: 'Must', qty: 500, unit: 2, note: 'Add QR to Instagram / reorder discount' },
      { id: 'mailers', row: 29, name: 'Courier mailer bags', category: 'Packaging', priority: 'Must', qty: 500, unit: 5, note: '' },
    ],
  },
];

export const ITEMS = SECTIONS.flatMap((s) => s.items.map((i) => ({ ...i, section: s.id })));
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// Summary tab, section 3 "Cost per T-shirt": which line items feed each per-shirt component.
// mode 'unit' = the item's unit cost (Summary!B17, B19–B24); mode 'perBlank' = item total ÷ blanks qty (B18).
export const PER_SHIRT = [
  { key: 'blank', label: 'Blank tee', parts: [{ id: 'blanks', mode: 'unit' }] },
  { key: 'dtf', label: 'DTF print', hint: 'DTF total ÷ number of blanks', parts: [{ id: 'dtf', mode: 'perBlank' }], note: '50 m for 100 tees = 2 prints/meter. At 4 prints/meter this halves' },
  { key: 'label', label: 'Neck label + stitching', parts: [{ id: 'neck-labels', mode: 'unit' }, { id: 'stitching', mode: 'unit' }] },
  { key: 'hangTag', label: 'Hang tag', parts: [{ id: 'hang-tags', mode: 'unit' }] },
  { key: 'zipper', label: 'Zipper bag', parts: [{ id: 'zipper-bags', mode: 'unit' }] },
  { key: 'keychain', label: 'Keychain', parts: [{ id: 'keychains', mode: 'unit' }] },
  { key: 'card', label: 'Thank-you card', parts: [{ id: 'cards', mode: 'unit' }] },
  { key: 'mailer', label: 'Mailer bag', parts: [{ id: 'mailers', mode: 'unit' }] },
];

export const SELLING_PRICE = 499;                       // Summary!B14
export const WHAT_IF_PRICES = [499, 549, 599, 699, 799]; // Summary!A42:A46

// The values the spreadsheet itself shows (cached results). Tests assert the engine reproduces them.
export const SHEET_EXPECTED = {
  byCategory: { Equipment: 22700, Workspace: 24000, Legal: 0, Online: 1000, Inventory: 19000, Packaging: 14000, Branding: 1550 },
  total: 82250, mustTotal: 73250,
  investment: { equipment: 22700, workspace: 24000, legalDomain: 1000, inventory: 19000, packagingBranding: 15550 },
  perShirt: { blank: 65, dtf: 125, label: 5.5, hangTag: 3, zipper: 8, keychain: 10, card: 2, mailer: 5 },
  productCost: 223.5, profit: 275.5, margin: 0.552104208416834,
  batch: 100, revenue: 49900, batchProfit: 27550, oneTime: 47700, payback: 299,
  whatIf: [[499, 275.5, 299], [549, 325.5, 253], [599, 375.5, 220], [699, 475.5, 173], [799, 575.5, 143]],
  dtfHalved: { profit: 338, payback: 244 },
};

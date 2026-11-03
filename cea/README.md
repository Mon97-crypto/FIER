# CEA — Cost Estimating Application

A mobile web app version of **`Tshirt_Startup_Estimate_499.xlsx`**: both tabs, the same formulas and the same numbers, plus a price simulator and saved simulations. No login: it's open to everyone.

| Tab | What it shows |
|---|---|
| **Summary** | The sheet's *Summary* tab: estimated revenue (₹49,900 = 100 shirts × ₹499), investment breakdown (B5–B11), cost per packed shirt (B17–B25), profit and margin, launch batch and payback (299 shirts), the what-if price table (₹499–₹799) and the 4-designs-per-DTF-meter scenario. |
| **Estimate** | The *Startup Estimate* tab: all 21 line items with qty × unit cost = total, category, Must/Later priority, the notes on each row, totals by category (F32–F38), the total estimate (₹82,250) and Must-only total (₹73,250). It can be searched and filtered. |
| **Simulate** | Change the selling price or any item's qty or unit cost, switch items off, add your own items (and choose whether they add to the cost per shirt), set how many shirts actually sell, and edit the what-if prices. Quick scenarios come from your sheet notes: 2, 3 or 4 DTF designs per meter, blanks at ₹60/₹65/₹70, heat-press prices from your quote up to ₹85,000, Must items only, and stitching labels on this batch only. Every result shows its change from the sheet. |
| **Saved** | Every saved simulation: open, rename, add notes, duplicate, share a link, export CSV, delete, and compare up to 3 side by side with the sheet. |

The calculation engine (`public/js/model.js`) is shared by the browser and the API. `test/model.test.js` checks that it reproduces **every value** in the workbook.

## Run locally

Needs Node 18.17+ and has no dependencies.

```bash
cd cea
npm start        # http://localhost:3000, simulations saved to cea/data/simulations.json
npm test
```

## Deploy on Vercel

1. In Vercel, choose **Add New → Project**, import this repository and set **Root Directory** to `cea`. Leave Framework Preset as *Other* (`vercel.json` handles the rest).
2. To store simulations, go to **Storage → Marketplace → Upstash for Redis**, create a free database and **connect it to the project**. This sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you. Then redeploy.
3. Open the site. The pill at the top right says **Cloud** once storage is connected.

Until Redis is connected, the app still works: simulations are saved in each visitor's browser and labelled "This device". Once the cloud is connected, the Saved tab offers **Upload to cloud** for those.

Optional: set `CEA_MAX_SIMULATIONS` (default 1000) to cap how many simulations can be stored, since anyone can save.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/health` | `{ storage: "redis" \| "file" \| "memory", durable }` |
| GET | `/api/baseline` | The sheet's inputs and headline numbers |
| GET | `/api/simulations` | List, newest first (headline numbers only) |
| POST | `/api/simulations` | Create `{ name, note?, inputs }` |
| GET | `/api/simulations/:id` | One simulation, including its inputs |
| PUT | `/api/simulations/:id` | Update `{ name?, note?, inputs? }` |
| DELETE | `/api/simulations/:id` | Delete |

The server re-validates every input and recomputes the results itself, so stored numbers always match the engine. Request bodies are limited to 64 KB.

`inputs` looks like `{ sellingPrice, items: { "<item-id>": { qty, unit, off } }, custom: [...], whatIfPrices: [...], soldQty }`. The item ids are in `public/js/sheet.js`.

## Updating the sheet values

The baseline lives in `public/js/sheet.js`, copied cell for cell from the workbook. If the sheet changes, edit the values there (and `SHEET_EXPECTED`), then run `npm test`.

# Rare Collections by Sathish

**Fear None. Burn Bright.** A walk-in 3D virtual boutique for **Drop 01: the Ramayana: Part 1 collection**: eight original, DTF-ready tees at ₹499 each, in sizes S–XL, for men and women. Each design is limited to 150 pieces.

## The boutique

The home page is a virtual store built with pure CSS 3D (no WebGL, no libraries). It's a plaster gallery with pegboard walls, track lighting, an oak display table, plants, a neon sign and a chrome rail. You arrive outside the storefront and glide in through the doorway.

| Area (bottom tabs) | What happens |
|---|---|
| **Store** | Wide view of the whole room. Click the rail or scroll to walk up to it. |
| **The Rail** | All 8 tees hang on wooden hangers with cotton grain, drape folds and prints that follow the fabric. Drag, swipe, scroll or use ← → to move along the rail; the tees sway as the camera passes. Hover a tee to lift it and see its name and price. |
| **Product focus** | Click a tee and the camera moves onto it while a product panel slides in: colour (re-dyes the hanging tee), men's or women's fit (changes the cut), size, add to bag, buy now and **view back** (the tee turns around). Prev/next arrows move along the rail. |
| **Bundles** | Turns to the oak shelving wall: folded stacks with brass price plaques for Solo, Duo, Trio and Squad. |
| **Founder** | Turns to the gallery wall: the "Fear none. Burn bright." manifesto print, design prints and Sathish's portrait. Click the portrait to read his story. |

Below the boutique: the offers counter (bundles, the Midnight Flash countdown, the Agni Chakra daily spin wheel), the founder's story, delivery tracking, the "inner circle" mailing list, and the footer.

## Also included

| Feature | Details |
|---|---|
| **Gmail login** | Google Identity Services, verified on the server, with a signed HttpOnly session cookie. Until `GOOGLE_CLIENT_ID` is set, a demo login that only accepts @gmail.com addresses keeps the prototype usable. |
| **Checkout** | Address validation (Indian mobile number and PIN code), coupons, **Razorpay** (signature-verified) or **Cash on Delivery**. Without Razorpay keys, a simulated UPI payment is used instead. |
| **Delivery tracking** | Confirmed → DTF Printing → Quality Check → Shipped → Out for Delivery → Delivered, shown as a timeline with an ETA, courier and AWB. Order IDs look like `RARE-261101-A1B2C3`. |
| **Admin** (`/admin`) | Revenue and print-queue stats, order status, courier and AWB updates, **downloadable DTF print files** (12″×14.4″ SVG), subscriber CSV export. |

## Look & feel

A warm gallery palette: plaster ivory `#f1ece4`, oak `#c69c6d`, espresso `#1d1611`, ember `#d2552f` and brass `#b8924f`, so the colourful tees pop the way they would in a real boutique. Type is Fraunces (editorial serif), Manrope (UI) and Mrs Saint Delafield (Sathish's signature).

## Pricing (`public/js/pricing.js`, shared by the browser and the server)

| Tees | Price | Per tee |
|---|---|---|
| 1 | ₹499 | ₹499 |
| 2 (Duo) | ₹899 | ₹450 |
| 3 (Trio) | ₹1,299 | ₹433 |
| 4 (Squad) | ₹1,599 | ₹400 |
| 5+ | +₹399 each | — |

Shipping is free on ₹799 and above; otherwise it is ₹59. Coupons: `FEARNONE10`, `AGNI5`, `AGNI15`, `SETU50`, `VANARA100`, `FREESHIP`, `BURNBRIGHT20`.

## Run it

Needs Node 18.17+. There are no dependencies to install.

```bash
cp .env.example .env   # optional
npm start              # http://localhost:3000
npm test
```

The admin key is printed in the console on first start and saved to `data/.admin-key`. Orders, users and subscribers are stored in `data/db.json`.

## Deploy on Vercel

The repo is Vercel-ready: `vercel.json` serves `public/` from the CDN and sends every `/api/*` request to one serverless function (`api/index.js`), which reuses the same handler as the local server.

1. Import the GitHub repo in Vercel. Leave Framework set to "Other"; no build command is needed.
2. **Add storage (required for real use):** go to Vercel → Storage / Marketplace → **Upstash for Redis**, then connect it to the project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically, and orders, users and subscribers are kept there. Without it, the site still runs but stores data in each function's temporary `/tmp`, which is wiped regularly and isn't shared between instances.
3. Add environment variables: `SESSION_SECRET` (a long random string) and `ADMIN_KEY` (your admin password). Add `GOOGLE_CLIENT_ID` and the Razorpay keys when ready.
4. Redeploy. For Google Sign-In, add your `https://<your-domain>` to the OAuth client's Authorized JavaScript origins.

## Going live checklist

1. **Google login**: create an OAuth Web client in Google Cloud Console, add your domain to *Authorized JavaScript origins*, and set `GOOGLE_CLIENT_ID`. Demo login turns off automatically.
2. **Payments**: set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Demo pay turns off automatically.
3. **HTTPS**: set `COOKIE_SECURE=true`, plus a strong `SESSION_SECRET` and `ADMIN_KEY`.
4. **Tracking**: set `TRACKING_SIMULATION_MINUTES=0` and update orders from `/admin`, or connect a courier API such as Shiprocket or Delhivery.
5. **Email**: subscribers are collected and exportable. Connect a provider (Mailchimp, Brevo, etc.) to send campaigns.
6. **Storage**: the JSON file store is fine for a launch. Move to Postgres or SQLite as volume grows.

## Designs

All artwork is original vector art, drawn in code (`public/js/catalog.js`); the garments, folds, hangers and fabric texture are rendered in `public/js/tee.js` and the store in `public/js/store.js`: Kodanda, Lanka Dahan, Dashamukha, Rama Setu, Jatayu, Sanjeevani, Lakshman Rekha and Suryavanshi. Download print files from `/admin` → *DTF print files*. Convert text to outlines before sending them to the RIP.

> Rare Collections by Sathish is not affiliated with the producers of the film *Ramayana: Part 1*. Using the film's name, logo or stills on merchandise needs a licence from the rights holders.

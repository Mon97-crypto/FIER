# 🔥 FIER — Fear None. Burn Bright.

Storefront for **FIER Drop 01: the Ramayana: Part 1 collection**. It has eight original, DTF-ready tee designs at ₹499 each, in sizes S–XL, for men and women.

## What's inside

| Feature | Details |
|---|---|
| **3D tee carousel** | A 3D ring you can drag, swipe or flick, or move with the arrow keys and dot buttons. It autoplays until you touch it. Click the tee in front to open the configurator, which has a front/back 3D tee, a 360° spin and mouse tilt. |
| **Configurator** | Men's regular or women's fitted cut (different silhouettes), per-design colours, S/M/L/XL, quantity, size guide. |
| **Gmail login** | Google Identity Services. The server checks the Google ID token and sets a signed, HttpOnly session cookie. Until `GOOGLE_CLIENT_ID` is set, a demo login that only accepts @gmail.com addresses keeps the prototype usable. |
| **Checkout** | Address validation (Indian mobile number and PIN code), coupons, **Razorpay** (UPI/cards/netbanking, signature-verified) or **Cash on Delivery**. Without Razorpay keys, a simulated UPI payment is used instead. |
| **Delivery tracking** | Confirmed → DTF Printing → Quality Check → Shipped → Out for Delivery → Delivered, shown as a timeline with an ETA, courier and AWB. Stages advance automatically for demos, or you set them by hand in the admin panel. |
| **Always-on offers** | Offer ticker, bundle pricing, Midnight Flash countdown, Tee of the Day, and the **Agni Chakra** daily spin wheel. |
| **Mailing list** | "Join the Vanara Sena" signup gives the FEARNONE10 code. Admins can export subscribers as CSV. |
| **Founder story** | Sathish Kumar and the meaning of F.I.E.R. (Fearless · Intense · Eternal · Rising). |
| **Admin** (`/admin`) | Revenue and print-queue stats, order list, status, courier and AWB updates, **downloadable DTF print files** (12″×14.4″ SVG), subscriber export. |

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

## Going live checklist

1. **Google login**: create an OAuth Web client in Google Cloud Console, add your domain to *Authorized JavaScript origins*, and set `GOOGLE_CLIENT_ID`. Demo login turns off automatically.
2. **Payments**: set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Demo pay turns off automatically.
3. **HTTPS**: set `COOKIE_SECURE=true`, plus a strong `SESSION_SECRET` and `ADMIN_KEY`.
4. **Tracking**: set `TRACKING_SIMULATION_MINUTES=0` and update orders from `/admin`, or connect a courier API such as Shiprocket or Delhivery.
5. **Email**: subscribers are collected and exportable. Connect a provider (Mailchimp, Brevo, etc.) to send campaigns.
6. **Storage**: the JSON file store is fine for a launch. Move to Postgres or SQLite as volume grows.

## Designs

All artwork is original vector art, drawn in code (`public/js/catalog.js`): Kodanda, Lanka Dahan, Dashamukha, Rama Setu, Jatayu, Sanjeevani, Lakshman Rekha and Suryavanshi. Download print files from `/admin` → *DTF print files*. Convert text to outlines before sending them to the RIP.

> FIER is not affiliated with the producers of the film *Ramayana: Part 1*. Using the film's name, logo or stills on merchandise needs a licence from the rights holders.

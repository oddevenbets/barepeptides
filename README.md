# Baretides Storefront

Ecommerce storefront for Baretides research peptides with a small Node server for Stripe Checkout.

## Files

- `index.html` - page structure, catalog sections, compliance copy, cart drawer
- `styles.css` - responsive layout and visual system
- `app.js` - product catalog rendering, variant selectors, one-time purchaser acknowledgement, cart interactions
- `catalog.js` - shared product and price catalog used by both browser and server
- `server.js` - local web server and Stripe Checkout Session API
- `success.html` / `success.js` - Stripe return page with order, customer, and address details
- `logo.png` - supplied brand icon

## Stripe integration notes

Run the site through the local server:

```bash
npm start
```

Then open `http://localhost:4242`.

Do not open `index.html` directly for checkout. Stripe requires the local server because the browser must call `/api/create-checkout-session`, and the server must validate totals with the secret key.

The server accepts product IDs and quantities, validates them against `catalog.js`, creates a Stripe Checkout Session, and redirects the browser to Stripe. Email, billing address, shipping address, and payment are collected by Stripe Checkout.

Do not send raw client-side prices directly to Stripe without server validation. This project already validates prices on the server from `catalog.js`.

The `.env` file may use either:

```txt
STRIPE_SECRET_KEY=sk_...
```

or the existing:

```txt
LIVEKEY=sk_...
```

Optional:

```txt
STRIPE_ALLOWED_COUNTRIES=US,CA
```

## Render production variables

For Render, do not rely on a checked-in `.env` file. Add these in the Render dashboard under Environment Variables:

```txt
STRIPE_SECRET_KEY=sk_live_...
PUBLIC_SITE_URL=https://baretides.shop
```

`PUBLIC_SITE_URL` is used for Stripe `success_url` and `cancel_url`. Localhost testing still uses the local origin automatically.

By default, checkout allows shipping addresses from a broad list of major countries. To restrict or customize the list, add:

```txt
STRIPE_ALLOWED_COUNTRIES=US,CA,GB,AU
```

## Adding vial sizes

Each product in `app.js` has a `variants` array. Add more sizes by adding entries like:

```js
{ id: "20mg", amount: "20mg", price: 40 }
```

Keep final prices on the server too when Stripe is integrated.

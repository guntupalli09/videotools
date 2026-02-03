# Stripe — Go live checklist

The app already has Stripe wired for **checkout** (subscriptions + one-time overage) and **webhooks** (upgrade user, reset usage, handle cancel). To make payments live, you only need to configure Stripe and set env vars.

---

## 1. Stripe account

- Sign up or log in at [dashboard.stripe.com](https://dashboard.stripe.com).
- **Test mode** (toggle in dashboard): use for testing with test cards.
- **Live mode**: use for real payments. You must complete Stripe account activation (identity, bank, etc.).

---

## 2. Create products and prices (Dashboard)

In **Stripe Dashboard → Product catalog**, create:

| Product / Price        | Type        | Amount / interval | Env var                 |
|------------------------|------------|--------------------|--------------------------|
| Basic (monthly)        | Recurring  | **$19** / month (450 min)  | `STRIPE_PRICE_BASIC`     |
| Basic (annual)         | Recurring  | e.g. $182 / year   | `STRIPE_PRICE_BASIC_ANNUAL` (optional) |
| Pro (monthly)          | Recurring  | **$49** / month (1,200 min) | `STRIPE_PRICE_PRO`       |
| Pro (annual)           | Recurring  | e.g. $470 / year   | `STRIPE_PRICE_PRO_ANNUAL` (optional)   |
| Agency (monthly)       | Recurring  | **$129** / month (3,000 min) | `STRIPE_PRICE_AGENCY`    |
| Agency (annual)        | Recurring  | e.g. $1,238 / year | `STRIPE_PRICE_AGENCY_ANNUAL` (optional) |
| Overage (one-time)     | One-time   | **$5** (100 min)   | `STRIPE_PRICE_OVERAGE`   |

For each **Price**, copy the **Price ID** (e.g. `price_xxx`) — you’ll put these in env.

**Note:** The server currently uses only **monthly** price IDs for subscriptions. Annual price IDs are read from env and used for plan detection in webhooks; to actually offer annual checkout, the billing route would need to pick the annual price when `annual: true` is sent (optional follow-up).

---

## 3. API keys (Dashboard)

- **Developers → API keys**
- **Secret key**:  
  - Test: `sk_test_...`  
  - Live: `sk_live_...`  
- Use the **Secret key** only on the **server**; never in the client.

Set in server env:

```bash
# Test
STRIPE_SECRET_KEY=sk_test_...

# Live (when going live)
STRIPE_SECRET_KEY=sk_live_...
```

---

## 4. Webhook (Dashboard)

Stripe must send events to your API so the app can upgrade users, reset usage, and handle cancellations.

1. **Developers → Webhooks → Add endpoint**
2. **Endpoint URL**:  
   `https://YOUR_API_DOMAIN/api/stripe/webhook`  
   Example: `https://api.videotext.io/api/stripe/webhook`
3. **Events to send**: select at least:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
4. **Signing secret**: after creating the endpoint, open it and reveal **Signing secret** (`whsec_...`).

Set in server env:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

- Use the **test** webhook secret when using test mode and test keys.
- Use the **live** webhook secret when using live mode and live keys.
- The webhook route is already set up to receive **raw body** for signature verification.

---

## 5. Server environment variables (summary)

On the **server** (e.g. in `server/.env` or your host’s env), set:

```bash
# Required for Stripe
STRIPE_SECRET_KEY=sk_test_...   # or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Required for checkout (Price IDs from Dashboard)
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...
STRIPE_PRICE_OVERAGE=price_...

# Optional — for annual billing (if you add annual checkout later)
# STRIPE_PRICE_BASIC_ANNUAL=price_...
# STRIPE_PRICE_PRO_ANNUAL=price_...
# STRIPE_PRICE_AGENCY_ANNUAL=price_...
```

All Stripe env vars used in code: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY`, `STRIPE_PRICE_OVERAGE` (all required). Optional: `STRIPE_PRICE_*_ANNUAL`, `BASE_URL`, `VERCEL_URL`. See `server/.env.example` for a full list.

If any of `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY`, or `STRIPE_PRICE_OVERAGE` is missing, checkout will throw when creating a session.

---

## 6. Success / cancel URLs

Checkout success and cancel URLs are built on the server using:

- `frontendOrigin` (sent by the client in the checkout request), or
- `process.env.BASE_URL` or `process.env.VERCEL_URL` (if you set them)

Ensure:

- The **client** sends the real frontend origin when calling `/api/billing/checkout` (e.g. `https://videotext.io`), or
- The **server** has `BASE_URL=https://videotext.io` (or your frontend URL) so success/cancel redirects go to the right site.

---

## 7. Customer Billing Portal (upgrade, downgrade, cancel)

The app lets **paid users** manage their subscription in-app via **Stripe Customer Billing Portal** (upgrade, downgrade, cancel, update payment method).

1. **Stripe Dashboard → Settings → Billing → Customer portal**  
   [dashboard.stripe.com/settings/billing/portal](https://dashboard.stripe.com/settings/billing/portal)
2. **Save** the default configuration (or customize allowed actions and branding).
3. Until the portal is configured, creating a portal session in test mode can fail with: *"You can't create a portal session in test mode until you save your customer portal settings."*

After checkout success, the client exchanges the `session_id` for `userId` and `plan` and stores them so “Manage subscription” works. Paid users see **Manage subscription** in the nav and on the Pricing page; clicking it opens the Stripe portal and returns to `/pricing` when done.

---

## 8. Quick checklist

- [ ] Stripe account created; **live** mode activated if you want real payments
- [ ] Products and prices created; **Price IDs** copied
- [ ] **STRIPE_SECRET_KEY** set on server (test or live)
- [ ] **STRIPE_WEBHOOK_SECRET** set on server (from webhook endpoint)
- [ ] **STRIPE_PRICE_BASIC**, **STRIPE_PRICE_PRO**, **STRIPE_PRICE_AGENCY**, **STRIPE_PRICE_OVERAGE** set on server
- [ ] Webhook endpoint URL is `https://YOUR_API_DOMAIN/api/stripe/webhook` and events include `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`
- [ ] Success/cancel URLs point to your real frontend (via `frontendOrigin` or `BASE_URL`)
- [ ] **Customer portal** settings saved in Stripe Dashboard (Settings → Billing → Customer portal) so “Manage subscription” works

After this, the integration in the repo is enough for **live payments**; no code changes are required unless you want to add annual checkout or change products/prices.

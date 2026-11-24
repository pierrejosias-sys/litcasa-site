# LitCasa — Checkout, Orders & Support Flow

How a paid order moves through the API (built Nov 24, 2026). The
frontend agent wires the storefront to these endpoints; this doc is
the contract it should code against.

## Flow

1. **Cart → Stripe Checkout**
   `POST /api/checkout` `{ items: [{ id, qty, options? }] }`
   - Prices come from the DB (never trusted from the client); unit
     prices are scaled by the configurator size factor, exactly like
     `/api/orders`.
   - Shipping is $6.99 under $50, free at/over $50 — the same rule
     the storefront shows (`api/_lib/shipping.js`).
   - `200 { url, session_id }` — redirect the customer to `url`.
   - `501 { error: 'payments_not_connected' }` when
     `STRIPE_SECRET_KEY` is absent. No order is created here.
   - TEST MODE ONLY: a non-`sk_test_` key is refused.
   - Success: `/?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
     cancel: `/?checkout=cancelled`.

2. **Payment verified → order recorded → email sent**
   `POST /api/orders/confirm` `{ session_id }`
   - Verifies `payment_status === 'paid'` via the Stripe API first.
     Unpaid sessions get `402 { error: 'payment_not_complete' }`
     and no order is created.
   - Creates the order record (same shape as `POST /api/orders`:
     `LC-YYYYMMDD-NNN` id, `order_items` snapshots with configurator
     options, customer upsert). Idempotent per `stripe_session_id`.
   - Sends the order-confirmation email via Resend from
     `hello@litcasa.com`.
   - `200 { ok:true, orderNumber, email, emailSent }` only when
     payment is verified AND the order is recorded. When Resend is
     not configured the order is still recorded with
     `emailSent:false` + `emailNote`.

3. **Legacy / pre-payment order creation (unchanged)**
   `POST /api/orders` still creates a pending, unpaid order exactly
   as before — except shipping is now calculated ($6.99 under $50,
   free at/over $50, `shipping_status: 'calculated'`) instead of the
   old `$0 / 'TBD'` placeholder. The stored shipping now equals
   what the customer saw at checkout.

## Other endpoints in this batch

- `POST /api/newsletter` `{ email }` → `200 { ok:true }` /
  `400 { error }`. Stores in `newsletter_subscribers`. Sends no email.
- `POST /api/support` `{ name, email, orderNumber?, message }` →
  `200 { ok:true, id, emailSent }` only when stored. Also emails the
  message to `hello@litcasa.com` via Resend when configured
  (`emailSent:false` + note when not). Max 5 posts per email per hour.
- `GET /api/orders/[id]` — order detail (public view, no Stripe id).
  Now reports `shipping_status: 'calculated'`.
- `PATCH /api/admin/orders/[id]` `{ status }` — admin only
  (`x-admin-key` / `?key=` = `ADMIN_PASSWORD`, same gate as
  `GET /api/admin/orders`). Allow-list: `received`, `processing`,
  `shipped`, `delivered`, `cancelled`. Refunds are NOT in the admin
  UI — they are done in the Stripe dashboard (noted on the admin page).

## Admin page (`/admin/`)

The orders table has a View button per row; the detail view shows
line items incl. configurator options, customer, shipping address,
totals, shipping, and status, plus status buttons for the allow-list
above. The `ADMIN_PASSWORD` gate is unchanged.

## Open step — run this migration in the live Neon DB

`db/schema.sql` now adds the `newsletter_subscribers` table and
widens the `orders.status` CHECK constraint to include `received`
and `processing`. The repo file alone does not change the live
database: run `db/schema.sql` (it is idempotent) once in the Vercel
Query editor for the live `litcasa-db`. Until then:

- `POST /api/newsletter` fails (missing table).
- `PATCH /api/admin/orders/[id]` with `received`/`processing`
  fails with a constraint error (the endpoint returns a clear 500
  saying the migration has not been run); `shipped`/`delivered`/
  `cancelled` already work.
- Everything else in this batch works without the migration.

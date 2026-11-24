# LitCasa — Environment Variables Needed

Every environment variable the Vercel build needs. Set them in the Vercel
project (Settings → Environment Variables) for Production. **Never commit a
secret to the repo, never paste one into code or chat.**

No values are listed here — Josias supplies each one from the source below.

| Variable | Purpose | Where Josias gets it | Test vs live | Works without it? |
|---|---|---|---|---|
| `POSTGRES_URL` | Connection string for the Vercel Postgres database. Used by `api/_lib/db.js` (`@vercel/postgres`) for products, orders, order items, customers, and support messages. | Vercel dashboard → Storage → create a Postgres database → copy the connection string from the database's `.env.local` / environment variables tab. | Live (one production database). Use a separate database or branch for testing, never the production one. | **No.** All API routes fail without it. The static storefront still loads, but product data, orders, checkout, support, and admin all stop working. |
| `STRIPE_SECRET_KEY` | Secret key for Stripe Checkout. Used only by `api/checkout.js` to create Checkout Sessions. | Stripe dashboard → Developers → API keys → **test mode** secret key (`sk_test_...`). Toggle test mode on in the dashboard before copying. | **Test only for now.** `api/checkout.js` rejects any key that does not start with `sk_test_` — a live key (`sk_live_...`) is refused outright. A live key is only introduced later, by Josias's explicit decision, if/when the store takes real payments. | **Partially.** The site loads and orders can be created, but checkout returns `501 {error: "Stripe not configured"}` and no payment link is produced. |
| `RESEND_API_KEY` | API key for Resend, the email sender. Used only by `api/_lib/email.js` to send order confirmations. | Resend dashboard (resend.com) → API Keys → Create API Key. | Same key for test and live sending; what changes is the verified sending domain (see `RESEND_FROM`). Test sends should go to an address Josias controls. | **Partially.** Orders and checkout still work, but no order confirmation email is sent — `sendOrderConfirmation` throws a clear error instead of sending. |
| `RESEND_FROM` | The sender ("from") address on outgoing emails, e.g. the store's verified address. Used by `api/_lib/email.js` (order confirmations) and `api/support.js` (support messages to the inbox). | Set in Vercel Nov 24, 2026: `hello@litcasa.com` (verified in Resend). | Depends on the setup: while testing, a Resend-verified test sender; for live mail, an address on a domain verified in Resend. | **No email without it.** `sendOrderConfirmation` throws a clear error ("RESEND_FROM is not set") and nothing is sent. Everything else keeps working. |
| `ADMIN_PASSWORD` | Password for the admin page (`/admin/`) and `GET /api/admin/orders`. The API checks it against the `x-admin-key` header (or `?key=`). | Chosen by Josias — a password he picks himself. Set it in Vercel env vars only; never put it in a file, in code, or in chat. | Same password for test and live admin access. Rotate it if it is ever shared or leaked. | **No.** Without it the admin API rejects every request and the admin page cannot sign in. The storefront is unaffected. |
| `SITE_URL` *(optional)* | Base URL used for Stripe Checkout `success_url` / `cancel_url`. | Not a secret — defaults to `https://litcasa.com` if unset. Only set it if the store runs on a different domain (e.g. a staging/preview URL). | Same value for test and live, unless testing on a preview deployment. | **Yes.** Defaults to `https://litcasa.com`. |

## Notes

- **Email is live as of Nov 24, 2026:** `RESEND_API_KEY` + `RESEND_FROM=hello@litcasa.com` are set in Vercel. Order confirmations (`POST /api/orders/confirm`) and support messages (`POST /api/support`) send via Resend. If either var is missing, those endpoints still record the order/message and return `emailSent:false` with a note — they never pretend an email went out.
- **Email hosting choice (Free vs Pro) is still open — do not buy email
  hosting and do not set up a mailbox as part of this build.** That decision
  also decides `RESEND_FROM`: until a sending domain/address is chosen and
  verified in Resend, `RESEND_FROM` stays unset and order emails stay off.
  The support/contact address shown to customers on the site and policy pages
  is pierrejosias@icloud.com (from the policy doc) — that is the contact
  address, not the Resend sender.
- **Packages the build needs in `package.json`** (not env vars, but required
  for these files to run): `stripe` (checkout), `resend` (email),
  `@vercel/postgres` (database). The parallel backend build owns
  `package.json`; confirm these three are listed there before deploying.
- **What degrades, in short:** no `POSTGRES_URL` → no API at all; no
  `STRIPE_SECRET_KEY` → no payment links; no `RESEND_API_KEY` /
  `RESEND_FROM` → no order emails; no `ADMIN_PASSWORD` → no admin access.
  The static storefront itself loads in all four cases.

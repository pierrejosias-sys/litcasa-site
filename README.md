# LitCasa — Everything LED

Dropshipping storefront for LED strips, smart bulbs, neon signs, string lights, panels, outdoor lights, car lights, grow lights, wires/connectors, controllers and power supplies.

Static site. Deploys to Vercel from `main`.

## Deploy
Pushes to `main` auto-deploy to Vercel → litcasa.com (once DNS is pointed).

## Prices
Product prices are starter "Typical price*" placeholders — swap in real supplier prices.

## Backend (Vercel-native)
- API routes in `api/`: `GET /api/products`, `POST /api/orders`, `GET /api/orders/:id`, `POST /api/support`, `POST /api/checkout` (Stripe test mode only), `GET /api/admin/orders` (admin key).
- Database: Vercel Postgres. Schema + seed in `db/schema.sql`, `db/seed.sql` (59 products, "Typical price*" placeholders). Provisioning steps: `docs/provisioning.md`.
- Product photos in `images/` (lc-001.jpg – lc-059.jpg), referenced as `image_url` in the DB and `image` in the storefront fallback data.
- Policy pages: `shipping.html`, `returns.html`, `privacy.html`, `terms.html`. Admin: `admin/` (password via `ADMIN_PASSWORD` env var).
- Env vars needed: see `docs/env-vars.md` (`POSTGRES_URL`, `STRIPE_SECRET_KEY` test, `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_PASSWORD`). Until Postgres is provisioned, `/api/*` returns a clean 500 and the storefront silently uses its built-in product data.

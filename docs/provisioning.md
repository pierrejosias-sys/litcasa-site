# LitCasa — Vercel Postgres provisioning

Staging files (do NOT run against any other database):
- `schema.sql` — run FIRST
- `seed.sql` — run SECOND (after schema.sql succeeds)

Target: **Vercel Postgres, free tier**, attached to the **litcasa-site**
project, Vercel Hobby team **pierrejosias-sys-projects**.
Live site: https://litcasa.com

> The Vercel API is blocked for Muse, so provisioning is a manual
> dashboard job. The steps below are the dashboard route. Anything
> whose exact dashboard label/button I could not verify is marked
> **[VERIFY IN DASHBOARD]** — do not guess at it; use the label you
> actually see on screen.

## Prerequisites

- Signed in to Vercel as the account that owns the litcasa-site project.
- The litcasa-site project exists and is deployed (https://litcasa.com is live).
- You have the two files above on the machine you are working from
  (they live in `~/workspace/litcasa-build/schema/` on the Muse VM;
  copy/download them first — do not retype them).
- No payment details are needed: Vercel Postgres free tier.
  If the dashboard asks for a paid plan, STOP — do not upgrade; report
  back instead.

## (a) Create the Vercel Postgres database

1. Go to https://vercel.com/dashboard and open the
   **pierrejosias-sys-projects** team [VERIFY IN DASHBOARD — team switcher
   location/label].
2. Open the **litcasa-site** project.
3. Open the **Storage** tab [VERIFY IN DASHBOARD — exact tab name].
4. Choose **Create Database** (or equivalent) and select **Postgres**
   [VERIFY IN DASHBOARD — exact button/label].
5. Give the database a name, e.g. `litcasa-db`
   [VERIFY IN DASHBOARD — whether the name is editable / what the
   default is; any clear name is fine, it does not affect the code].
6. Accept the defaults for region/plan (free tier). Create the database.
7. When prompted, connect the database to the **litcasa-site** project
   (it should offer this during creation if you started from the
   project). If it does not offer it, see step (c) below to connect it
   afterwards — do not create a second database.

## (b) Run schema.sql, then seed.sql

Use ONE of the two methods below. Do them in order: `schema.sql`
first, `seed.sql` second. Do not run `seed.sql` before `schema.sql`
(the `products` table will not exist yet).

### Method 1 — Vercel dashboard SQL editor (preferred, no local tools)

1. In the Vercel dashboard, open the database you just created
   (Project → Storage → click the database name)
   [VERIFY IN DASHBOARD — exact navigation to the database detail view].
2. Open the SQL / Query editor [VERIFY IN DASHBOARD — exact tab name;
   look for "Query", "SQL Editor", or "Data" / query view].
3. Paste the entire contents of `schema.sql` and run it.
   Expected result: no errors; tables `products`, `orders`,
   `order_items`, `customers`, `support_messages`, `order_counters`
   created, plus function `next_order_id()`.
4. Paste the entire contents of `seed.sql` and run it.
   Expected result: no errors; 31 rows inserted.
5. Verify with the checks in "Verification" below.

### Method 2 — psql from a terminal (if you prefer a CLI)

1. In the database detail view, find the connection string / `psql`
   command [VERIFY IN DASHBOARD — exact location of the connection
   details; Vercel normally shows them under a ".env.local" / connection
   tab for the database]. Copy the `POSTGRES_URL` value.
   **Do not paste that URL into chat, Slack, or any shared doc** —
   it contains the database password.
2. From the directory containing the two files, run:
   ```bash
   psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f schema.sql
   psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f seed.sql
   ```
   If either command fails, stop and fix the
   error before running the next file; do not re-run `seed.sql`
   blindly (it is safe to re-run — `ON CONFLICT DO NOTHING` — but
   fix the underlying error first).
3. Verify with the checks in "Verification" below.

## (c) Confirm POSTGRES_URL is connected to the project

1. In the Vercel dashboard, open the **litcasa-site** project →
   **Settings → Environment Variables**
   [VERIFY IN DASHBOARD — exact tab name].
2. Confirm `POSTGRES_URL` is listed there (Vercel adds it automatically
   when a Postgres database is connected to a project).
3. If `POSTGRES_URL` is **not** listed:
   - Go back to the database (Project → Storage → database name) and
     look for a "Connect to Project" / project-connection setting
     [VERIFY IN DASHBOARD] and connect it to **litcasa-site**, then
     re-check Settings → Environment Variables.
   - If there is no such setting, the database may have been created
     outside the project — do not create a second one; note the exact
     screen and report back.
4. Confirm the variable is available to **Production** (and Preview,
   if the store will be tested there) — [VERIFY IN DASHBOARD — how
   the environment scope is shown].
5. **Redeploy the project after connecting the database** so the new
   environment variable is picked up by the deployment. A redeploy
   is required for env-var changes to take effect.

## Verification (run after both files)

In the dashboard SQL editor (or `psql`), run:

```sql
SELECT count(*) AS product_count FROM products;
-- expect: 31

SELECT count(*) AS typical_price_count
FROM products WHERE typical_price = true;
-- expect: 31 (all prices are starter "typical" placeholders)

SELECT id, name, category, price_cents
FROM products ORDER BY id;
-- expect: LC-001..LC-031, names/categories/prices matching
-- ~/workspace/your_files/litcasa-sku-master.csv

SELECT next_order_id('2026-11-24'::date);
-- expect: LC-20261124-001 on first call; a second call returns
-- LC-20261124-002. NOTE: this consumes sequence numbers. Only run
-- it as a smoke test if you are happy to start the day's counter
-- at 003 for real orders — otherwise skip this check, or test it
-- with a throwaway date and delete that counter row afterwards:
--   DELETE FROM order_counters WHERE order_date = '<test date>';

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- expect: customers, order_counters, order_items, orders,
--   products, support_messages
```

## If something goes wrong

- `relation "products" does not exist` when running `seed.sql` →
  `schema.sql` did not run (or failed). Run `schema.sql` first and
  check its output for errors.
- `seed.sql` reports 0 rows / duplicate errors → it is safe to re-run;
  `ON CONFLICT DO NOTHING` skips existing rows. Check the count query
  above — if it says 31, the seed is done.
- Dashboard asks for payment / a paid Postgres plan → STOP, do not
  upgrade. Report back with a screenshot of the exact screen.
- `POSTGRES_URL` missing after connecting → redeploy first, then
  re-check; if still missing, report the exact screens seen.

## What this does NOT do

- No live credentials are stored in these files, and none should be
  added to them.
- No code changes to the live site (`~/workspace/litcasa-site/` was
  not touched). The site is still static — wiring it to Postgres
  (API routes, checkout, env-var use) is a separate build step.
- No Stripe / payment setup is included here. `orders.stripe_session_id`
  and `payment_provider` are columns waiting for that step.

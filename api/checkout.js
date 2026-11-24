// LitCasa — Stripe Checkout Session (TEST MODE ONLY).
//
// This function creates a Stripe Checkout Session for an existing pending
// order (created via POST /api/orders) and returns its checkout URL.
//
// TEST MODE ONLY: it only ever runs with a Stripe TEST secret key
// (sk_test_...). A live key is rejected outright, and live keys must never
// be committed to the repo or pasted into code — they belong only in the
// Vercel environment variables (see ENV_VARS_NEEDED.md). No live charge can
// be created from this function.
//
// Requires the `stripe` package and the DB helper at ./_lib/db.js
// (CommonJS, exports `sql` from @vercel/postgres).

const { sql } = require('./_lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return res.status(501).json({ error: 'Stripe not configured' });
  }
  if (!key.startsWith('sk_test_')) {
    // TEST MODE ONLY — refuse anything that is not a test key.
    return res.status(500).json({
      error: 'Stripe test-mode key required — live keys are not accepted by this checkout',
    });
  }

  const stripe = require('stripe')(key);

  try {
    const body = req.body || {};
    const orderId = body.order_id;
    if (!orderId) {
      return res.status(400).json({ error: 'order_id is required' });
    }

    const { rows } = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
    const order = rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status && order.status !== 'pending') {
      return res.status(409).json({
        error: `Order is ${order.status}, not pending`,
      });
    }

    // Order total: prefer an integer-cents column, fall back to a
    // dollar total. (Column names per the Vercel Postgres schema;
    // see the backend build for the final orders table definition.)
    let amountCents = null;
    if (typeof order.total_cents === 'number') {
      amountCents = order.total_cents;
    } else if (order.total_cents != null && !isNaN(Number(order.total_cents))) {
      amountCents = Math.round(Number(order.total_cents));
    } else if (order.total != null && !isNaN(Number(order.total))) {
      amountCents = Math.round(Number(order.total) * 100);
    } else if (order.total_amount != null && !isNaN(Number(order.total_amount))) {
      amountCents = Math.round(Number(order.total_amount) * 100);
    }
    if (!amountCents || amountCents <= 0) {
      return res.status(500).json({ error: 'Order total is missing or invalid' });
    }

    const siteUrl = (process.env.SITE_URL || 'https://litcasa.com').replace(/\/$/, '');
    const currency = String(order.currency || 'usd').toLowerCase();
    const customerEmail = order.customer_email || order.email || undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: `LitCasa order ${order.id}` },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      customer_email: customerEmail,
      success_url: `${siteUrl}/success?order_id=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?checkout=cancelled&order_id=${encodeURIComponent(order.id)}`,
      metadata: { order_id: String(order.id) },
    });

    await sql`UPDATE orders SET stripe_session_id = ${session.id} WHERE id = ${order.id}`;

    return res.status(200).json({ checkout_url: session.url });
  } catch (err) {
    console.error('api/checkout error:', err);
    return res.status(500).json({ error: 'Checkout failed' });
  }
};

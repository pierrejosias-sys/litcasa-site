'use strict';

/**
 * POST /api/checkout
 * Creates a Stripe Checkout Session (TEST MODE ONLY) from cart items.
 *   Body: { items: [{ id, qty, options? }] }
 *     - id = product id (e.g. 'LC-001'); qty = integer >= 1.
 *     - options = configurator options { color, size, brightness,
 *       finish?, customText? } — normalized server-side, same as
 *       /api/orders.
 *   - Prices are NEVER trusted from the client: unit prices come
 *     from the DB and are scaled by the configurator size factor,
 *     exactly like /api/orders. Shipping is $6.99 under $50, free
 *     at/over $50 (./_lib/shipping.js) — the same rule the
 *     storefront shows.
 *   - 200 { url, session_id } — the Stripe-hosted checkout URL.
 *   - 501 { error: 'payments_not_connected' } when
 *     STRIPE_SECRET_KEY is absent. Never crashes, never pretends
 *     success.
 *   - A live key is refused outright (TEST MODE ONLY).
 *
 * Success/cancel URLs (back to the site):
 *   {SITE_URL}/?checkout=success&session_id={CHECKOUT_SESSION_ID}
 *   {SITE_URL}/?checkout=cancelled
 *
 * No order is created here. After Stripe reports the session paid,
 * POST /api/orders/confirm verifies the session and creates the
 * order record. Each line item carries its product_id + options in
 * the Stripe product metadata so confirm can rebuild the order.
 * Stripe collects the customer's email + US shipping address at
 * checkout; confirm reads them from the paid session.
 */

const { sql, assertDbConfigured } = require('./_lib/db');
const {
  normalizeOptions,
  scaledUnitPriceCents,
  optionsKey,
} = require('./_lib/options');
const { shippingCentsFor } = require('./_lib/shipping');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (_e) {
      return null;
    }
  }
  return req.body;
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
    return;
  }

  // Payments not connected yet: say so plainly, never pretend success.
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    sendJson(res, 501, { error: 'payments_not_connected' });
    return;
  }
  if (!key.startsWith('sk_test_')) {
    // TEST MODE ONLY — refuse anything that is not a test key.
    sendJson(res, 500, {
      error: 'Stripe test-mode key required — live keys are not accepted by this checkout',
    });
    return;
  }

  try {
    // Validate the request shape before touching the DB, so a bad
    // request gets a 400 even when the database is not configured.
    const body = parseBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      sendJson(res, 400, { error: 'Request body must be a JSON object.' });
      return;
    }

    // ---- Validate items ----
    const items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      sendJson(res, 400, { error: 'items must be a non-empty array.' });
      return;
    }
    const seen = new Set();
    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        sendJson(res, 400, { error: 'Each item must be { id, qty, options? }.' });
        return;
      }
      const id =
        typeof item.id === 'string'
          ? item.id.trim()
          : typeof item.product_id === 'string'
            ? item.product_id.trim()
            : '';
      if (!id) {
        sendJson(res, 400, { error: 'Each item needs an id (product_id).' });
        return;
      }
      if (!Number.isInteger(item.qty) || item.qty < 1) {
        sendJson(res, 400, { error: 'Each item qty must be an integer >= 1.' });
        return;
      }
      if (
        item.options !== undefined &&
        item.options !== null &&
        (typeof item.options !== 'object' || Array.isArray(item.options))
      ) {
        sendJson(res, 400, { error: 'Each item options must be an object when present.' });
        return;
      }
      // Same product with DIFFERENT options is a separate line; an
      // exact duplicate (same product + same options) is rejected.
      const dupKey = id + '|' + optionsKey(normalizeOptions(id, item.options));
      if (seen.has(dupKey)) {
        sendJson(res, 400, { error: 'Duplicate line in items: ' + id });
        return;
      }
      seen.add(dupKey);
    }

    assertDbConfigured();

    // ---- Load products from the DB (source of truth for prices) ----
    const productIds = items.map((i) =>
      typeof i.id === 'string' ? i.id.trim() : i.product_id.trim()
    );
    const { rows: products } = await sql`
      SELECT id, name, price_cents
      FROM products
      WHERE id = ANY(${productIds}) AND active = true
    `;
    const byId = new Map(products.map((p) => [p.id, p]));
    for (const id of productIds) {
      if (!byId.has(id)) {
        sendJson(res, 400, { error: 'Product not found or not active: ' + id });
        return;
      }
    }

    // ---- Compute totals from DB prices (integer cents only) ----
    const lines = items.map((item) => {
      const id = typeof item.id === 'string' ? item.id.trim() : item.product_id.trim();
      const p = byId.get(id);
      const options = normalizeOptions(p.id, item.options);
      const unitPrice = scaledUnitPriceCents(p.price_cents, p.id, options);
      return {
        product_id: p.id,
        product_name: p.name,
        quantity: item.qty,
        unit_price_cents: unitPrice,
        options,
      };
    });
    const subtotalCents = lines.reduce(
      (sum, l) => sum + l.unit_price_cents * l.quantity,
      0
    );
    const shippingCents = shippingCentsFor(subtotalCents);

    const stripe = require('stripe')(key);
    const siteUrl = (process.env.SITE_URL || 'https://litcasa.com').replace(/\/$/, '');

    const lineItems = lines.map((l) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: l.product_name,
          // So /api/orders/confirm can rebuild the order from the
          // paid session. Metadata values are strings, max 500 chars;
          // normalized options are short.
          metadata: {
            product_id: l.product_id,
            options: JSON.stringify(l.options || {}),
          },
        },
        unit_amount: l.unit_price_cents,
      },
      quantity: l.quantity,
    }));
    if (shippingCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping',
            metadata: { shipping: 'true' },
          },
          unit_amount: shippingCents,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: ['US'] },
      success_url: `${siteUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?checkout=cancelled`,
      metadata: { source: 'litcasa-checkout' },
    });

    sendJson(res, 200, { url: session.url, session_id: session.id });
  } catch (err) {
    console.error('POST /api/checkout failed:', err && err.message);
    if (err && err.code === 'DB_NOT_CONFIGURED') {
      sendJson(res, 500, { error: 'Database not configured.' });
    } else {
      sendJson(res, 500, { error: 'Checkout failed.' });
    }
  }
};

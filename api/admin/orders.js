'use strict';

/**
 * GET /api/admin/orders
 * Admin-only: returns the 100 most recent orders, each with an
 * items summary.
 *   { orders: [{ id, customer_name, customer_email, customer_phone,
 *                shipping_address, subtotal_cents, shipping_cents,
 *                total_cents, status, payment_status,
 *                payment_provider, stripe_session_id, created_at,
 *                updated_at, item_count, items: [{ product_id,
 *                product_name, quantity, unit_price_cents,
 *                line_total_cents }] }] }
 *
 * Auth: header `x-admin-key` OR query `?key=`, equal to
 * process.env.ADMIN_PASSWORD. Compared with crypto.timingSafeEqual
 * (with a length check first, since timingSafeEqual throws on
 * unequal lengths). 401 when the key is missing/wrong, and also
 * when ADMIN_PASSWORD itself is unset — an unset password must
 * never mean "open".
 *
 * SECURITY: the admin password / supplied key is NEVER logged.
 * Error logs here contain only the fact that auth failed, never
 * the value. stripe_session_id IS included for admins (they need
 * it to reconcile Stripe) — it is never exposed on the public
 * order endpoints.
 */

const crypto = require('crypto');
const { sql, assertDbConfigured } = require('../_lib/db');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function toDollars(cents) {
  return Number((cents / 100).toFixed(2));
}

/**
 * Timing-safe string comparison. Returns false (not an exception)
 * when lengths differ or either side is missing.
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isAuthorized(req) {
  const expected = process.env.ADMIN_PASSWORD;
  // Unset admin password => nobody is authorized. Never fail open.
  if (!expected) return false;
  const supplied =
    (typeof req.headers?.['x-admin-key'] === 'string' &&
      req.headers['x-admin-key']) ||
    (typeof req.query?.key === 'string' && req.query.key) ||
    '';
  if (!supplied) return false;
  return timingSafeEqual(supplied, expected);
}

module.exports = async (req, res) => {
  // No CORS: this is an admin endpoint, not a browser-facing public API.
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    sendJson(res, 405, { error: 'Method not allowed. Use GET.' });
    return;
  }

  // Authenticate before touching the DB or logging anything useful.
  // Do NOT log the supplied key or the expected password.
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: 'Unauthorized. A valid admin key is required.' });
    return;
  }

  try {
    assertDbConfigured();

    const { rows: orders } = await sql`
      SELECT id, customer_name, customer_email, customer_phone,
             shipping_address, subtotal_cents, shipping_cents,
             total_cents, status, payment_provider, payment_status,
             stripe_session_id, created_at, updated_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 100
    `;

    if (orders.length === 0) {
      sendJson(res, 200, { orders: [] });
      return;
    }

    const orderIds = orders.map((o) => o.id);
    const { rows: items } = await sql`
      SELECT order_id, product_id, product_name, quantity,
             unit_price_cents, line_total_cents
      FROM order_items
      WHERE order_id = ANY(${orderIds})
      ORDER BY order_id, id ASC
    `;

    const itemsByOrder = new Map();
    for (const item of items) {
      if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
      itemsByOrder.get(item.order_id).push({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        unit_price_dollars: toDollars(item.unit_price_cents),
        line_total_cents: item.line_total_cents,
        line_total_dollars: toDollars(item.line_total_cents),
      });
    }

    sendJson(res, 200, {
      orders: orders.map((o) => {
        const orderItems = itemsByOrder.get(o.id) || [];
        return {
          id: o.id,
          customer_name: o.customer_name,
          customer_email: o.customer_email,
          customer_phone: o.customer_phone,
          shipping_address: o.shipping_address,
          subtotal_cents: o.subtotal_cents,
          subtotal_dollars: toDollars(o.subtotal_cents),
          shipping_cents: o.shipping_cents,
          shipping_dollars: toDollars(o.shipping_cents),
          total_cents: o.total_cents,
          total_dollars: toDollars(o.total_cents),
          status: o.status,
          payment_provider: o.payment_provider,
          payment_status: o.payment_status,
          stripe_session_id: o.stripe_session_id,
          created_at: o.created_at,
          updated_at: o.updated_at,
          item_count: orderItems.reduce((n, it) => n + it.quantity, 0),
          items: orderItems,
        };
      }),
    });
  } catch (err) {
    console.error('GET /api/admin/orders failed:', err && err.message);
    if (err && err.code === 'DB_NOT_CONFIGURED') {
      sendJson(res, 500, { error: 'Database not configured.' });
    } else {
      sendJson(res, 500, { error: 'Failed to load orders.' });
    }
  }
};

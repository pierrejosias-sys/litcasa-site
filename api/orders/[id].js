'use strict';

/**
 * GET /api/orders/[id]
 * Vercel dynamic route — returns one order + its items by the id in
 * the path, e.g. GET /api/orders/LC-20261124-001
 *   { order: { id, customer_name, customer_email, customer_phone,
 *              shipping_address, subtotal_cents, subtotal_dollars,
 *              shipping_cents, shipping_dollars, shipping_status,
 *              total_cents, total_dollars, status, payment_status,
 *              created_at, updated_at, items: [...] } }
 *
 * 404 when the order does not exist.
 * No sensitive data: stripe_session_id is never returned here.
 * (Same public view as GET /api/orders?id=... — that query form
 * exists for clients that cannot easily build the path form.)
 */

const { sql, assertDbConfigured } = require('../_lib/db');
const { hasOptionsColumn } = require('../_lib/options');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function toDollars(cents) {
  return Number((cents / 100).toFixed(2));
}

/** Vercel puts the dynamic segment in req.query.id; fall back to parsing the URL. */
function getIdFromRequest(req) {
  if (typeof req.query?.id === 'string' && req.query.id.trim()) {
    return req.query.id.trim();
  }
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const parts = pathname.split('/').filter(Boolean);
    // /api/orders/<id>
    return parts.length >= 3 ? decodeURIComponent(parts[parts.length - 1]) : '';
  } catch (_e) {
    return '';
  }
}

module.exports = async (req, res) => {
  setCors(res);

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

  try {
    assertDbConfigured();

    const id = getIdFromRequest(req);
    if (!id) {
      sendJson(res, 400, { error: 'Missing order id in path: /api/orders/LC-YYYYMMDD-NNN' });
      return;
    }

    const { rows } = await sql`
      SELECT id, customer_name, customer_email, customer_phone,
             shipping_address, subtotal_cents, shipping_cents,
             total_cents, status, payment_status, created_at, updated_at
      FROM orders WHERE id = ${id}
    `;
    if (rows.length === 0) {
      sendJson(res, 404, { error: 'Order not found.' });
      return;
    }

    const optionsSupported = await hasOptionsColumn(sql);
    const { rows: items } = optionsSupported
      ? await sql`
          SELECT product_id, product_name, quantity,
                 unit_price_cents, line_total_cents, options
          FROM order_items WHERE order_id = ${id} ORDER BY id ASC
        `
      : await sql`
          SELECT product_id, product_name, quantity,
                 unit_price_cents, line_total_cents
          FROM order_items WHERE order_id = ${id} ORDER BY id ASC
        `;

    const order = rows[0];
    sendJson(res, 200, {
      order: {
        id: order.id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        shipping_address: order.shipping_address,
        subtotal_cents: order.subtotal_cents,
        subtotal_dollars: toDollars(order.subtotal_cents),
        shipping_cents: order.shipping_cents,
        shipping_dollars: toDollars(order.shipping_cents),
        // Shipping is calculated from the subtotal ($6.99 under $50,
        // free at/over $50) — the stored value is what the customer saw.
        shipping_status: 'calculated',
        total_cents: order.total_cents,
        total_dollars: toDollars(order.total_cents),
        status: order.status,
        payment_status: order.payment_status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        items: items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price_cents: it.unit_price_cents,
          unit_price_dollars: toDollars(it.unit_price_cents),
          line_total_cents: it.line_total_cents,
          line_total_dollars: toDollars(it.line_total_cents),
          // Configurator options for this line (null = plain add).
          options: it.options ?? null,
        })),
      },
    });
  } catch (err) {
    console.error('GET /api/orders/[id] failed:', err && err.message);
    if (err && err.code === 'DB_NOT_CONFIGURED') {
      sendJson(res, 500, { error: 'Database not configured.' });
    } else {
      sendJson(res, 500, { error: 'Failed to load order.' });
    }
  }
};

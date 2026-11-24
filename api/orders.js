'use strict';

/**
 * /api/orders
 *
 * POST — create an order (checkout, before payment).
 *   Body: {
 *     customer: { name, email, phone? },
 *     items: [{ product_id, quantity, options? }],
 *     shipping_address: string | object
 *   }
 *   - Validates everything server-side; client-supplied prices or
 *     totals are NEVER trusted — totals are computed from DB prices.
 *   - options (per line) are the configurator options
 *     { color, size, brightness, finish?, customText? } — see
 *     ./_lib/options.js. They are NORMALIZED server-side (unknown
 *     values dropped) and the unit price is recomputed from the DB
 *     base price scaled by the size factor, so a configured line
 *     (e.g. a 36in chandelier) is priced at its size-scaled typical
 *     price. Two lines for the same product with DIFFERENT options
 *     are kept as separate lines; an exact duplicate (same product
 *     + same options) is rejected. Normalized options are stored on
 *     order_items.options (jsonb) when that column exists — see
 *     hasOptionsColumn() in ./_lib/options.js; until the schema
 *     migration has been run, orders still work and only the
 *     options detail is not persisted.
 *   - Shipping is a flat $0 placeholder for now: shipping is TBD
 *     (no supplier shipping / duty cost confirmed yet), so
 *     shipping_cents = 0 and the response flags shipping_status
 *     'TBD'. Do not present $0 as a final shipping cost to the
 *     customer — the checkout route (separate workstream) must show
 *     shipping as TBD until real rates exist.
 *   - Creates the order (status 'pending', payment_status 'unpaid'),
 *     order_items snapshots (name + unit price at checkout time),
 *     and upserts the customer — all inside ONE transaction, with
 *     the order id reserved via getDailyOrderId() (LC-YYYYMMDD-NNN).
 *   - 201 { order_id, total_cents, total_dollars, shipping_cents,
 *           shipping_status: 'TBD', status }
 *   - No Stripe call is made here and no email is sent. Payment
 *     (Stripe Checkout) is a separate endpoint / workstream.
 *
 * GET ?id=LC-... — returns one order + its items (public view).
 *   No sensitive data: stripe_session_id is never returned here.
 *   404 when the order does not exist; 400 when ?id is missing.
 *
 * shipping_address is stored as TEXT (per schema.sql): a string is
 * stored as-is; an object is stored as a JSON string.
 */

const { sql, assertDbConfigured, getDailyOrderId, withTransaction } = require('./_lib/db');
const {
  normalizeOptions,
  scaledUnitPriceCents,
  optionsKey,
  hasOptionsColumn,
} = require('./_lib/options');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

/** Vercel parses JSON bodies for us, but accept a raw string too. */
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

function publicOrder(order, items) {
  return {
    id: order.id,
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,
    shipping_address: order.shipping_address,
    subtotal_cents: order.subtotal_cents,
    subtotal_dollars: toDollars(order.subtotal_cents),
    shipping_cents: order.shipping_cents,
    shipping_dollars: toDollars(order.shipping_cents),
    // Shipping is TBD — see header comment. $0 here is a placeholder.
    shipping_status: 'TBD',
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
  };
}

async function handleGet(req, res) {
  const id = typeof req.query?.id === 'string' ? req.query.id.trim() : '';
  if (!id) {
    sendJson(res, 400, { error: 'Missing query parameter: ?id=LC-YYYYMMDD-NNN' });
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
  sendJson(res, 200, { order: publicOrder(rows[0], items) });
}

async function handlePost(req, res) {
  const body = parseBody(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    sendJson(res, 400, { error: 'Request body must be a JSON object.' });
    return;
  }

  // ---- Validate customer ----
  const customer = body.customer;
  if (!customer || typeof customer !== 'object' || Array.isArray(customer)) {
    sendJson(res, 400, { error: 'customer { name, email, phone? } is required.' });
    return;
  }
  const name = typeof customer.name === 'string' ? customer.name.trim() : '';
  const email = typeof customer.email === 'string' ? customer.email.trim().toLowerCase() : '';
  const phone =
    typeof customer.phone === 'string' && customer.phone.trim()
      ? customer.phone.trim()
      : null;
  if (!name) {
    sendJson(res, 400, { error: 'customer.name is required.' });
    return;
  }
  if (!email || !EMAIL_RE.test(email)) {
    sendJson(res, 400, { error: 'customer.email must be a valid email address.' });
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
      sendJson(res, 400, { error: 'Each item must be { product_id, quantity, options? }.' });
      return;
    }
    if (typeof item.product_id !== 'string' || !item.product_id.trim()) {
      sendJson(res, 400, { error: 'Each item needs a product_id.' });
      return;
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      sendJson(res, 400, { error: 'Each item quantity must be an integer >= 1.' });
      return;
    }
    // options, when present, must be a plain object — it is
    // normalized per product below (unknown values are dropped).
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
    const key = item.product_id.trim() + '|' + optionsKey(normalizeOptions(item.product_id.trim(), item.options));
    if (seen.has(key)) {
      sendJson(res, 400, { error: 'Duplicate line in items: ' + item.product_id.trim() });
      return;
    }
    seen.add(key);
  }

  // ---- Validate shipping address ----
  // Stored as TEXT: string as-is, object as JSON string.
  let shippingAddress = null;
  if (typeof body.shipping_address === 'string' && body.shipping_address.trim()) {
    shippingAddress = body.shipping_address.trim();
  } else if (body.shipping_address && typeof body.shipping_address === 'object') {
    shippingAddress = JSON.stringify(body.shipping_address);
  }
  if (!shippingAddress) {
    sendJson(res, 400, { error: 'shipping_address is required.' });
    return;
  }

  // ---- Load products from the DB (source of truth for prices) ----
  // Quantities / prices from the client are ignored entirely.
  const productIds = items.map((i) => i.product_id.trim());
  const { rows: products } = await sql`
    SELECT id, name, price_cents
    FROM products
    WHERE id = ANY(${productIds}) AND active = true
  `;
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const item of items) {
    if (!byId.has(item.product_id.trim())) {
      sendJson(res, 400, {
        error: 'Product not found or not active: ' + item.product_id.trim(),
      });
      return;
    }
  }

  // ---- Compute totals from DB prices (integer cents only) ----
  // Unit price is the DB base price scaled by the line's configurator
  // size factor (server-side — a client-supplied price is never used).
  const lines = items.map((item) => {
    const p = byId.get(item.product_id.trim());
    const options = normalizeOptions(p.id, item.options);
    const unitPrice = scaledUnitPriceCents(p.price_cents, p.id, options);
    const lineTotal = unitPrice * item.quantity;
    return {
      product_id: p.id,
      product_name: p.name,
      quantity: item.quantity,
      unit_price_cents: unitPrice,
      line_total_cents: lineTotal,
      options,
    };
  });
  const subtotalCents = lines.reduce((sum, l) => sum + l.line_total_cents, 0);
  // SHIPPING TBD — flat $0 placeholder. See header comment.
  const shippingCents = 0;
  const totalCents = subtotalCents + shippingCents;

  // Does the live DB have the order_items.options column yet?
  // (schema.sql adds it; until that migration is run, orders still
  // work and only the options detail is not persisted.)
  const optionsSupported = await hasOptionsColumn(sql);

  // ---- Write everything in one transaction ----
  const orderId = await withTransaction(async (tx) => {
    const id = await getDailyOrderId(tx);

    await tx`
      INSERT INTO orders
        (id, customer_name, customer_email, customer_phone,
         shipping_address, subtotal_cents, shipping_cents, total_cents,
         status, payment_status)
      VALUES (${id}, ${name}, ${email}, ${phone}, ${shippingAddress},
              ${subtotalCents}, ${shippingCents}, ${totalCents},
              'pending', 'unpaid')
    `;

    for (const line of lines) {
      if (optionsSupported) {
        await tx`
          INSERT INTO order_items
            (order_id, product_id, product_name, quantity,
             unit_price_cents, line_total_cents, options)
          VALUES (${id}, ${line.product_id}, ${line.product_name},
                  ${line.quantity}, ${line.unit_price_cents},
                  ${line.line_total_cents},
                  ${line.options ? JSON.stringify(line.options) : null}::jsonb)
        `;
      } else {
        await tx`
          INSERT INTO order_items
            (order_id, product_id, product_name, quantity,
             unit_price_cents, line_total_cents)
          VALUES (${id}, ${line.product_id}, ${line.product_name},
                  ${line.quantity}, ${line.unit_price_cents},
                  ${line.line_total_cents})
        `;
      }
    }

    // Upsert the customer by email (customers.email is UNIQUE).
    await tx`
      INSERT INTO customers (email, name, phone)
      VALUES (${email}, ${name}, ${phone})
      ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            updated_at = NOW()
    `;

    return id;
  });

  sendJson(res, 201, {
    order_id: orderId,
    total_cents: totalCents,
    total_dollars: toDollars(totalCents),
    subtotal_cents: subtotalCents,
    shipping_cents: shippingCents,
    // Shipping is TBD — $0 is a placeholder, not a final rate.
    shipping_status: 'TBD',
    status: 'pending',
  });
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    sendJson(res, 405, { error: 'Method not allowed. Use GET or POST.' });
    return;
  }

  try {
    assertDbConfigured();
    if (req.method === 'GET') await handleGet(req, res);
    else await handlePost(req, res);
  } catch (err) {
    console.error(`${req.method} /api/orders failed:`, err && err.message);
    if (err && err.code === 'DB_NOT_CONFIGURED') {
      sendJson(res, 500, { error: 'Database not configured.' });
    } else if (err && err.code === '23503') {
      // FK violation — should be unreachable after validation, but
      // report it as a client error rather than a 500.
      sendJson(res, 400, { error: 'Referenced product or order does not exist.' });
    } else {
      sendJson(res, 500, { error: 'Failed to process order.' });
    }
  }
};

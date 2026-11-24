'use strict';

/**
 * POST /api/orders/confirm
 *   Body: { session_id }
 *
 * 1. Retrieves the Checkout Session from Stripe (TEST mode) and
 *    verifies payment_status === 'paid' (and status === 'complete').
 *    Unpaid / incomplete sessions are rejected — no order is created.
 * 2. Creates the order record, same shape as POST /api/orders:
 *    order id LC-YYYYMMDD-NNN, order_items snapshots (name + unit
 *    price at checkout time, configurator options), customer upsert —
 *    all inside ONE transaction. Idempotent: if an order already
 *    exists for this stripe_session_id it is returned instead of
 *    creating a duplicate.
 *    - Customer name/email/address come from the paid session's
 *      customer_details (collected by Stripe at checkout).
 *    - Line items come from the session's line_items; each carries
 *      product_id + options in the Stripe product metadata (set by
 *      /api/checkout). The shipping line is excluded from items and
 *      recorded as shipping_cents.
 *    - Compatibility: sessions created by the old /api/checkout
 *      (metadata.order_id pointing at a pending order) mark that
 *      existing order paid instead of creating a new one.
 * 3. Sends the order-confirmation email via Resend from
 *    process.env.RESEND_FROM (hello@litcasa.com in Vercel).
 *
 * Returns 200 { ok:true, orderNumber, email, emailSent } ONLY when
 * payment is verified AND the order is recorded. When Resend is not
 * configured the order is still recorded and emailSent:false is
 * returned with a note — the order is real, the email is not.
 *   - 501 { error: 'payments_not_connected' } when STRIPE_SECRET_KEY
 *     is absent.
 *   - 402 { error: 'payment_not_complete' } when the session exists
 *     but is not paid.
 *   - 404 when the session does not exist.
 */

const { sql, assertDbConfigured, getDailyOrderId, withTransaction } = require('../_lib/db');
const { hasOptionsColumn } = require('../_lib/options');
const { shippingCentsFor } = require('../_lib/shipping');
const { sendOrderConfirmation } = require('../_lib/email');

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

function toDollars(cents) {
  return Number((cents / 100).toFixed(2));
}

/** Format a Stripe address object into the TEXT form orders use. */
function formatAddress(details) {
  const addr = details && details.address ? details.address : null;
  if (!addr) return null;
  const parts = [
    addr.line1,
    addr.line2,
    [addr.city, addr.state, addr.postal_code].filter(Boolean).join(' '),
    addr.country,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

/** Try to send the confirmation email. Returns { sent, note }. Never throws. */
async function trySendEmail(order, items) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
    return {
      sent: false,
      note: 'Resend is not configured (RESEND_API_KEY / RESEND_FROM missing) — order recorded, no confirmation email sent.',
    };
  }
  try {
    await sendOrderConfirmation({
      to: order.customer_email,
      order: {
        id: order.id,
        customer_name: order.customer_name,
        total_cents: order.total_cents,
        items: items.map((it) => ({
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price_cents: it.unit_price_cents,
        })),
      },
    });
    return { sent: true, note: null };
  } catch (err) {
    console.error('POST /api/orders/confirm email failed:', err && err.message);
    return {
      sent: false,
      note: 'Order recorded, but the confirmation email could not be sent.',
    };
  }
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

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    sendJson(res, 501, { error: 'payments_not_connected' });
    return;
  }
  if (!key.startsWith('sk_test_')) {
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
    const sessionId =
      typeof body.session_id === 'string' ? body.session_id.trim() : '';
    if (!sessionId) {
      sendJson(res, 400, { error: 'session_id is required.' });
      return;
    }

    const stripe = require('stripe')(key);
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items.data.price.product'],
      });
    } catch (err) {
      if (err && err.type === 'StripeInvalidRequestError') {
        sendJson(res, 404, { error: 'Checkout session not found.' });
        return;
      }
      throw err;
    }

    // ---- Verify payment before recording anything ----
    if (session.payment_status !== 'paid' || session.status !== 'complete') {
      sendJson(res, 402, {
        error: 'payment_not_complete',
        payment_status: session.payment_status,
        status: session.status,
      });
      return;
    }

    // ---- Idempotency: an order for this session already exists ----
    // (Payment is verified above; the DB is only needed from here on.)
    assertDbConfigured();

    const { rows: existing } = await sql`
      SELECT id, customer_name, customer_email, customer_phone,
             shipping_address, subtotal_cents, shipping_cents,
             total_cents, status, payment_status, created_at, updated_at
      FROM orders WHERE stripe_session_id = ${session.id}
    `;
    if (existing.length > 0) {
      const order = existing[0];
      const optionsSupported = await hasOptionsColumn(sql);
      const { rows: items } = optionsSupported
        ? await sql`
            SELECT product_id, product_name, quantity,
                   unit_price_cents, line_total_cents, options
            FROM order_items WHERE order_id = ${order.id} ORDER BY id ASC
          `
        : await sql`
            SELECT product_id, product_name, quantity,
                   unit_price_cents, line_total_cents
            FROM order_items WHERE order_id = ${order.id} ORDER BY id ASC
          `;
      sendJson(res, 200, {
        ok: true,
        orderNumber: order.id,
        email: order.customer_email,
        emailSent: false,
        emailNote: 'Order already recorded for this session.',
        order: {
          id: order.id,
          total_cents: order.total_cents,
          total_dollars: toDollars(order.total_cents),
          status: order.status,
          payment_status: order.payment_status,
          items: items.map((it) => ({
            product_id: it.product_id,
            product_name: it.product_name,
            quantity: it.quantity,
            unit_price_cents: it.unit_price_cents,
            options: it.options ?? null,
          })),
        },
      });
      return;
    }

    const details = session.customer_details || {};
    const email =
      typeof details.email === 'string' ? details.email.trim().toLowerCase() : '';
    const name =
      typeof details.name === 'string' && details.name.trim()
        ? details.name.trim()
        : '';
    const shippingAddress = formatAddress(details);

    if (!email) {
      sendJson(res, 422, {
        error: 'Paid session has no customer email; cannot create the order record.',
      });
      return;
    }

    // ---- Compatibility: old checkout created a pending order first ----
    const legacyOrderId =
      session.metadata && typeof session.metadata.order_id === 'string'
        ? session.metadata.order_id.trim()
        : '';
    if (legacyOrderId) {
      const { rows: legacy } = await sql`
        SELECT id, customer_name, customer_email, customer_phone,
               shipping_address, subtotal_cents, shipping_cents,
               total_cents, status, payment_status
        FROM orders WHERE id = ${legacyOrderId}
      `;
      if (legacy.length > 0) {
        const order = legacy[0];
        await sql`
          UPDATE orders
          SET status = 'paid', payment_status = 'paid',
              payment_provider = 'stripe',
              stripe_session_id = ${session.id}
          WHERE id = ${order.id}
        `;
        const optionsSupported = await hasOptionsColumn(sql);
        const { rows: items } = optionsSupported
          ? await sql`
              SELECT product_id, product_name, quantity,
                     unit_price_cents, line_total_cents, options
              FROM order_items WHERE order_id = ${order.id} ORDER BY id ASC
            `
          : await sql`
              SELECT product_id, product_name, quantity,
                     unit_price_cents, line_total_cents
              FROM order_items WHERE order_id = ${order.id} ORDER BY id ASC
            `;
        const emailResult = await trySendEmail(
          { ...order, status: 'paid', payment_status: 'paid' },
          items
        );
        sendJson(res, 200, {
          ok: true,
          orderNumber: order.id,
          email: order.customer_email,
          emailSent: emailResult.sent,
          ...(emailResult.note ? { emailNote: emailResult.note } : {}),
        });
        return;
      }
    }

    // ---- Build the order from the paid session's line items ----
    const sessionLines = (session.line_items && session.line_items.data) || [];
    if (sessionLines.length === 0) {
      sendJson(res, 422, {
        error: 'Paid session has no line items; cannot create the order record.',
      });
      return;
    }

    const lines = [];
    let shippingCents = 0;
    for (const li of sessionLines) {
      const product = li.price && li.price.product ? li.price.product : {};
      const meta = product.metadata || {};
      if (meta.shipping === 'true') {
        shippingCents = typeof li.amount_total === 'number' ? li.amount_total : 0;
        continue;
      }
      const productId =
        typeof meta.product_id === 'string' ? meta.product_id.trim() : '';
      if (!productId) {
        sendJson(res, 422, {
          error: 'A paid session line item has no product_id; cannot create the order record.',
        });
        return;
      }
      let options = null;
      if (typeof meta.options === 'string' && meta.options) {
        try {
          const parsed = JSON.parse(meta.options);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length) {
            options = parsed;
          }
        } catch (_e) {
          options = null;
        }
      }
      const unitPrice =
        li.price && typeof li.price.unit_amount === 'number'
          ? li.price.unit_amount
          : Math.round((li.amount_total || 0) / Math.max(1, li.quantity || 1));
      lines.push({
        product_id: productId,
        product_name:
          (typeof li.description === 'string' && li.description) ||
          (typeof product.name === 'string' && product.name) ||
          productId,
        quantity: li.quantity || 1,
        unit_price_cents: unitPrice,
        line_total_cents: unitPrice * (li.quantity || 1),
        options,
      });
    }
    if (lines.length === 0) {
      sendJson(res, 422, {
        error: 'Paid session has no product line items; cannot create the order record.',
      });
      return;
    }

    // Product names from the DB win over the Stripe snapshot when the
    // product still exists (keeps names consistent with /api/orders).
    const { rows: products } = await sql`
      SELECT id, name FROM products
      WHERE id = ANY(${lines.map((l) => l.product_id)})
    `;
    const namesById = new Map(products.map((p) => [p.id, p.name]));
    for (const line of lines) {
      if (namesById.has(line.product_id)) line.product_name = namesById.get(line.product_id);
    }

    const subtotalCents = lines.reduce((sum, l) => sum + l.line_total_cents, 0);
    // Trust the shipping line when Stripe has one; otherwise use the
    // storefront rule so the record matches what the customer saw.
    if (!shippingCents) shippingCents = shippingCentsFor(subtotalCents);
    const totalCents = subtotalCents + shippingCents;
    const optionsSupported = await hasOptionsColumn(sql);

    const orderId = await withTransaction(async (tx) => {
      const id = await getDailyOrderId(tx);

      await tx`
        INSERT INTO orders
          (id, customer_name, customer_email, customer_phone,
           shipping_address, subtotal_cents, shipping_cents, total_cents,
           status, payment_status, payment_provider, stripe_session_id)
        VALUES (${id}, ${name || email}, ${email}, ${null}, ${shippingAddress},
                ${subtotalCents}, ${shippingCents}, ${totalCents},
                'paid', 'paid', 'stripe', ${session.id})
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

      await tx`
        INSERT INTO customers (email, name, phone)
        VALUES (${email}, ${name || email}, ${null})
        ON CONFLICT (email) DO UPDATE
          SET name = EXCLUDED.name,
              updated_at = NOW()
      `;

      return id;
    });

    const emailResult = await trySendEmail(
      {
        id: orderId,
        customer_name: name || email,
        customer_email: email,
        total_cents: totalCents,
      },
      lines
    );

    sendJson(res, 200, {
      ok: true,
      orderNumber: orderId,
      email,
      emailSent: emailResult.sent,
      ...(emailResult.note ? { emailNote: emailResult.note } : {}),
    });
  } catch (err) {
    console.error('POST /api/orders/confirm failed:', err && err.message);
    if (err && err.code === 'DB_NOT_CONFIGURED') {
      sendJson(res, 500, { error: 'Database not configured.' });
    } else {
      sendJson(res, 500, { error: 'Failed to confirm order.' });
    }
  }
};

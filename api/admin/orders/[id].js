'use strict';

/**
 * PATCH /api/admin/orders/[id]
 * Admin-only: change one order's status.
 *   Body: { status }
 *   Allow-list: received, processing, shipped, delivered, cancelled.
 *   (The orders.status CHECK constraint in db/schema.sql was widened
 *   Nov 24, 2026 to include received/processing — that migration
 *   must have been run in the live DB or those two values fail.)
 *   - 200 { ok:true, order: { id, status, payment_status, updated_at } }
 *   - 400 when status is missing or not in the allow-list.
 *   - 401 when the admin key is missing/wrong (or ADMIN_PASSWORD
 *     is unset — never fails open).
 *   - 404 when the order does not exist.
 *
 * Auth: same ADMIN_PASSWORD gate as GET /api/admin/orders —
 * header `x-admin-key` OR query `?key=` (see ./_lib/admin-auth.js).
 *
 * NOTE: there is no refund action here on purpose. Refunds are done
 * in the Stripe dashboard, not in this admin UI.
 */

const { sql, assertDbConfigured } = require('../../_lib/db');
const { isAuthorized } = require('../../_lib/admin-auth');

const ALLOWED_STATUSES = ['received', 'processing', 'shipped', 'delivered', 'cancelled'];

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

/** Vercel puts the dynamic segment in req.query.id; fall back to parsing the URL. */
function getIdFromRequest(req) {
  if (typeof req.query?.id === 'string' && req.query.id.trim()) {
    return req.query.id.trim();
  }
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const parts = pathname.split('/').filter(Boolean);
    // /api/admin/orders/<id>
    return parts.length >= 4 ? decodeURIComponent(parts[parts.length - 1]) : '';
  } catch (_e) {
    return '';
  }
}

module.exports = async (req, res) => {
  // No CORS: this is an admin endpoint, not a browser-facing public API.
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH, OPTIONS');
    sendJson(res, 405, { error: 'Method not allowed. Use PATCH.' });
    return;
  }

  // Authenticate before touching the DB. Do NOT log the supplied key.
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: 'Unauthorized. A valid admin key is required.' });
    return;
  }

  try {
    // Validate the request shape before touching the DB, so a bad
    // request gets a 400 even when the database is not configured.
    const id = getIdFromRequest(req);
    if (!id) {
      sendJson(res, 400, { error: 'Missing order id in path: /api/admin/orders/LC-YYYYMMDD-NNN' });
      return;
    }

    const body = parseBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      sendJson(res, 400, { error: 'Request body must be a JSON object.' });
      return;
    }
    const status = typeof body.status === 'string' ? body.status.trim() : '';
    if (!ALLOWED_STATUSES.includes(status)) {
      sendJson(res, 400, {
        error: 'status must be one of: ' + ALLOWED_STATUSES.join(', '),
      });
      return;
    }

    assertDbConfigured();

    const { rows } = await sql`
      UPDATE orders
      SET status = ${status}
      WHERE id = ${id}
      RETURNING id, status, payment_status, updated_at
    `;
    if (rows.length === 0) {
      sendJson(res, 404, { error: 'Order not found.' });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      order: {
        id: rows[0].id,
        status: rows[0].status,
        payment_status: rows[0].payment_status,
        updated_at: rows[0].updated_at,
      },
    });
  } catch (err) {
    console.error('PATCH /api/admin/orders/[id] failed:', err && err.message);
    if (err && err.code === 'DB_NOT_CONFIGURED') {
      sendJson(res, 500, { error: 'Database not configured.' });
    } else if (err && err.code === '23514') {
      // CHECK constraint — the live DB has not had the widened
      // orders_status_check migration run yet.
      sendJson(res, 500, {
        error: 'Order status not allowed by the database — run the schema.sql migration for the new statuses.',
      });
    } else {
      sendJson(res, 500, { error: 'Failed to update order status.' });
    }
  }
};

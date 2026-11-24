'use strict';

/**
 * POST /api/support
 * Accepts a contact / support-form submission and stores it in
 * support_messages (status defaults to 'open').
 *   Body: { name, email, subject?, message, order_id? }
 *   201 { id } — the new support_messages id.
 *
 * Validation:
 *   - name, email (valid format), message are required.
 *   - subject is optional (stored as NULL when absent).
 *   - order_id is optional; when given it must reference an existing
 *     order, otherwise 400 — support_messages.order_id is a foreign
 *     key to orders(id), so a dangling id would fail the INSERT.
 *
 * Rate limit (light, per spec): at most 5 posts per email per hour.
 * Implemented as a simple in-memory map of email -> timestamps.
 * LIMITATION: in-memory state is per serverless instance and resets
 * on cold start, so it is a spam brake, not a hard guarantee across
 * concurrent instances. If abuse becomes a problem, move the check
 * into the DB (e.g. COUNT(*) FROM support_messages WHERE email = $1
 * AND created_at > now() - interval '1 hour') — the schema already
 * indexes support_messages(email).
 *
 * No email is sent from this endpoint (Resend is a separate
 * workstream). No Stripe involvement.
 */

const { sql, assertDbConfigured } = require('./_lib/db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000;

// email (lower-cased) -> array of epoch-ms timestamps of recent posts.
const recentPostsByEmail = new Map();

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

/** True when this email has already hit the hourly limit. Records the attempt when allowed. */
function isRateLimited(email) {
  const now = Date.now();
  const previous = (recentPostsByEmail.get(email) || []).filter(
    (t) => now - t < WINDOW_MS
  );
  if (previous.length >= MAX_PER_HOUR) {
    recentPostsByEmail.set(email, previous);
    return true;
  }
  previous.push(now);
  recentPostsByEmail.set(email, previous);
  return false;
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

  try {
    assertDbConfigured();

    const body = parseBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      sendJson(res, 400, { error: 'Request body must be a JSON object.' });
      return;
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const subject =
      typeof body.subject === 'string' && body.subject.trim()
        ? body.subject.trim()
        : null;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const orderId =
      typeof body.order_id === 'string' && body.order_id.trim()
        ? body.order_id.trim()
        : null;

    if (!name) {
      sendJson(res, 400, { error: 'name is required.' });
      return;
    }
    if (!email || !EMAIL_RE.test(email)) {
      sendJson(res, 400, { error: 'email must be a valid email address.' });
      return;
    }
    if (!message) {
      sendJson(res, 400, { error: 'message is required.' });
      return;
    }
    if (message.length > 10000) {
      sendJson(res, 400, { error: 'message is too long (max 10000 characters).' });
      return;
    }

    // Rate limit before touching the DB.
    if (isRateLimited(email)) {
      sendJson(res, 429, {
        error: 'Too many support requests from this email. Please try again later.',
      });
      return;
    }

    // order_id is a FK to orders(id) — reject a dangling reference
    // with a clear 400 instead of a raw DB error.
    if (orderId) {
      const { rows } = await sql`SELECT id FROM orders WHERE id = ${orderId}`;
      if (rows.length === 0) {
        sendJson(res, 400, { error: 'order_id does not match an existing order: ' + orderId });
        return;
      }
    }

    const { rows } = await sql`
      INSERT INTO support_messages (name, email, subject, message, order_id)
      VALUES (${name}, ${email}, ${subject}, ${message}, ${orderId})
      RETURNING id
    `;

    sendJson(res, 201, { id: rows[0].id });
  } catch (err) {
    console.error('POST /api/support failed:', err && err.message);
    if (err && err.code === 'DB_NOT_CONFIGURED') {
      sendJson(res, 500, { error: 'Database not configured.' });
    } else if (err && err.code === '23503') {
      sendJson(res, 400, { error: 'order_id does not match an existing order.' });
    } else {
      sendJson(res, 500, { error: 'Failed to submit support message.' });
    }
  }
};

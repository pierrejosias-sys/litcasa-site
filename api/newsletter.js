'use strict';

/**
 * POST /api/newsletter
 *   Body: { email }
 * Validates the email and stores it in newsletter_subscribers
 * (email is UNIQUE — resubscribing the same address is a no-op and
 * still returns 200 { ok:true }).
 *   - 200 { ok:true }
 *   - 400 { error } when the email is missing or invalid.
 * No email is sent by this endpoint.
 */

const { sql, assertDbConfigured } = require('./_lib/db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  try {
    // Validate the request shape before touching the DB, so a bad
    // request gets a 400 even when the database is not configured.
    const body = parseBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      sendJson(res, 400, { error: 'Request body must be a JSON object.' });
      return;
    }

    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !EMAIL_RE.test(email)) {
      sendJson(res, 400, { error: 'email must be a valid email address.' });
      return;
    }
    if (email.length > 254) {
      sendJson(res, 400, { error: 'email is too long.' });
      return;
    }

    assertDbConfigured();

    await sql`
      INSERT INTO newsletter_subscribers (email)
      VALUES (${email})
      ON CONFLICT (email) DO NOTHING
    `;

    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('POST /api/newsletter failed:', err && err.message);
    if (err && err.code === 'DB_NOT_CONFIGURED') {
      sendJson(res, 500, { error: 'Database not configured.' });
    } else {
      sendJson(res, 500, { error: 'Failed to subscribe.' });
    }
  }
};

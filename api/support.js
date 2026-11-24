'use strict';

/**
 * POST /api/support
 * Accepts a contact / support-form submission, stores it in
 * support_messages (status defaults to 'open'), and emails it to
 * hello@litcasa.com via Resend when Resend is configured.
 *   Body: { name, email, orderNumber?, message }
 *     - orderNumber is the order id (e.g. 'LC-20261124-001'); when
 *       given it must reference an existing order, otherwise 400 —
 *       support_messages.order_id is a foreign key to orders(id).
 *     - subject is also accepted (optional, stored when present).
 *   - 200 { ok:true, id, emailSent } — only when the message is
 *     stored. emailSent:false + emailNote when RESEND_API_KEY /
 *     RESEND_FROM is absent (stored only) or the send fails.
 *   - 400 { error } on invalid input.
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
 * No Stripe involvement.
 */

const { Resend } = require('resend');
const { sql, assertDbConfigured } = require('./_lib/db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000;
const SUPPORT_INBOX = 'hello@litcasa.com';

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

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Email the stored message to the support inbox. Returns { sent, note }. Never throws. */
async function tryEmailSupport({ name, email, orderId, message }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return {
      sent: false,
      note: 'Resend is not configured (RESEND_API_KEY / RESEND_FROM missing) — message stored only, no email sent.',
    };
  }
  try {
    const resend = new Resend(apiKey);
    const subject = orderId
      ? `LitCasa support — ${name} (order ${orderId})`
      : `LitCasa support — ${name}`;
    const text =
      `New support message from LitCasa.\n\n` +
      `Name: ${name}\nEmail: ${email}\n` +
      (orderId ? `Order: ${orderId}\n` : '') +
      `\n${message}\n`;
    const html =
      `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#16130E;">` +
      `<h1 style="font-size:20px;">LitCasa support message</h1>` +
      `<p><strong>Name:</strong> ${escapeHtml(name)}<br/>` +
      `<strong>Email:</strong> ${escapeHtml(email)}` +
      (orderId ? `<br/><strong>Order:</strong> ${escapeHtml(orderId)}` : '') +
      `</p><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>` +
      `</div>`;
    const { error } = await resend.emails.send({
      from,
      to: SUPPORT_INBOX,
      replyTo: email,
      subject,
      text,
      html,
    });
    if (error) {
      throw new Error(error.message || JSON.stringify(error));
    }
    return { sent: true, note: null };
  } catch (err) {
    console.error('POST /api/support email failed:', err && err.message);
    return {
      sent: false,
      note: 'Message stored, but the email to support could not be sent.',
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

  try {
    // Validate the request shape before touching the DB, so a bad
    // request gets a 400 even when the database is not configured.
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
    // Contract field is orderNumber; accept order_id as an alias.
    const orderId =
      (typeof body.orderNumber === 'string' && body.orderNumber.trim()) ||
      (typeof body.order_id === 'string' && body.order_id.trim()) ||
      null;

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

    assertDbConfigured();

    // order_id is a FK to orders(id) — reject a dangling reference
    // with a clear 400 instead of a raw DB error.
    if (orderId) {
      const { rows } = await sql`SELECT id FROM orders WHERE id = ${orderId}`;
      if (rows.length === 0) {
        sendJson(res, 400, { error: 'orderNumber does not match an existing order: ' + orderId });
        return;
      }
    }

    const { rows } = await sql`
      INSERT INTO support_messages (name, email, subject, message, order_id)
      VALUES (${name}, ${email}, ${subject}, ${message}, ${orderId})
      RETURNING id
    `;

    const emailResult = await tryEmailSupport({ name, email, orderId, message });

    sendJson(res, 200, {
      ok: true,
      id: rows[0].id,
      emailSent: emailResult.sent,
      ...(emailResult.note ? { emailNote: emailResult.note } : {}),
    });
  } catch (err) {
    console.error('POST /api/support failed:', err && err.message);
    if (err && err.code === 'DB_NOT_CONFIGURED') {
      sendJson(res, 500, { error: 'Database not configured.' });
    } else if (err && err.code === '23503') {
      sendJson(res, 400, { error: 'orderNumber does not match an existing order.' });
    } else {
      sendJson(res, 500, { error: 'Failed to submit support message.' });
    }
  }
};

'use strict';

/**
 * LitCasa — shared admin auth for /api/admin/*.
 *
 * Auth: header `x-admin-key` OR query `?key=`, equal to
 * process.env.ADMIN_PASSWORD. Compared with crypto.timingSafeEqual
 * (with a length check first, since timingSafeEqual throws on
 * unequal lengths). False when the key is missing/wrong, and also
 * when ADMIN_PASSWORD itself is unset — an unset password must
 * never mean "open".
 *
 * SECURITY: the admin password / supplied key is NEVER logged.
 */

const crypto = require('crypto');

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

module.exports = { timingSafeEqual, isAuthorized };

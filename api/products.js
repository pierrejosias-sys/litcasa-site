'use strict';

/**
 * GET /api/products
 * Returns the active catalogue as JSON:
 *   { products: [{ id, name, category, price_cents, price_dollars,
 *                  typical_price, description, image_url }] }
 *
 * - Active products only, ordered by category then name.
 * - Optional ?category= filter (exact match on the category string,
 *   e.g. ?category=LED%20Strips).
 * - Prices are returned in integer cents AND in dollars
 *   (price_dollars = price_cents / 100, rounded to 2dp).
 * - typical_price = true means the price is a "Typical price*"
 *   placeholder, NOT a real supplier-confirmed price. Never treat
 *   it as a margin basis.
 * - Supplier fields are internal and are NOT exposed here.
 *
 * No Stripe / email / checkout logic lives in this endpoint.
 */

const { sql, assertDbConfigured } = require('./_lib/db');

// Category display name (DB/CSV) -> frontend slug. Must match the CATS
// array in the storefront and NEW_PRODUCTS.md §3. The API returns both
// `category` (display) and `cat` (slug) so the frontend never has to guess.
const CATEGORY_SLUGS = {
  'LED Strips': 'strips', 'Smart Bulbs': 'bulbs', 'Neon & Signs': 'neon',
  'String Lights': 'string', 'Panels & Ceiling': 'panels', 'Outdoor': 'outdoor',
  'Car Lights': 'auto', 'Grow Lights': 'grow', 'Wires & Connectors': 'wiring',
  'Controllers': 'control', 'Power Supplies': 'power', 'Chandeliers': 'chandeliers',
  'Pendant Lights': 'pendants', 'Wall Sconces': 'sconces', 'Ceiling Lights': 'ceiling',
  'Vanity & Bathroom Lights': 'vanity', 'Table & Floor Lamps': 'lamps',
  'Recessed Downlights': 'recessed', 'Track Lighting': 'track',
  'Under-Cabinet Lights': 'undercabinet', 'Smart Switches': 'switches',
  'Switch Plates & Covers': 'plates',
};
const SLUG_TO_DISPLAY = Object.fromEntries(
  Object.entries(CATEGORY_SLUGS).map(([display, slug]) => [slug, display])
);

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

module.exports = async (req, res) => {
  setCors(res);

  // CORS preflight.
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

    const category =
      typeof req.query?.category === 'string' && req.query.category.trim()
        ? req.query.category.trim()
        : null;

    // Accept either a display name or a slug in ?category=.
    const dbCategory = SLUG_TO_DISPLAY[category] || category;
    const { rows } = category
      ? await sql`
          SELECT id, name, category, price_cents, typical_price,
                 description, image_url, homekit
          FROM products
          WHERE active = true AND category = ${dbCategory}
          ORDER BY category ASC, name ASC
        `
      : await sql`
          SELECT id, name, category, price_cents, typical_price,
                 description, image_url, homekit
          FROM products
          WHERE active = true
          ORDER BY category ASC, name ASC
        `;

    const products = rows.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      cat: CATEGORY_SLUGS[p.category] || 'other',
      price_cents: p.price_cents,
      price_dollars: toDollars(p.price_cents),
      typical_price: p.typical_price,
      description: p.description,
      image_url: p.image_url,
      homekit: !!p.homekit,
    }));

    sendJson(res, 200, { products });
  } catch (err) {
    // Log the message only — never log env vars, connection strings,
    // or query parameters that could carry secrets.
    console.error('GET /api/products failed:', err && err.message);
    if (err && err.code === 'DB_NOT_CONFIGURED') {
      sendJson(res, 500, { error: 'Database not configured.' });
    } else {
      sendJson(res, 500, { error: 'Failed to load products.' });
    }
  }
};

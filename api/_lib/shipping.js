'use strict';

/**
 * LitCasa — shipping rule, single source of truth for the server.
 *
 * Must match what the storefront shows (index.html totals()):
 *   $6.99 under $50, free at/over $50. An empty cart ships for $0.
 * /api/orders stores this value (shipping_status 'calculated') so the
 * stored shipping always equals what the customer saw at checkout.
 * /api/checkout builds the same charge into the Stripe session.
 */

const FREE_SHIPPING_THRESHOLD_CENTS = 5000; // $50.00
const SHIPPING_CENTS = 699; // $6.99

function shippingCentsFor(subtotalCents) {
  if (!subtotalCents || subtotalCents <= 0) return 0;
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_CENTS;
}

module.exports = { FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_CENTS, shippingCentsFor };

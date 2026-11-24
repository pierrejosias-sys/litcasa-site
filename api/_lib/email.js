// LitCasa — order confirmation email (Resend).
//
// CommonJS module. Exports sendOrderConfirmation({ to, order }).
//
// The sender ("from") address comes ONLY from process.env.RESEND_FROM —
// there is no hardcoded email address anywhere in this file. If RESEND_FROM
// (or RESEND_API_KEY) is unset, this throws a clear error and nothing is
// sent. Set RESEND_FROM to a sender address verified in Resend once the
// store's email setup is decided (see ENV_VARS_NEEDED.md).
//
// Requires the `resend` package.

const { Resend } = require('resend');

function formatMoney(order) {
  if (typeof order.total_cents === 'number') {
    return `$${(order.total_cents / 100).toFixed(2)}`;
  }
  const total = order.total_amount != null ? order.total_amount : order.total;
  if (total != null && !isNaN(Number(total))) {
    return `$${Number(total).toFixed(2)}`;
  }
  return '—';
}

function formatItemLine(item) {
  const name = item.name || item.product_name || 'Item';
  const qty = item.quantity != null ? item.quantity : item.qty != null ? item.qty : 1;
  let price = null;
  if (item.unit_price_cents != null) price = `$${(Number(item.unit_price_cents) / 100).toFixed(2)}`;
  else if (item.price_cents != null) price = `$${(Number(item.price_cents) / 100).toFixed(2)}`;
  else if (item.unit_price != null) price = `$${Number(item.unit_price).toFixed(2)}`;
  else if (item.price != null) price = `$${Number(item.price).toFixed(2)}`;
  return price ? `  - ${name} x${qty} — ${price}` : `  - ${name} x${qty}`;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Send a plain order confirmation email for a paid order.
 *
 * @param {Object} args
 * @param {string} args.to - customer email address
 * @param {Object} args.order - order record: { id, customer_name?, items? [{name, quantity, unit_price_cents|price}], total_cents?|total? }
 * @returns {Promise<Object>} Resend send result data
 */
async function sendOrderConfirmation({ to, order }) {
  if (!to) {
    throw new Error('sendOrderConfirmation: recipient email (to) is required');
  }
  if (!order || !order.id) {
    throw new Error('sendOrderConfirmation: order with an id is required');
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('sendOrderConfirmation: RESEND_API_KEY is not set');
  }
  // From address comes ONLY from the environment — never hardcoded.
  const from = process.env.RESEND_FROM;
  if (!from) {
    throw new Error(
      'sendOrderConfirmation: RESEND_FROM is not set — set it to a verified sender address in Resend before sending email'
    );
  }

  const resend = new Resend(apiKey);

  const customerName = order.customer_name || order.name || 'there';
  const items = Array.isArray(order.items) ? order.items : [];
  const itemLines = items.length
    ? items.map(formatItemLine).join('\n')
    : '  - (items listed on your order)';
  const totalText = formatMoney(order);

  const subject = `Your LitCasa order ${order.id} is confirmed`;

  const text =
    `Hi ${customerName},\n\n` +
    `Thank you for shopping with LitCasa! Your order is confirmed.\n\n` +
    `Order: ${order.id}\n` +
    `Items:\n${itemLines}\n\n` +
    `Total: ${totalText}\n\n` +
    `We'll email your tracking number as soon as your order ships. ` +
    `Delivery times are estimates — your order ships direct from our supplier.\n\n` +
    `Thanks again,\n` +
    `LitCasa — HVD Holdings, LLC`;

  const itemRows = items.length
    ? items
        .map((item) => {
          const name = item.name || item.product_name || 'Item';
          const qty = item.quantity != null ? item.quantity : item.qty != null ? item.qty : 1;
          return `<tr><td style="padding:6px 0;">${escapeHtml(name)}</td><td style="padding:6px 0;text-align:right;">x${escapeHtml(qty)}</td></tr>`;
        })
        .join('')
    : '<tr><td style="padding:6px 0;">Items listed on your order</td></tr>';

  const html =
    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#16130E;">` +
    `<h1 style="font-size:24px;">LitCasa</h1>` +
    `<p>Hi ${escapeHtml(customerName)},</p>` +
    `<p>Thank you for shopping with LitCasa! Your order is confirmed.</p>` +
    `<p><strong>Order:</strong> ${escapeHtml(order.id)}</p>` +
    `<table style="width:100%;border-collapse:collapse;">${itemRows}</table>` +
    `<p><strong>Total: ${escapeHtml(totalText)}</strong></p>` +
    `<p>We&rsquo;ll email your tracking number as soon as your order ships. Delivery times are estimates &mdash; your order ships direct from our supplier.</p>` +
    `<p>Thanks again,<br/>LitCasa &mdash; HVD Holdings, LLC</p>` +
    `</div>`;

  const { data, error } = await resend.emails.send({ from, to, subject, text, html });
  if (error) {
    throw new Error(
      `Resend failed to send order confirmation: ${error.message || JSON.stringify(error)}`
    );
  }
  return data;
}

module.exports = { sendOrderConfirmation };

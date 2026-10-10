// God's Chai — the back end of our own payment page, godschai.com/checkout/
// (Vercel function).
//
// The page takes the card with Square's Web Payments SDK: the card number goes
// from Square's secure fields straight to Square, which hands the page a
// one-time token. This turns that token into a payment for exactly the order
// in the cart, at Square's own prices (lib/order.js).
//
//   GET                         → { ready, applicationId, locationId }
//   POST { action: "quote" }    → the order's totals, worked out by Square
//   POST { action: "pay" }      → creates the order and takes the payment
//
// Set in Vercel → Settings → Environment Variables:
//   SQUARE_ACCESS_TOKEN     already there for the checkout
//   SQUARE_APPLICATION_ID   the app's Application ID (not a secret; it's on the
//                           app's Credentials page, Production)
// Square doesn't email a receipt for payments taken this way, so the page only
// switches on once our own order emails can go out (api/square-webhook.js:
// SQUARE_WEBHOOK_SIGNATURE_KEY, RESEND_API_KEY and EMAIL_FROM).

import { cors, jsonBody, readOrder, squareOrder, square, LOCATION_ID, SHIPPING_NAME } from '../lib/order.js';

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
const POSTAL = /^([ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]) ?(\d[ABCEGHJ-NPRSTV-Z]\d)$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A few pay attempts per visitor per instance, to slow down anyone testing
// stolen cards against the form. Square's own fraud checks still run on every
// payment; this just keeps the noise down.
const RECENT = new Map();
const LIMIT = 8, WINDOW_MS = 10 * 60 * 1000;
function tooMany(req) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const hits = (RECENT.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  RECENT.set(ip, hits);
  if (RECENT.size > 5000) RECENT.clear();
  return hits.length > LIMIT;
}

export function needs(env) {
  return ['SQUARE_ACCESS_TOKEN', 'SQUARE_APPLICATION_ID', 'SQUARE_WEBHOOK_SIGNATURE_KEY', 'RESEND_API_KEY', 'EMAIL_FROM']
    .filter((k) => !env[k]);
}

const text = (v, max) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '').slice(0, max);

// The buyer's details, checked and tidied, or { error } naming the first bad field.
export function readBuyer(body, zoneKey) {
  const c = (body && body.contact) || {}, a = (body && body.address) || {};
  const email = text(c.email, 254).toLowerCase();
  if (!EMAIL.test(email)) return { error: 'email' };
  let phone = text(c.phone, 30).replace(/[^\d+]/g, '');
  if (phone && /^\d{10}$/.test(phone)) phone = '+1' + phone;
  else if (phone && /^1\d{10}$/.test(phone)) phone = '+' + phone;
  if (phone && !/^\+\d{8,15}$/.test(phone)) return { error: 'phone' };
  const first = text(a.first, 60), last = text(a.last, 60);
  if (!first) return { error: 'first' };
  if (!last) return { error: 'last' };
  const line1 = text(a.line1, 100), line2 = text(a.line2, 100);
  if (!line1) return { error: 'line1' };
  const m = text(a.postal, 8).toUpperCase().replace(/-/, ' ').match(POSTAL);
  if (!m) return { error: 'postal' };
  const postal = m[1] + ' ' + m[2];
  let city = text(a.city, 60), province = text(a.province, 2).toUpperCase();
  if (zoneKey === 'saskatoon') {
    // Free delivery is for Saskatoon addresses, which all start S7.
    if (!/^S7/.test(postal)) return { error: 'not_saskatoon' };
    city = 'Saskatoon'; province = 'SK';
  }
  if (!city) return { error: 'city' };
  if (!PROVINCES.includes(province)) return { error: 'province' };
  return { email, phone, first, last, line1, line2, city, province, postal };
}

function orderWithDelivery(o, buyer, optIn) {
  const order = squareOrder(o);
  // Ticked "send me new blends and deals": the order emails pass it to Mailchimp.
  if (optIn) order.metadata = { marketing: 'yes' };
  if (o.fee) {
    order.service_charges = [{ uid: 'ship', name: SHIPPING_NAME, amount_money: { amount: o.fee, currency: 'CAD' }, calculation_phase: 'TOTAL_PHASE', taxable: false }];
  }
  if (buyer) {
    order.source = { name: 'godschai.com' };
    order.fulfillments = [{
      type: 'SHIPMENT',
      state: 'PROPOSED',
      shipment_details: {
        recipient: {
          display_name: buyer.first + ' ' + buyer.last,
          email_address: buyer.email,
          phone_number: buyer.phone || undefined,
          address: squareAddress(buyer),
        },
      },
    }];
  }
  return order;
}

function squareAddress(b) {
  return {
    first_name: b.first, last_name: b.last,
    address_line_1: b.line1, address_line_2: b.line2 || undefined,
    locality: b.city, administrative_district_level_1: b.province, postal_code: b.postal, country: 'CA',
  };
}

function totals(order) {
  const amt = (m) => (m && m.amount) || 0;
  const off = (uid) => amt(((order.discounts || []).find((x) => x.uid === uid) || {}).applied_money);
  return {
    subtotal: (order.line_items || []).reduce((s, l) => s + amt(l.gross_sales_money), 0),
    discount: amt(order.total_discount_money),
    pairDiscount: off('pair'),
    codeDiscount: off('code'),
    tax: amt(order.total_tax_money),
    shipping: amt(order.total_service_charge_money),
    total: amt(order.total_money),
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const allowed = cors(req, res);
  if (req.method === 'OPTIONS') return res.status(allowed ? 204 : 403).end();
  const env = process.env;

  if (req.method === 'GET') {
    const missing = needs(env);
    return res.status(200).json({
      ok: true, ready: !missing.length, needs: missing,
      applicationId: env.SQUARE_APPLICATION_ID || null, locationId: LOCATION_ID,
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!allowed) return res.status(403).json({ error: 'origin' });
  if (needs(env).length) return res.status(503).json({ error: 'not_configured' });

  const body = jsonBody(req);
  const o = readOrder(body);
  if (o.error) return res.status(400).json({ error: o.error });
  if (o.badCode) return res.status(400).json({ error: 'bad_code' });
  const token = env.SQUARE_ACCESS_TOKEN;

  // The totals before paying, from Square itself, so the page shows exactly
  // what the card will be charged.
  if (body.action === 'quote') {
    const q = await square('/orders/calculate', token, { order: orderWithDelivery(o) }).catch(() => null);
    if (!q || !q.ok || !q.data.order) {
      console.error('quote_failed', q && q.status);
      return res.status(502).json({ error: 'square' });
    }
    return res.status(200).json(totals(q.data.order));
  }
  if (body.action !== 'pay') return res.status(400).json({ error: 'bad_request' });

  if (tooMany(req)) return res.status(429).json({ error: 'slow_down' });
  const buyer = readBuyer(body, o.zoneKey);
  if (buyer.error) return res.status(400).json({ error: buyer.error });
  const attempt = typeof body.attempt === 'string' && /^[A-Za-z0-9-]{8,40}$/.test(body.attempt) ? body.attempt : '';
  const source = typeof body.token === 'string' && body.token.length <= 512 ? body.token : '';
  if (!attempt || !source || !Number.isInteger(body.expectTotal)) return res.status(400).json({ error: 'bad_request' });

  // 1. The order. The same attempt always gets the same order back, so a
  //    retry after a dropped connection can't make a second one.
  const made = await square('/orders', token, { idempotency_key: 'o-' + attempt, order: orderWithDelivery(o, buyer, body.optIn === true) }).catch(() => null);
  const order = made && made.ok && made.data.order;
  if (!order) {
    console.error('order_failed', made && made.status, made && made.data.errors && made.data.errors[0] && made.data.errors[0].code);
    return res.status(502).json({ error: 'square' });
  }
  const total = (order.total_money || {}).amount;
  // Never charge a different amount from the one the buyer was shown.
  if (total !== body.expectTotal) return res.status(409).json({ error: 'total_changed', ...totals(order) });

  // 2. The payment, for exactly the order's total. Same attempt, same payment.
  const paid = await square('/payments', token, {
    idempotency_key: 'p-' + attempt,
    source_id: source,
    amount_money: order.total_money,
    order_id: order.id,
    location_id: LOCATION_ID,
    autocomplete: true,
    buyer_email_address: buyer.email,
    shipping_address: squareAddress(buyer),
    note: o.note,
  }).catch(() => null);
  const payment = paid && paid.data && paid.data.payment;
  if (paid && paid.ok && payment && (payment.status === 'COMPLETED' || payment.status === 'APPROVED')) {
    return res.status(200).json({
      ok: true, receipt: payment.receipt_number || order.id.slice(0, 4), receiptUrl: payment.receipt_url || null,
      zone: o.zoneKey, ...totals(order),
    });
  }
  const err = (paid && paid.data && paid.data.errors && paid.data.errors[0]) || {};
  if (err.category === 'PAYMENT_METHOD_ERROR' || /^CARD_TOKEN_(EXPIRED|USED)$/.test(err.code || '')) {
    // The card said no (declined, wrong CVV, postal code mismatch…), or its
    // one-time token is spent. Nothing was charged; the page asks again.
    return res.status(402).json({ error: 'declined', code: err.code || null });
  }
  console.error('payment_failed', paid && paid.status, err.code);
  return res.status(502).json({ error: 'square', code: err.code || null });
}

// God's Chai — order emails (Vercel function).
//
// Square calls this the moment a website payment goes through. We email
// ourselves a new-order alert straight away and, once godschai.com is verified
// with Resend, the customer our branded order confirmation (lib/email.js).
//
// Set in Vercel → Settings → Environment Variables:
//   SQUARE_ACCESS_TOKEN            reads the order from Square
//   SQUARE_WEBHOOK_SIGNATURE_KEY   proves a request really came from Square
//   RESEND_API_KEY                 sends the emails (resend.com)
//   ORDER_ALERT_TO                 optional; where alerts go (comma-separated),
//                                  default sip@godschai.com
//   EMAIL_FROM                     optional; set it once godschai.com is verified
//                                  in Resend, e.g. "God's Chai <orders@godschai.com>".
//                                  Until then alerts come from onboarding@resend.dev
//                                  and customers get Square's receipt only.
//   SQUARE_WEBHOOK_URL             optional; this function's address exactly as
//                                  given to Square (otherwise read off the request)
//
// GET on this address says which of those are set (never their values).

import crypto from 'node:crypto';
import { orderSummary, customerEmail, ownerEmail } from '../lib/email.js';

const SQ = 'https://connect.squareup.com/v2';
const SQ_VERSION = '2024-10-17';
const SHOP_EMAIL = 'sip@godschai.com';
const TEST_FROM = "God's Chai Orders <onboarding@resend.dev>"; // works before the domain is verified
// Resend remembers an Idempotency-Key for 24 hours, so we only act on payments
// younger than that: a late retry or replay can't send the same order twice.
const MAX_AGE_MS = 23 * 60 * 60 * 1000;

function rawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Square signs notification URL + body with the subscription's key (HMAC-SHA256, base64).
export function validSignature(body, signature, key, url) {
  if (!signature || !key || !url) return false;
  const expected = crypto.createHmac('sha256', key).update(url + body).digest('base64');
  const a = Buffer.from(expected), b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// A new website sale: paid, through the online checkout (not the pop-up's card
// reader), not refunded, and recent. Square sends payment.created and then
// payment.updated several times for one sale (and again on a refund);
// whichever arrives first sends the emails and the rest are no-ops.
export function isNewOrder(event, now = Date.now()) {
  const p = event && event.data && event.data.object && event.data.object.payment;
  return !!p && (event.type === 'payment.created' || event.type === 'payment.updated') &&
    p.status === 'COMPLETED' && !!p.order_id &&
    (p.application_details || {}).square_product === 'ECOMMERCE_API' &&
    !(p.refund_ids || []).length && !(p.refunded_money || {}).amount &&
    !(now - Date.parse(p.created_at) > MAX_AGE_MS);
}

export function alertList(env) {
  return (env.ORDER_ALERT_TO || SHOP_EMAIL).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

async function send(mail, idempotencyKey) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(mail),
  });
  // 409: this key was already used, i.e. the email has already gone out.
  if (!r.ok && r.status !== 409) throw new Error('resend ' + r.status);
}

async function loadOrder(id, token) {
  try {
    const r = await fetch(SQ + '/orders/' + encodeURIComponent(id), {
      headers: { Authorization: 'Bearer ' + token, 'Square-Version': SQ_VERSION },
    });
    const data = await r.json();
    if (r.ok && data.order) return data.order;
    console.error('order_load_failed', id, r.status);
  } catch (e) {
    console.error('order_load_failed', id, e.message);
  }
  return null;
}

export default async function handler(req, res) {
  const env = process.env;
  if (req.method === 'GET') {
    const ready = {
      squareToken: !!env.SQUARE_ACCESS_TOKEN,
      signatureKey: !!env.SQUARE_WEBHOOK_SIGNATURE_KEY,
      resendKey: !!env.RESEND_API_KEY,
    };
    return res.status(200).json({ ok: true, ready: Object.values(ready).every(Boolean), ...ready, customerEmails: !!env.EMAIL_FROM });
  }
  if (req.method !== 'POST') return res.status(405).end();

  const body = await rawBody(req);
  const url = env.SQUARE_WEBHOOK_URL || 'https://' + (req.headers['x-forwarded-host'] || req.headers.host) + req.url;
  if (!validSignature(body, req.headers['x-square-hmacsha256-signature'], env.SQUARE_WEBHOOK_SIGNATURE_KEY, url)) {
    return res.status(401).json({ error: 'signature' });
  }

  let event;
  try { event = JSON.parse(body); } catch (e) { return res.status(400).end(); }
  if (!isNewOrder(event)) return res.status(200).json({ skipped: true });
  const payment = event.data.object.payment;

  // If Square won't hand over the order, the alert still goes out with what
  // the payment carries (total, customer, receipt link).
  const order = await loadOrder(payment.order_id, env.SQUARE_ACCESS_TOKEN);
  const o = orderSummary(order, payment);
  const failed = [];
  const attempt = (mail, key) => send(mail, key).catch((e) => { failed.push(key + ' ' + e.message); });

  // Us first, one email per address so one bad address can't hold up the rest.
  const alert = ownerEmail(o);
  for (const to of alertList(env)) {
    await attempt({ from: env.EMAIL_FROM || TEST_FROM, to: [to], reply_to: o.email || undefined, subject: alert.subject, text: alert.text }, 'owner-' + payment.id + '-' + to);
  }
  // Then the customer, once our own domain can send (EMAIL_FROM is set).
  const customerDue = !!(env.EMAIL_FROM && o.email);
  if (customerDue && order) {
    const c = customerEmail(o);
    await attempt({ from: env.EMAIL_FROM, to: [o.email], reply_to: SHOP_EMAIL, subject: c.subject, html: c.html, text: c.text }, 'customer-' + payment.id);
  }

  if (failed.length || (customerDue && !order)) {
    // Square retries; anything already sent is skipped thanks to the keys.
    console.error('order_email_retry', payment.id, failed.join('; ') || 'order not loaded');
    return res.status(500).json({ error: 'retry' });
  }
  return res.status(200).json({ sent: true });
}

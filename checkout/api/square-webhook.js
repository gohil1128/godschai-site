// God's Chai — order emails (Vercel function).
//
// Square calls this when a payment changes. For each completed payment from
// the website (not the pop-up's card reader), it emails the customer our own
// branded order confirmation (lib/email.js) and sends us a new-order alert.
//
// Secrets, set in Vercel → Settings → Environment Variables:
//   SQUARE_ACCESS_TOKEN            to read the order from Square
//   SQUARE_WEBHOOK_SIGNATURE_KEY   proves a request really came from Square
//   SQUARE_WEBHOOK_URL             this function's address, exactly as given to Square
//   RESEND_API_KEY                 sends the emails (resend.com)
//   ORDER_ALERT_TO                 where new-order alerts go (comma-separated)
//   EMAIL_FROM                     optional; default "God's Chai <orders@godschai.com>"

import crypto from 'node:crypto';
import { orderSummary, customerEmail, ownerEmail } from '../lib/email.js';

const SQ = 'https://connect.squareup.com/v2';
const SQ_VERSION = '2024-10-17';

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

async function send(mail, idempotencyKey) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey, // Square may send the same event twice
    },
    body: JSON.stringify(mail),
  });
  if (!r.ok) throw new Error('resend ' + r.status);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = await rawBody(req);
  const env = process.env;
  if (!validSignature(body, req.headers['x-square-hmacsha256-signature'], env.SQUARE_WEBHOOK_SIGNATURE_KEY, env.SQUARE_WEBHOOK_URL)) {
    return res.status(401).json({ error: 'signature' });
  }

  let event;
  try { event = JSON.parse(body); } catch (e) { return res.status(400).end(); }
  const payment = event && event.data && event.data.object && event.data.object.payment;
  // Only finished payments made through the website's checkout.
  if (!payment || event.type !== 'payment.updated' || payment.status !== 'COMPLETED' ||
      !payment.order_id || (payment.application_details || {}).square_product !== 'ECOMMERCE_API') {
    return res.status(200).json({ skipped: true });
  }

  try {
    const r = await fetch(SQ + '/orders/' + encodeURIComponent(payment.order_id), {
      headers: { Authorization: 'Bearer ' + env.SQUARE_ACCESS_TOKEN, 'Square-Version': SQ_VERSION },
    });
    const data = await r.json();
    if (!r.ok || !data.order) throw new Error('order ' + r.status);
    const o = orderSummary(data.order, payment);
    const from = env.EMAIL_FROM || "God's Chai <orders@godschai.com>";

    if (o.email) {
      const c = customerEmail(o);
      await send({ from, to: [o.email], reply_to: 'sip@godschai.com', subject: c.subject, html: c.html, text: c.text }, 'customer-' + payment.id);
    }
    const alertTo = (env.ORDER_ALERT_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (alertTo.length) {
      const w = ownerEmail(o);
      await send({ from, to: alertTo, reply_to: o.email || undefined, subject: w.subject, text: w.text }, 'owner-' + payment.id);
    }
    return res.status(200).json({ sent: true });
  } catch (e) {
    console.error('order_email_failed', payment.id, e.message);
    return res.status(500).json({ error: 'send' }); // Square retries later
  }
}

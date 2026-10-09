// God's Chai — checkout service (Vercel function).
//
// The website's cart sends { items: { o: 2, r: 7 }, zone: "canada" } and gets
// back a Square checkout URL for exactly that order. The buyer then pays on
// Square's own page; no card details ever come near this code.
//
// What someone pays is worked out in lib/order.js (Square's catalog prices,
// the PST, the pair price and the shipping rule); the browser only says how
// many of what, and where to.
//
// Needs one secret, set in Vercel → Project → Settings → Environment
// Variables: SQUARE_ACCESS_TOKEN (a Square production access token).

import { cors, jsonBody, readOrder, squareOrder, SHIPPING_NAME } from '../lib/order.js';

const SQUARE = 'https://connect.squareup.com/v2/online-checkout/payment-links';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const allowed = cors(req, res);
  if (req.method === 'OPTIONS') return res.status(allowed ? 204 : 403).end();

  // Health check: says whether the Square token is set, never what it is.
  if (req.method === 'GET') return res.status(200).json({ ok: true, configured: !!process.env.SQUARE_ACCESS_TOKEN });

  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!allowed) return res.status(403).json({ error: 'origin' });
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) return res.status(503).json({ error: 'not_configured' });

  const o = readOrder(jsonBody(req));
  if (o.error) return res.status(400).json({ error: o.error });

  const order = squareOrder(o);
  const parts = o.pairs > 0 ? o.parts.concat('(pair price)') : o.parts;
  const checkout_options = {
    ask_for_shipping_address: true,
    redirect_url: 'https://godschai.com/order-confirmed/',
    merchant_support_email: 'sip@godschai.com',
    allow_tipping: false,
    enable_coupon: false,
    accepted_payment_methods: { apple_pay: true, google_pay: true },
  };
  if (o.fee) checkout_options.shipping_fee = { name: SHIPPING_NAME, charge: { amount: o.fee, currency: 'CAD' } };

  const r = await fetch(SQUARE, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Square-Version': '2024-10-17',
    },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      description: parts.join(' + ') + ', ' + o.zone.label + (o.shipFree ? ' (free shipping)' : ''),
      order,
      checkout_options,
      payment_note: o.note,
    }),
  }).catch(() => null);

  const data = r ? await r.json().catch(() => null) : null;
  const url = data && data.payment_link && data.payment_link.url;
  if (!r || !r.ok || !url) {
    const code = data && data.errors && data.errors[0] && data.errors[0].code;
    console.error('square_error', r && r.status, code);
    return res.status(502).json({ error: 'square', code: code || null });
  }
  return res.status(200).json({ url });
}

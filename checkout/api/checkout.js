// God's Chai — checkout service (Vercel function).
//
// The website's cart sends { items: { o: 2, r: 7 }, zone: "canada" } and gets
// back a Square checkout URL for exactly that order. The buyer then pays on
// Square's own page; no card details ever come near this code.
//
// Everything that decides what someone pays lives here, not in the browser:
// the Square item IDs (so Square's own catalog price is charged), the PST, and
// the shipping rule. The browser only says how many of what, and where to.
//
// Needs one secret, set in Vercel → Project → Settings → Environment
// Variables: SQUARE_ACCESS_TOKEN (a Square production access token).

const LOCATION_ID = 'LGQPHWFXHFPD7';
// Blend letter (as on the website) → Square item variation
const ITEMS = {
  o: { id: 'LT5NXWGSCUK4L3U6UDQNR4A4', name: 'Original Masala' },
  r: { id: 'ERNSJN2KJTUS2XYR7JGDPKX3', name: 'Rose & Cardamom' },
};
const PST_TAX_ID = 'WBQJUT2CSG7LAGAFLXDS3AOO'; // Square's 6% PST
const ZONES = {
  saskatoon: { tax: true, fee: 0, note: 'Saskatoon delivery (free)', label: 'Saskatoon delivery' },
  canada: { tax: false, fee: 999, freeFrom: 5, note: 'Canada Post shipping', label: 'shipped in Canada' },
};
// "Try both": each Original + Rose pair costs $24.99 instead of $29.98.
// Matches pair_price in _data/shop.yml. Comes off before PST.
const PAIR_SAVING = 499;
const MAX_EACH = 99;
const ORIGINS = ['https://godschai.com', 'https://www.godschai.com'];
const SQUARE = 'https://connect.squareup.com/v2/online-checkout/payment-links';

function cors(req, res) {
  const origin = req.headers.origin || '';
  if (ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  return ORIGINS.includes(origin);
}

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

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const zone = body && ZONES[body.zone];
  if (!zone || !body.items || typeof body.items !== 'object') return res.status(400).json({ error: 'bad_request' });

  const lines = [], parts = [];
  let count = 0;
  for (const key of Object.keys(ITEMS)) {
    const q = body.items[key];
    if (q === undefined || q === 0) continue;
    if (!Number.isInteger(q) || q < 0 || q > MAX_EACH) return res.status(400).json({ error: 'bad_quantity' });
    lines.push({ catalog_object_id: ITEMS[key].id, quantity: String(q) });
    parts.push(q + ' ' + ITEMS[key].name);
    count += q;
  }
  for (const key of Object.keys(body.items)) if (!ITEMS[key]) return res.status(400).json({ error: 'bad_item' });
  if (!count) return res.status(400).json({ error: 'empty' });

  const shipFree = zone.freeFrom && count >= zone.freeFrom;
  const order = { location_id: LOCATION_ID, line_items: lines };
  const pairs = Math.min(body.items.o || 0, body.items.r || 0);
  if (pairs > 0) {
    order.discounts = [{ uid: 'pair', name: 'Try both: pair price', amount_money: { amount: pairs * PAIR_SAVING, currency: 'CAD' }, scope: 'ORDER' }];
    parts.push('(pair price)');
  }
  if (zone.tax) order.taxes = [{ uid: 'pst', catalog_object_id: PST_TAX_ID, scope: 'ORDER' }];
  const checkout_options = {
    ask_for_shipping_address: true,
    redirect_url: 'https://godschai.com/order-confirmed/',
    merchant_support_email: 'sip@godschai.com',
    allow_tipping: false,
    enable_coupon: false,
    accepted_payment_methods: { apple_pay: true, google_pay: true },
  };
  if (zone.fee && !shipFree) {
    checkout_options.shipping_fee = { name: 'Canada Post Expedited (tracked)', charge: { amount: zone.fee, currency: 'CAD' } };
  }

  const r = await fetch(SQUARE, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Square-Version': '2024-10-17',
    },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      description: parts.join(' + ') + ', ' + zone.label + (shipFree ? ' (free shipping)' : ''),
      order,
      checkout_options,
      payment_note: zone.note + (shipFree ? ' (free, ' + zone.freeFrom + '+ pouches)' : ''),
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

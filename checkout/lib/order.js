// God's Chai — what an order is, for both ways of paying:
//   api/checkout.js  makes a Square checkout page for the order
//   api/pay.js       takes the payment on our own page (godschai.com/checkout/)
//
// Everything that decides what someone pays lives here, not in the browser:
// the Square item IDs (so Square's own catalog price is charged), the PST, the
// pair price and the shipping rule. The browser only says how many of what,
// and where to. Change these together with _data/shop.yml.

export const LOCATION_ID = 'LGQPHWFXHFPD7';
export const SQUARE_API = 'https://connect.squareup.com/v2';
export const SQUARE_VERSION = '2024-10-17';

// Blend letter (as on the website) → Square item variation
export const ITEMS = {
  o: { id: 'LT5NXWGSCUK4L3U6UDQNR4A4', name: 'Original Masala' },
  r: { id: 'ERNSJN2KJTUS2XYR7JGDPKX3', name: 'Rose & Cardamom' },
};
export const PST_TAX_ID = 'WBQJUT2CSG7LAGAFLXDS3AOO'; // Square's 6% PST
export const ZONES = {
  saskatoon: { tax: true, fee: 0, note: 'Saskatoon delivery (free)', label: 'Saskatoon delivery' },
  canada: { tax: false, fee: 999, freeFrom: 5, note: 'Canada Post shipping', label: 'shipped in Canada' },
};
export const SHIPPING_NAME = 'Canada Post Expedited (tracked)';
// "Try both": each Original + Rose pair costs $24.99 instead of $29.98.
// Matches pair_price in _data/shop.yml. Comes off before PST.
export const PAIR_SAVING = 499;
export const MAX_EACH = 99;
export const ORIGINS = ['https://godschai.com', 'https://www.godschai.com'];

export function cors(req, res, methods) {
  const origin = req.headers.origin || '';
  const ok = ORIGINS.includes(origin);
  if (ok) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', methods || 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  return ok;
}

export function jsonBody(req) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  return body && typeof body === 'object' ? body : null;
}

// { items: { o: 2, r: 1 }, zone: 'canada' } → the order, or { error } for a 400.
export function readOrder(body) {
  const zone = body && ZONES[body.zone];
  if (!zone || !body.items || typeof body.items !== 'object') return { error: 'bad_request' };
  const lines = [], parts = [];
  let count = 0;
  for (const key of Object.keys(ITEMS)) {
    const q = body.items[key];
    if (q === undefined || q === 0) continue;
    if (!Number.isInteger(q) || q < 0 || q > MAX_EACH) return { error: 'bad_quantity' };
    lines.push({ catalog_object_id: ITEMS[key].id, quantity: String(q) });
    parts.push(q + ' ' + ITEMS[key].name);
    count += q;
  }
  for (const key of Object.keys(body.items)) if (!ITEMS[key]) return { error: 'bad_item' };
  if (!count) return { error: 'empty' };
  const pairs = Math.min(body.items.o || 0, body.items.r || 0);
  const shipFree = !!(zone.freeFrom && count >= zone.freeFrom);
  return {
    zoneKey: body.zone, zone, lines, parts, count, pairs, shipFree,
    fee: zone.fee && !shipFree ? zone.fee : 0,
    note: zone.note + (shipFree ? ' (free, ' + zone.freeFrom + '+ pouches)' : ''),
  };
}

// The Square order for it: the pouches, the pair price and the PST. Shipping
// is added by the caller (a checkout option on Square's page, a service charge
// on ours).
export function squareOrder(o) {
  const order = { location_id: LOCATION_ID, line_items: o.lines.map((l) => ({ ...l })) };
  if (o.pairs > 0) {
    order.discounts = [{ uid: 'pair', name: 'Try both: pair price', amount_money: { amount: o.pairs * PAIR_SAVING, currency: 'CAD' }, scope: 'ORDER' }];
  }
  if (o.zone.tax) order.taxes = [{ uid: 'pst', catalog_object_id: PST_TAX_ID, scope: 'ORDER' }];
  return order;
}

export async function square(path, token, body) {
  const r = await fetch(SQUARE_API + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'Square-Version': SQUARE_VERSION },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

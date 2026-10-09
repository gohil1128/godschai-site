// God's Chai — the order emails, built from a Square order.
//
//   customerEmail(o) → the branded "your order's confirmed" email
//   ownerEmail(o)    → the plain new-order alert for us
//
// `o` comes from orderSummary() below. Email HTML is old-fashioned on
// purpose: tables, inline styles, web-safe font fallbacks and images hosted on
// godschai.com, because that's what Gmail, Outlook and Apple Mail all render.

const SITE = 'https://godschai.com';
const IMG = {
  logo: SITE + '/uploads/opt/logo-cream-256.png',
  'Original Masala': SITE + '/uploads/opt/pouch-masala-front-250.jpg',
  'Rose & Cardamom': SITE + '/uploads/opt/pouch-rose-front-250.jpg',
};
const ZONE_TEXT = {
  saskatoon: {
    label: 'Free delivery in Saskatoon',
    next: 'We’ll drop it at your door, free — usually within 3 days. If we need to reach you about the drop-off, we’ll use the email or phone number you gave at checkout.',
  },
  canada: {
    label: 'Canada Post, tracked',
    next: 'We pack it within 2 business days and send it by Canada Post Expedited. We’ll email your tracking number as soon as it’s in the post — usually 2–7 business days to reach you.',
  },
};

const money = (cents) => '$' + (cents / 100).toFixed(2);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Square order + payment → just what the emails need. `order` can be null
// (Square didn't hand it over); the alert then makes do with the payment.
export function orderSummary(order, payment) {
  order = order || {};
  payment = payment || {};
  const f = (order.fulfillments || [])[0] || {};
  const rec = (f.shipment_details && f.shipment_details.recipient) || {};
  const a = rec.address || payment.shipping_address || {};
  const zone = /saskatoon/i.test(payment.note || '') ? 'saskatoon' : 'canada';
  const ship = (order.service_charges || []).reduce((s, c) => s + ((c.total_money || {}).amount || 0), 0);
  return {
    receipt: payment.receipt_number || (order.id || '').slice(0, 4),
    receiptUrl: payment.receipt_url || '',
    placedAt: payment.created_at || order.created_at,
    zone,
    firstName: a.first_name || (rec.display_name || '').split(' ')[0] || '',
    name: rec.display_name || [a.first_name, a.last_name].filter(Boolean).join(' '),
    email: rec.email_address || payment.buyer_email_address || '',
    phone: rec.phone_number || '',
    address: [a.address_line_1, a.address_line_2, [a.locality, a.administrative_district_level_1].filter(Boolean).join(', ') + (a.postal_code ? '  ' + a.postal_code : '')].filter(Boolean),
    items: (order.line_items || []).map((l) => ({ name: l.name, qty: Number(l.quantity), total: (l.gross_sales_money || {}).amount || 0 })),
    subtotal: (order.line_items || []).reduce((s, l) => s + ((l.gross_sales_money || {}).amount || 0), 0),
    discount: (order.total_discount_money || {}).amount || 0,
    discountName: ((order.discounts || [])[0] || {}).name || 'Discount',
    tax: (order.total_tax_money || {}).amount || 0,
    taxName: ((order.taxes || [])[0] || {}).name || 'Tax',
    shipping: ship,
    total: (order.total_money || payment.total_money || {}).amount || 0,
  };
}

export function customerEmail(o) {
  const z = ZONE_TEXT[o.zone] || ZONE_TEXT.canada;
  const pouches = o.items.reduce((s, i) => s + i.qty, 0);
  const subject = `Your God's Chai order is confirmed (#${o.receipt})`;
  const serif = "'Instrument Serif',Georgia,'Times New Roman',serif";
  const sans = "'Hanken Grotesk',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
  const mono = "'DM Mono',Menlo,Consolas,monospace";
  const row = (l, r, strong) => `<tr><td style="padding:6px 0;font:${strong ? '700 17px' : '400 15px'} ${sans};color:${strong ? '#1D120B' : '#5A4535'}">${l}</td><td align="right" style="padding:6px 0;font:${strong ? '700 17px' : '400 15px'} ${sans};color:${strong ? '#1D120B' : '#5A4535'}">${r}</td></tr>`;
  const items = o.items.map((i) => `
          <tr>
            <td width="64" style="padding:12px 0;border-bottom:1px solid #EADFCB">${IMG[i.name] ? `<img src="${IMG[i.name]}" width="48" alt="" style="display:block;width:48px;height:auto;border-radius:6px">` : ''}</td>
            <td style="padding:12px 0;border-bottom:1px solid #EADFCB;font:400 19px ${serif};color:#1D120B">${esc(i.name)}<div style="font:400 12px ${mono};color:#8A7360;letter-spacing:.04em;margin-top:3px">${i.qty} × 125 g pouch · ${i.qty * 25} cups</div></td>
            <td align="right" style="padding:12px 0;border-bottom:1px solid #EADFCB;font:400 15px ${mono};color:#1D120B;white-space:nowrap">${money(i.total)}</td>
          </tr>`).join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F3E8D3">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Thank you${o.firstName ? ', ' + esc(o.firstName) : ''} — ${pouches} pouch${pouches === 1 ? '' : 'es'} of proper masala chai, ${o.zone === 'saskatoon' ? 'coming to your door' : 'on its way soon'}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3E8D3"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFBF4;border-radius:20px;overflow:hidden">
    <tr><td align="center" style="background:#1D120B;padding:30px 24px 26px">
      <a href="${SITE}"><img src="${IMG.logo}" width="96" height="96" alt="God's Chai" style="display:block;width:96px;height:96px"></a>
      <div style="font:400 12px ${mono};letter-spacing:.2em;text-transform:uppercase;color:#F2A93C;margin-top:18px">Order confirmed · #${esc(o.receipt)}</div>
      <div style="font:400 38px/1.05 ${serif};color:#F3E8D3;margin-top:10px">Thank you${o.firstName ? ', ' + esc(o.firstName) : ''}.<br><span style="color:#FF6F61;font-style:italic">That's ordered.</span></div>
    </td></tr>
    <tr><td style="padding:28px 32px 6px">
      <div style="font:400 12px ${mono};letter-spacing:.16em;text-transform:uppercase;color:#C58A2E">Your order</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px">${items}
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px">
        ${row(pouches + ' pouch' + (pouches === 1 ? '' : 'es'), money(o.subtotal))}
        ${o.discount ? row(esc(o.discountName), '−' + money(o.discount)) : ''}
        ${o.tax ? row(esc(o.taxName), money(o.tax)) : ''}
        ${row('Delivery', o.shipping ? money(o.shipping) : 'Free')}
        <tr><td colspan="2" style="border-top:1px solid #EADFCB;padding-top:4px"></td></tr>
        ${row('Total paid', money(o.total), true)}
      </table>
    </td></tr>
    <tr><td style="padding:22px 32px 4px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7EEDD;border-radius:14px"><tr><td style="padding:18px 20px">
        <div style="font:400 12px ${mono};letter-spacing:.16em;text-transform:uppercase;color:#C58A2E">What happens next · ${esc(z.label)}</div>
        <div style="font:400 15px/1.55 ${sans};color:#3A2A1E;margin-top:8px">${z.next}</div>
        ${o.address.length ? `<div style="font:400 14px/1.5 ${sans};color:#5A4535;margin-top:12px"><strong style="color:#1D120B">Delivering to</strong><br>${[esc(o.name)].concat(o.address.map(esc)).join('<br>')}</div>` : ''}
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:22px 32px 4px">
      <div style="font:400 26px ${serif};color:#1D120B">Brew it the proper way</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
        ${['1 heaped teaspoon (5 g) per cup into ½ cup of boiling water.', 'Add ½ cup of milk and bring it back to a rolling boil.', 'Simmer 2–3 minutes, till it turns deep caramel.', 'Strain, sweeten to taste. That’s it.'].map((s, i) => `<tr><td width="34" valign="top" style="padding:6px 0;font:400 22px ${serif};color:#F2A93C">0${i + 1}</td><td style="padding:8px 0 6px;font:400 15px/1.45 ${sans};color:#3A2A1E">${s}</td></tr>`).join('')}
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr><td style="background:#F2A93C;border-radius:999px"><a href="${SITE}/how-to-make-masala-chai/" style="display:inline-block;padding:13px 24px;font:700 15px ${sans};color:#2B1B12;text-decoration:none">The full brew guide →</a></td></tr></table>
    </td></tr>
    <tr><td style="padding:26px 32px 30px">
      <div style="font:400 14px/1.6 ${sans};color:#5A4535">Questions, cravings or a brewing emergency? Just hit reply — a real human (usually mid-chai) will answer.${o.receiptUrl ? ` Your card receipt is <a href="${esc(o.receiptUrl)}" style="color:#C2410C">right here</a>.` : ''}</div>
    </td></tr>
    <tr><td align="center" style="background:#1D120B;padding:22px 24px">
      <div style="font:400 20px ${serif};color:#F3E8D3">Not your average chai.</div>
      <div style="font:400 12px/1.7 ${sans};color:#AB9280;margin-top:6px"><a href="https://www.instagram.com/godschai" style="color:#F2A93C;text-decoration:none">Instagram @godschai</a> · <a href="${SITE}" style="color:#F2A93C;text-decoration:none">godschai.com</a><br>God's Chai · Saskatoon, SK, Canada<br>You're getting this because you ordered at godschai.com.</div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    `Thank you${o.firstName ? ', ' + o.firstName : ''} — that's ordered. (Order #${o.receipt})`, '',
    ...o.items.map((i) => `${i.qty} × ${i.name} — ${money(i.total)}`),
    o.discount ? `${o.discountName}: −${money(o.discount)}` : null,
    o.tax ? `${o.taxName}: ${money(o.tax)}` : null,
    `Delivery: ${o.shipping ? money(o.shipping) : 'Free'}`,
    `Total paid: ${money(o.total)}`, '',
    `What happens next (${z.label}): ${z.next}`, '',
    o.address.length ? `Delivering to: ${[o.name].concat(o.address).join(', ')}` : null, '',
    'Brew it: 1 heaped tsp (5 g) per cup in ½ cup boiling water, add ½ cup milk, boil, simmer 2–3 min, strain, sweeten to taste.',
    `Full guide: ${SITE}/how-to-make-masala-chai/`, '',
    'Questions, cravings or a brewing emergency? Just hit reply — a real human (usually mid-chai) will answer.',
    o.receiptUrl ? `Card receipt: ${o.receiptUrl}` : null,
    '— God\'s Chai, Saskatoon',
  ].filter((l) => l !== null).join('\n');

  return { subject, html, text };
}

export function ownerEmail(o) {
  const items = o.items.map((i) => `${i.qty}× ${i.name}`).join(', ');
  const where = o.zone === 'saskatoon' ? 'Saskatoon delivery' : 'Canada Post';
  const subject = `New order #${o.receipt}: ${items ? items + ', ' : ''}${money(o.total)} (${where})`;
  const text = [
    `New website order #${o.receipt}`, '',
    ...(o.items.length
      ? o.items.map((i) => `${i.qty} × ${i.name} — ${money(i.total)}`)
      : ['(Square didn’t send the items just now. They’re on the receipt below and in Square Dashboard → Orders.)']),
    o.discount ? `${o.discountName}: −${money(o.discount)}` : null,
    o.tax ? `${o.taxName}: ${money(o.tax)}` : null,
    `Delivery: ${where}${o.items.length ? ' — ' + (o.shipping ? money(o.shipping) : 'free') : ''}`,
    `Total: ${money(o.total)}`, '',
    o.name ? `Customer: ${o.name}` : null, o.email ? `Email: ${o.email}` : null, o.phone ? `Phone: ${o.phone}` : null,
    o.address.length ? `Address: ${o.address.join(', ')}` : null, '',
    o.receiptUrl ? `Receipt: ${o.receiptUrl}` : null,
    'Fulfil it in Square Dashboard → Orders. Canada Post orders: add the tracking number there.',
    o.email ? 'Reply to this email to write to the customer.' : null,
  ].filter((l) => l !== null).join('\n');
  return { subject, text };
}

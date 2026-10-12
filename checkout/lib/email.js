// God's Chai — the order emails, built from a Square order.
//
//   customerEmail(o) → the branded "your order's confirmed" email
//   ownerEmail(o)    → the plain new-order alert for us
//
// `o` comes from orderSummary() below. Email HTML is old-fashioned on
// purpose: tables, inline styles and web-safe fonts, because that's what
// Gmail, Outlook and Apple Mail all render. The customer email follows the
// "Thank You Email" design; its numbers, names and addresses all come from
// the order, never from the design's sample text.

const SITE = 'https://godschai.com';
const INSTAGRAM = 'https://www.instagram.com/godschai';
const TIKTOK = 'https://www.tiktok.com/@godschaii';
// hero: the line under the heading. label/next: the plain-text version.
// Keep the wording in step with `zones` in _data/shop.yml.
const ZONE_TEXT = {
  saskatoon: {
    label: 'Free delivery in Saskatoon',
    hero: 'Your premixes are being packed by hand in Saskatoon, and we’ll drop them at your door, free — usually within 3 days of your order.',
    next: 'We’ll drop it at your door, free — usually within 3 days. If we need to reach you about the drop-off, we’ll use the email or phone number you gave at checkout.',
  },
  canada: {
    label: 'Canada Post, tracked',
    hero: 'Your premixes are being packed by hand in Saskatoon. We’ll email your tracking number as soon as they’re in the post — we pack within 2 business days, then it’s usually 2–7 business days to reach you.',
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
    lastName: a.last_name || (rec.display_name || '').split(' ').slice(1).join(' ') || '',
    name: rec.display_name || [a.first_name, a.last_name].filter(Boolean).join(' '),
    email: rec.email_address || payment.buyer_email_address || '',
    phone: rec.phone_number || '',
    address: [a.address_line_1, a.address_line_2, [a.locality, a.administrative_district_level_1].filter(Boolean).join(', ') + (a.postal_code ? '  ' + a.postal_code : '')].filter(Boolean),
    items: (order.line_items || []).map((l) => ({ name: l.name, qty: Number(l.quantity), total: (l.gross_sales_money || {}).amount || 0 })),
    subtotal: (order.line_items || []).reduce((s, l) => s + ((l.gross_sales_money || {}).amount || 0), 0),
    discount: (order.total_discount_money || {}).amount || 0,
    // Each discount on its own line: the pair price, a code, a Square coupon.
    discounts: (order.discounts || []).map((x) => ({ name: x.name || 'Discount', amount: (x.applied_money || {}).amount || 0 })).filter((x) => x.amount),
    tax: (order.total_tax_money || {}).amount || 0,
    taxName: ((order.taxes || [])[0] || {}).name || 'Tax',
    shipping: ship,
    total: (order.total_money || payment.total_money || {}).amount || 0,
  };
}

export function customerEmail(o) {
  const z = ZONE_TEXT[o.zone] || ZONE_TEXT.canada;
  const pouches = o.items.reduce((n, i) => n + i.qty, 0);
  const subject = `Your God's Chai order is confirmed (#${o.receipt})`;
  const serif = "Georgia,'Times New Roman',serif";
  const sans = 'Arial,Helvetica,sans-serif';
  const first = o.firstName ? ', ' + esc(o.firstName) : '';
  const eyebrow = (color) => `font-family:${sans};font-size:12px;line-height:16px;mso-line-height-rule:exactly;color:${color};letter-spacing:2px;text-transform:uppercase;font-weight:bold`;

  const items = o.items.map((i) => `
        <tr>
          <td style="padding:14px 0;border-top:1px solid #E3CFB6;font-family:${serif};font-size:18px;line-height:22px;color:#4A2410">${esc(i.name)}<br><span style="font-family:${sans};font-size:13px;line-height:18px;color:#8A5A3E">125 g · 25 cups each · Qty ${i.qty}</span></td>
          <td align="right" width="90" style="padding:14px 0;border-top:1px solid #E3CFB6;font-family:${sans};font-size:15px;line-height:20px;color:#4A2410;font-weight:bold">${money(i.total)}</td>
        </tr>`).join('');

  // Discounts, then delivery, then tax if there is any (Saskatoon orders carry PST).
  const lines = o.discounts.map((x) => [esc(x.name), '−' + money(x.amount)])
    .concat([[o.zone === 'saskatoon' ? 'Delivery' : 'Shipping', o.shipping ? money(o.shipping) : 'Free']])
    .concat(o.tax ? [[esc(o.taxName), money(o.tax)]] : []);
  const extras = lines.map(([l, r], i) => {
    const pad = `padding:${i === 0 ? 12 : 4}px 0 ${i === lines.length - 1 ? 14 : 4}px`;
    const top = i === 0 ? 'border-top:1px solid #E3CFB6;' : '';
    const cell = `${pad};${top}font-family:${sans};font-size:14px;line-height:20px;color:#8A5A3E`;
    return `
        <tr>
          <td style="${cell}">${l}</td>
          <td align="right" style="${cell}">${r}</td>
        </tr>`;
  }).join('');

  const address = o.address.length
    ? `
    <!-- shipping -->
    <tr><td bgcolor="#F6EBDC" style="background-color:#F6EBDC;padding:20px 40px 36px" class="px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#EEDDC6" style="background-color:#EEDDC6;border-radius:14px">
        <tr><td style="padding:20px 22px;font-family:${sans};font-size:14px;line-height:21px;mso-line-height-rule:exactly;color:#4A2410">
          <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;color:#9A5A34">${o.zone === 'saskatoon' ? 'Delivering to' : 'Shipping to'}</span><br>
          ${(o.name ? esc(o.name) + '<br>' : '') + o.address.map(esc).join(', ')}
        </td></tr>
      </table>
    </td></tr>
`
    : '';

  // The same four steps as the brew guide on the site (_data/brew.yml).
  const steps = [
    ['Boil', ' 1 cup water and 1 cup milk together.'],
    ['Blend', " in 2 tbsp God's Chai and sugar to taste."],
    ['Let it rise', " 2–3 times. Don't skip this one."],
    ['Strain', ' and enjoy. Kadak, every single cup.'],
  ].map(([b, rest], i, all) => {
    const pad = i === all.length - 1 ? '0' : '0 0 18px';
    return `
        <tr>
          <td width="44" valign="top" style="padding:${pad};font-family:${serif};font-size:22px;line-height:24px;color:#E0A872">0${i + 1}</td>
          <td valign="top" style="padding:${pad};font-family:${sans};font-size:15px;line-height:22px;color:#E6D2BC"><strong style="color:#F5E7D0">${b}</strong>${rest}</td>
        </tr>`;
  }).join('');

  const pill = (href, label) => `<td style="border:1px solid #B88A66;border-radius:999px"><a href="${href}" style="display:block;padding:10px 20px;font-family:${sans};font-size:12px;line-height:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#F5E7D0;text-decoration:none">${label}</a></td>`;

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(subject)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  a{color:#B9562C}
  @media screen and (max-width:620px){
    .w100{width:100%!important}
    .px{padding-left:24px!important;padding-right:24px!important}
    .h1{font-size:34px!important;line-height:38px!important}
    .stack{display:block!important;width:100%!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#4A2410">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px">Your chai is on its way. Here's your order summary and how to brew the perfect cup.&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#4A2410">
<tr><td align="center" style="padding:32px 12px">

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="w100" style="width:600px;max-width:600px">

    <!-- header -->
    <tr><td align="center" bgcolor="#5A2A0E" style="background-color:#5A2A0E;border-radius:20px 20px 0 0;padding:36px 40px 30px" class="px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:${serif};font-size:30px;line-height:34px;mso-line-height-rule:exactly;color:#F5E7D0;font-weight:bold;letter-spacing:-0.5px">God's Chai</td>
      </tr></table>
      <div style="font-family:${sans};font-size:11px;line-height:16px;mso-line-height-rule:exactly;color:#E0A872;letter-spacing:2px;text-transform:uppercase;padding-top:6px">Hand crafted in Saskatoon</div>
    </td></tr>

    <!-- hero -->
    <tr><td bgcolor="#6A3314" style="background-color:#6A3314;padding:44px 40px 40px" class="px">
      <div style="${eyebrow('#E0A872')}">Order confirmed · <span style="text-transform:none">#${esc(o.receipt)}</span></div>
      <h1 class="h1" style="margin:14px 0 0;font-family:${serif};font-weight:normal;font-size:42px;line-height:46px;mso-line-height-rule:exactly;color:#F5E7D0">Thank you${first}.<br>The kettle's on.</h1>
      <p style="margin:18px 0 0;font-family:${sans};font-size:16px;line-height:25px;mso-line-height-rule:exactly;color:#E6D2BC">${z.hero}</p>${o.receiptUrl ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px"><tr>
        <td bgcolor="#E0A872" style="background-color:#E0A872;border-radius:999px">
          <a href="${esc(o.receiptUrl)}" style="display:block;padding:14px 28px;font-family:${sans};font-size:13px;line-height:16px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#3B1F12;text-decoration:none;border-radius:999px">View your receipt</a>
        </td>
      </tr></table>` : ''}
    </td></tr>

    <!-- summary -->
    <tr><td bgcolor="#F6EBDC" style="background-color:#F6EBDC;padding:36px 40px ${o.address.length ? 12 : 36}px" class="px">
      <div style="${eyebrow('#9A5A34')};padding-bottom:14px">Your order</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${items}${extras}
        <tr>
          <td style="padding:14px 0 6px;border-top:2px solid #4A2410;font-family:${sans};font-size:13px;line-height:18px;color:#4A2410;font-weight:bold;letter-spacing:1px;text-transform:uppercase">Total</td>
          <td align="right" style="padding:14px 0 6px;border-top:2px solid #4A2410;font-family:${serif};font-size:22px;line-height:26px;color:#4A2410;font-weight:bold">${money(o.total)}</td>
        </tr>
      </table>
    </td></tr>
${address}
    <!-- brew guide -->
    <tr><td bgcolor="#5A2A0E" style="background-color:#5A2A0E;padding:40px 40px 36px" class="px">
      <div style="${eyebrow('#E0A872')}">While you wait</div>
      <h2 style="margin:10px 0 22px;font-family:${serif};font-weight:normal;font-size:28px;line-height:32px;mso-line-height-rule:exactly;color:#F5E7D0">Four steps to a proper cup</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${steps}
      </table>
    </td></tr>

    <!-- share -->
    <tr><td bgcolor="#6A3314" align="center" style="background-color:#6A3314;padding:34px 40px;border-radius:0 0 20px 20px" class="px">
      <p style="margin:0;font-family:${serif};font-size:20px;line-height:26px;color:#F5E7D0">Tag your first cup <a href="${INSTAGRAM}" style="color:#E0A872;text-decoration:none">@godschai</a></p>
      <p style="margin:8px 0 0;font-family:${sans};font-size:14px;line-height:20px;color:#E6D2BC">We feature our favourites on the site.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px"><tr>
        ${pill(INSTAGRAM, 'Instagram')}
        <td width="10" style="font-size:0;line-height:0">&nbsp;</td>
        ${pill(TIKTOK, 'TikTok')}
      </tr></table>
    </td></tr>

    <!-- footer -->
    <tr><td align="center" style="padding:28px 30px 8px;font-family:${sans};font-size:12px;line-height:19px;mso-line-height-rule:exactly;color:#C9B19A">
      Questions about your order? Just reply to this email.<br>
      God's Chai · Saskatoon, SK, Canada<br>
      You're receiving this because you placed an order at <a href="${SITE}" style="color:#E0A872">godschai.com</a>.
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>
`;

  const text = [
    `Thank you${o.firstName ? ', ' + o.firstName : ''}. The kettle's on. (Order #${o.receipt})`, '',
    ...o.items.map((i) => `${i.qty} × ${i.name} — ${money(i.total)}`),
    ...o.discounts.map((x) => `${x.name}: −${money(x.amount)}`),
    `${o.zone === 'saskatoon' ? 'Delivery' : 'Shipping'}: ${o.shipping ? money(o.shipping) : 'Free'}`,
    o.tax ? `${o.taxName}: ${money(o.tax)}` : null,
    `Total: ${money(o.total)}`, '',
    `What happens next (${z.label}): ${z.next}`, '',
    o.address.length ? `${o.zone === 'saskatoon' ? 'Delivering' : 'Shipping'} to: ${[o.name].concat(o.address).filter(Boolean).join(', ')}` : null, '',
    'Four steps to a proper cup: 1. Boil 1 cup water and 1 cup milk together. 2. Blend in 2 tbsp God\'s Chai and sugar to taste. 3. Let it rise 2–3 times. Don\'t skip this one. 4. Strain and enjoy. Kadak, every single cup.', '',
    'Questions about your order? Just reply to this email.',
    o.receiptUrl ? `Receipt: ${o.receiptUrl}` : null,
    `Tag your first cup @godschai — ${INSTAGRAM}`,
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
    ...o.discounts.map((x) => `${x.name}: −${money(x.amount)}`),
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

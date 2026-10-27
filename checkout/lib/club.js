// God's Chai — the Chai Club welcome email.
//
// Sent once, automatically, when someone joins from the card on the website
// (api/club.js). It carries the members' code, which is checked by Square on
// its checkout page: make the coupon there "once per customer" so it only
// works on a first order (SEO.md, "The Chai Club").

import { CODES } from './order.js';

const SITE = 'https://godschai.com';
const LOGO = SITE + '/uploads/opt/logo-cream-256.png';
// Canada's anti-spam law wants a way out of every email that carries an offer.
const UNSUB = 'https://godschai.us9.list-manage.com/unsubscribe?u=6dbcb24537761b9433540d839&id=963c7fe1aa';
export const CLUB_CODE = 'CHAI10';
// Keep these matching perks: in _data/club.yml.
export const PERKS = [
  '10% off your first order of chai mixes',
  'Vote on our next flavour',
  'Free samples and first access to new blends',
  'Members-only tasting nights',
];

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function clubWelcomeEmail() {
  const code = CLUB_CODE, percent = (CODES[CLUB_CODE] || { percent: '10' }).percent;
  const subject = `Welcome to the Chai Club ✶ your ${percent}% code is inside`;
  const serif = "'Instrument Serif',Georgia,'Times New Roman',serif";
  const sans = "'Hanken Grotesk',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
  const mono = "'DM Mono',Menlo,Consolas,monospace";
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#FCE4CC">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">You're in. Here's ${percent}% off your first order of chai mixes: ${code}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FCE4CC"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFF6EC;border-radius:20px;overflow:hidden">
    <tr><td align="center" style="background:#1D120B;padding:28px 24px 26px">
      <a href="${SITE}"><img src="${LOGO}" width="88" height="88" alt="God's Chai" style="display:block;width:88px;height:88px"></a>
      <div style="font:800 34px/1 ${sans};letter-spacing:.04em;color:#F3E8D3;margin-top:18px">JOIN<span style="font:400 15px ${mono};letter-spacing:0;color:#C7B29E"> the </span><span style="font:italic 400 40px ${serif};color:#F2A93C">Chai</span><span style="font:400 15px ${mono};letter-spacing:0;color:#C7B29E"> club</span></div>
      <div style="font:400 15px ${sans};color:#C7B29E;margin-top:10px">You're in. Welcome, member.</div>
    </td></tr>
    <tr><td align="center" style="padding:30px 28px 8px">
      <div style="font:400 12px ${mono};letter-spacing:.18em;text-transform:uppercase;color:#C58A2E">Your members' code</div>
      <div style="display:inline-block;margin-top:12px;padding:14px 28px;border:2px dashed #3B1F12;border-radius:14px;background:#F6C31C;font:700 30px ${mono};letter-spacing:.12em;color:#3B1F12">${code}</div>
      <div style="font:400 16px/1.55 ${sans};color:#3A2A1E;margin-top:14px">${percent}% off your first order of chai mixes.<br>Type it in the <strong>coupon box</strong> at checkout.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px auto 0"><tr><td style="background:#3B1F12;border-radius:999px"><a href="${SITE}/premixes/" style="display:inline-block;padding:14px 26px;font:700 15px ${sans};color:#FCE4CC;text-decoration:none">Shop the chai mixes →</a></td></tr></table>
    </td></tr>
    <tr><td style="padding:28px 32px 6px">
      <div style="font:400 26px ${serif};color:#1D120B">What members get</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
        ${PERKS.map((p) => `<tr><td width="26" valign="top" style="padding:7px 0;font:700 16px ${sans};color:#C2410C">✶</td><td style="padding:7px 0;font:400 15px/1.45 ${sans};color:#3A2A1E">${esc(p)}</td></tr>`).join('')}
      </table>
    </td></tr>
    <tr><td style="padding:22px 32px 28px">
      <div style="font:400 14px/1.6 ${sans};color:#5A4535">We'll email you when it's time to vote on a flavour, and before every tasting night. Questions? Just hit reply.</div>
    </td></tr>
    <tr><td align="center" style="background:#1D120B;padding:22px 24px">
      <div style="font:400 20px ${serif};color:#F3E8D3">Not your average chai.</div>
      <div style="font:400 12px/1.7 ${sans};color:#AB9280;margin-top:6px"><a href="https://www.instagram.com/godschai" style="color:#F2A93C;text-decoration:none">Instagram @godschai</a> · <a href="${SITE}" style="color:#F2A93C;text-decoration:none">godschai.com</a><br>God's Chai · Saskatoon, SK, Canada<br>You're getting this because you joined the Chai Club at godschai.com. <a href="${UNSUB}" style="color:#AB9280">Unsubscribe</a></div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
  const text = [
    "Welcome to the Chai Club — you're in.", '',
    `Your members' code: ${code}`,
    `${percent}% off your first order of chai mixes. Type it in the coupon box at checkout.`,
    `Shop: ${SITE}/premixes/`, '',
    'What members get:',
    ...PERKS.map((p) => '* ' + p), '',
    "We'll email you when it's time to vote on a flavour, and before every tasting night. Questions? Just hit reply.",
    "— God's Chai, Saskatoon, SK, Canada",
    `Unsubscribe: ${UNSUB}`,
  ].join('\n');
  return { subject, html, text };
}

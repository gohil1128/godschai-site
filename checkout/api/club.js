// God's Chai — Chai Club join (Vercel function).
//
// The Chai Club card on the website posts { email } here. We:
//   1. put them on the Mailchimp list (status "subscribed" if they're new),
//      tagged "chai-club" and "opted-in" (they asked to join: consent that
//      doesn't expire under Canada's anti-spam law);
//   2. email them the welcome note with the members' code (lib/club.js), once,
//      then tag them "club-welcome-sent".
// Someone already tagged "chai-club" is told they're a member. Nobody gets the
// welcome twice, and anyone who joined before welcome emails were switched on
// (or whose email failed) gets it the next time they join. Anyone who unsubscribed before is left alone here: the card
// then signs them up through Mailchimp's own form, which handles that.
//
// Uses the same settings as the order emails (README): MAILCHIMP_API_KEY,
// RESEND_API_KEY and EMAIL_FROM. Without the Mailchimp key nobody is listed
// here (the card falls back to Mailchimp directly); without EMAIL_FROM no
// welcome email goes out. GET says which are set.

import crypto from 'node:crypto';
import { cors, jsonBody } from '../lib/order.js';
import { clubWelcomeEmail } from '../lib/club.js';

const LIST_ID = '963c7fe1aa'; // the audience the site's signup forms use (_config.yml)
const SHOP_EMAIL = 'sip@godschai.com';

function mailchimp(env, email) {
  const key = env.MAILCHIMP_API_KEY;
  const member = 'https://' + key.split('-').pop() + '.api.mailchimp.com/3.0/lists/' + (env.MAILCHIMP_LIST_ID || LIST_ID) +
    '/members/' + crypto.createHash('md5').update(email).digest('hex');
  const headers = { Authorization: 'Basic ' + Buffer.from('godschai:' + key).toString('base64'), 'Content-Type': 'application/json' };
  return { member, headers };
}

// → { status, already, welcomed } or throws. status is Mailchimp's: subscribed, unsubscribed, cleaned, pending…
export async function listMember(env, email, source) {
  const { member, headers } = mailchimp(env, email);
  const put = (fields) => fetch(member, { method: 'PUT', headers, body: JSON.stringify({ email_address: email, status_if_new: 'subscribed', ...(fields ? { merge_fields: fields } : {}) }) });
  let r = await put(source ? { SOURCE: source } : null);
  // An audience without a SOURCE field rejects it: keep the person anyway.
  if (r.status === 400 && source) r = await put(null);
  if (!r.ok) throw new Error('mailchimp ' + r.status);
  const m = await r.json().catch(() => ({}));
  const has = (name) => (m.tags || []).some((t) => t.name === name);
  return { status: m.status, already: has('chai-club'), welcomed: has('club-welcome-sent') };
}

export async function tagMember(env, email, names) {
  const { member, headers } = mailchimp(env, email);
  const r = await fetch(member + '/tags', { method: 'POST', headers, body: JSON.stringify({ tags: names.map((name) => ({ name, status: 'active' })) }) });
  if (!r.ok) throw new Error('mailchimp tags ' + r.status);
}

async function sendWelcome(env, email) {
  const mail = clubWelcomeEmail();
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json',
      // One welcome per address, even if the button is pressed twice.
      'Idempotency-Key': 'club-' + crypto.createHash('md5').update(email).digest('hex'),
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [email], reply_to: SHOP_EMAIL, subject: mail.subject, html: mail.html, text: mail.text }),
  });
  // 409: this key was used already, so the email has gone out.
  if (!r.ok && r.status !== 409) throw new Error('resend ' + r.status);
}

export default async function handler(req, res) {
  const env = process.env;
  res.setHeader('Cache-Control', 'no-store');
  const allowed = cors(req, res);
  if (req.method === 'OPTIONS') return res.status(allowed ? 204 : 403).end();
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, mailchimp: !!env.MAILCHIMP_API_KEY, welcomeEmails: !!(env.RESEND_API_KEY && env.EMAIL_FROM) });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!allowed) return res.status(403).json({ error: 'origin' });

  const body = jsonBody(req) || {};
  const email = String(body.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'bad_email' });
  const source = typeof body.source === 'string' ? body.source.slice(0, 40) : '';

  let listed = false, already = false, welcomed = false, status = null;
  if (env.MAILCHIMP_API_KEY) {
    try {
      ({ status, already, welcomed } = await listMember(env, email, source));
      listed = status === 'subscribed';
    } catch (e) {
      console.error('club_mailchimp_failed', e.message);
    }
  }
  // Someone who unsubscribed (or whose address bounced) isn't emailed from here.
  const canEmail = !!(env.RESEND_API_KEY && env.EMAIL_FROM) && !welcomed && (listed || !env.MAILCHIMP_API_KEY);
  let emailed = false;
  if (canEmail) {
    try { await sendWelcome(env, email); emailed = true; } catch (e) { console.error('club_email_failed', e.message); }
  }
  if (listed) {
    const names = (already ? [] : ['chai-club', 'opted-in']).concat(emailed ? ['club-welcome-sent'] : []);
    if (names.length) try { await tagMember(env, email, names); } catch (e) { console.error('club_tag_failed', e.message); }
  }
  return res.status(200).json({ ok: true, listed, already: listed && already, emailed });
}

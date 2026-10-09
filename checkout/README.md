# God's Chai checkout service

Small Vercel functions, deployed together as the Vercel project
**godschai-checkout**:

- `api/checkout.js`: the cart posts the order and gets back a Square checkout
  link for exactly that order, at any quantity.
- `api/pay.js`: the back end of our own payment page, godschai.com/checkout/.
- `api/square-webhook.js`: the new-order emails.

What an order costs (Square item IDs, PST, the pair price, shipping) is in
`lib/order.js`, shared by the first two.

- Needs `SQUARE_ACCESS_TOKEN` set in Vercel (Settings → Environment Variables).
- `GET https://godschai-checkout.vercel.app/api/checkout` says whether it's set.
- Prices come from Square's catalog; PST, the pair price and the shipping rule
  are in `lib/order.js`. Change them there and in `_data/shop.yml` together.
- Only answers requests from godschai.com.

## Our own payment page (`api/pay.js`)

godschai.com/checkout/ takes the card with Square's Web Payments SDK: the card
number goes from Square's secure fields straight to Square, which hands the
page a one-time token. This function makes the order (with the delivery
address on it) and charges exactly its total. Each try carries an ID, so a
retry after a dropped connection can never charge twice, and it never charges
a different amount from the one the page showed.

- `GET https://godschai-checkout.vercel.app/api/pay` says `"ready":true` once
  everything below is set, or names what's missing (never the values).
- Needs `SQUARE_APPLICATION_ID` (the app's Application ID from its Credentials
  page, Production; not a secret) as well as `SQUARE_ACCESS_TOKEN`.
- Square doesn't email a receipt for payments taken this way, so it also waits
  for the customer emails below (`SQUARE_WEBHOOK_SIGNATURE_KEY`,
  `RESEND_API_KEY` and `EMAIL_FROM`). Until then the page hands people to
  Square's checkout page instead.
- Only answers godschai.com, and slows down anyone trying lots of cards in a row.

To try it before switching it on for everyone, open
`godschai.com/checkout/?try=1`, pay for one pouch with your own card, then
refund it in Square. Then set `pay_on_site: true` in `_data/shop.yml`.

## New-order emails (`api/square-webhook.js`)

The moment someone pays on the website, Square tells this function and it
emails you a new-order alert: what they bought, the total, their name, phone
and address, and a link to Square's receipt. Reply to the alert to write to the
customer.

Once the checkout service is on Vercel (above), alerts take about ten minutes:

1. **Resend** (sends the email): sign up at resend.com **with
   sip@godschai.com**. Go to **API Keys → Create API key** (sending access is
   enough) and copy it.
2. **Square webhook** (tells us about the order): at developer.squareup.com,
   open the app your access token came from, switch to **Production**, then
   **Webhooks → Subscriptions → Add subscription**:
   - URL: `https://godschai-checkout.vercel.app/api/square-webhook`. Use the
     project's own address from its Domains list, not a long per-deployment
     one; those need a Vercel login, so Square can't reach them.
   - Events: `payment.created` and `payment.updated`.
   - Save, then copy the subscription's **Signature key**.
3. **Vercel → godschai-checkout → Settings → Environment Variables:** add
   `RESEND_API_KEY` and `SQUARE_WEBHOOK_SIGNATURE_KEY`, then redeploy
   (**Deployments → ⋯ → Redeploy**).
4. **Check:** open `https://godschai-checkout.vercel.app/api/square-webhook`.
   It should say `"ready":true`. On Square's webhook page, **Send test event**
   should come back `200`. The next order emails sip@godschai.com within
   seconds.

Until godschai.com is verified with Resend (below), alerts come from
`onboarding@resend.dev` and can only go to the address you signed up to Resend
with. If you signed up with a different address, put it in `ORDER_ALERT_TO`.
To get a copy somewhere else, forward it on from that inbox.

### Customer confirmation emails

Customers who pay on Square's checkout page already get Square's receipt; to
also send them our branded confirmation (`lib/email.js`; preview in
`receipt-kit/`), and before switching on our own payment page (whose customers
get no email from Square), set these up:

1. **Resend → Domains → Add domain:** `godschai.com`. Add the DNS records it
   lists at Porkbun (godschai.com → DNS). They go on `send.godschai.com` and
   `resend._domainkey`, so the Google Workspace mail records stay as they are.
   Wait until it says **Verified**.
2. **Vercel:** add `EMAIL_FROM` = `God's Chai <orders@godschai.com>`. Alerts
   can now go to more than one address too, e.g. `ORDER_ALERT_TO` =
   `sip@godschai.com,harshraj.gohil28@gmail.com`. Redeploy.

### All settings

| Variable | |
| --- | --- |
| `SQUARE_ACCESS_TOKEN` | Needed. Also used by the checkout. |
| `SQUARE_APPLICATION_ID` | For our own payment page. Not a secret. |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Needed. From the Square webhook subscription. |
| `RESEND_API_KEY` | Needed. From Resend. |
| `ORDER_ALERT_TO` | Optional. Where alerts go, comma-separated. Default `sip@godschai.com`. |
| `EMAIL_FROM` | Optional. Set it once the domain is verified; turns on customer emails. |
| `SQUARE_WEBHOOK_URL` | Optional. The webhook address exactly as given to Square. Only needed if it differs from the address requests arrive on. |

Duplicate events can't double-send: each email carries an idempotency key, and
refunds and anything older than a day are ignored. If sending fails, the
function answers 500 and Square tries again.

# God's Chai checkout service

One Vercel function, `api/checkout.js`, deployed as the Vercel project
**godschai-checkout**. The cart on godschai.com posts the order to it and gets
back a Square checkout link for exactly that order, at any quantity.

- Needs `SQUARE_ACCESS_TOKEN` set in Vercel (Settings → Environment Variables).
- `GET https://godschai-checkout.vercel.app/api/checkout` says whether it's set.
- Prices come from Square's catalog; PST and the shipping rule are in the file.
  Change them here and in `_data/shop.yml` together.
- Only answers requests from godschai.com.

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

### Customer confirmation emails (optional)

Customers already get Square's receipt. To also send our branded confirmation
(`lib/email.js`; preview in `receipt-kit/`):

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
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Needed. From the Square webhook subscription. |
| `RESEND_API_KEY` | Needed. From Resend. |
| `ORDER_ALERT_TO` | Optional. Where alerts go, comma-separated. Default `sip@godschai.com`. |
| `EMAIL_FROM` | Optional. Set it once the domain is verified; turns on customer emails. |
| `SQUARE_WEBHOOK_URL` | Optional. The webhook address exactly as given to Square. Only needed if it differs from the address requests arrive on. |

Duplicate events can't double-send: each email carries an idempotency key, and
refunds and anything older than a day are ignored. If sending fails, the
function answers 500 and Square tries again.

# God's Chai checkout service

One Vercel function, `api/checkout.js`, deployed as the Vercel project
**godschai-checkout**. The cart on godschai.com posts the order to it and gets
back a Square checkout link for exactly that order, at any quantity.

- Needs `SQUARE_ACCESS_TOKEN` set in Vercel (Settings → Environment Variables).
- `GET https://godschai-checkout.vercel.app/api/checkout` says whether it's set.
- Prices come from Square's catalog; PST and the shipping rule are in the file.
  Change them here and in `_data/shop.yml` together.
- Only answers requests from godschai.com.

## Order emails (`api/square-webhook.js`)

When a website payment completes, Square calls this function. It emails the
customer our branded order confirmation (`lib/email.js`; preview in
`receipt-kit/`) and sends you a new-order alert.

1. **Resend:** sign up at resend.com. Add the domain `godschai.com` and put the
   DNS records it shows at your domain registrar. Once it shows *Verified*,
   create an API key.
2. **Square webhook:** at developer.squareup.com, open your app → **Webhooks →
   Subscriptions → Add**. Set the URL to
   `https://godschai-checkout.vercel.app/api/square-webhook` and the event to
   **payment.updated**, then save. Copy its **Signature key**.
3. **Vercel → godschai-checkout → Settings → Environment Variables:** add
   - `SQUARE_WEBHOOK_SIGNATURE_KEY`: the signature key from step 2
   - `SQUARE_WEBHOOK_URL`: `https://godschai-checkout.vercel.app/api/square-webhook`
   - `RESEND_API_KEY`: from step 1
   - `ORDER_ALERT_TO`: `sip@godschai.com,harshraj.gohil28@gmail.com`

   Then redeploy.
4. **Test it:** use **Send test event** in Square's webhook page. It should come
   back `200`. A real order then sends both emails.

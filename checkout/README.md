# God's Chai checkout service

One Vercel function, `api/checkout.js`, deployed as the Vercel project
**godschai-checkout**. The cart on godschai.com posts the order to it and gets
back a Square checkout link for exactly that order, at any quantity.

- Needs `SQUARE_ACCESS_TOKEN` set in Vercel (Settings → Environment Variables).
- `GET https://godschai-checkout.vercel.app/api/checkout` says whether it's set.
- Prices come from Square's catalog; PST and the shipping rule are in the file.
  Change them here and in `_data/shop.yml` together.
- Only answers requests from godschai.com.

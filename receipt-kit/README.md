# Receipt kit

Two kinds of email reach a customer after they order on godschai.com:

1. **Square's receipt.** Square sends it automatically. You can't redesign it,
   but you can brand it (below).
2. **Our order confirmation.** Our own email: designed, on-brand, with what
   happens next and how to brew it. See `order-email-phone.png` for how it looks
   and `order-email-preview.html` for the real thing. It's sent by
   `checkout/api/square-webhook.js` once godschai.com is verified with Resend
   (`checkout/README.md`).

## Branding Square's receipt (5 minutes)

In **Square Dashboard → Settings → Account & Settings → Receipts** (on some
accounts it's under **Business → Receipts**):

- **Logo:** upload `square-logo-dark.png`. `square-logo-amber.png` is an
  alternative.
- **Custom message** (shown on every receipt):
  > Thank you for choosing God's Chai — masala chai made the real way in
  > Saskatoon. Brewing tips: godschai.com/how-to-make-masala-chai
- **Return policy:**
  > Something not right — even after you've opened it? Email sip@godschai.com
  > within 30 days and we'll refund it. godschai.com/refunds
- **Social:** add Instagram `godschai`, and website `godschai.com`.
- **Customer feedback** (the two smiley faces): keep it on to hear from
  customers, or switch it off for a cleaner receipt.

Under **Account & Settings → Business → Brand** (if you see it), set the
brand colour to `#F2A93C`.

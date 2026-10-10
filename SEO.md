# Editing the God's Chai site

Everything visitors read — every drink, every pop-up, the brew steps — lives in
three small text files. Edit those and the website, the Google structured data
and the sitemap all update together. You never have to touch HTML.

The site is built by **Jekyll**, which GitHub Pages runs automatically. When you
commit a change, GitHub rebuilds the site within a minute or two.

---

## Add or change a drink

Open **`_data/menu.yml`**. There are three lists: `hot`, `iced` and `snacks`.
Copy an existing block, keep the indentation exactly as it is, and change the text.

```yaml
  - name: "Iced Cardamom Chai"          # shows in the homepage lineup
    desc: "Cardamom-forward, over ice." # the longer description
    short: "Cardamom, over ice."        # the short line in the homepage grid
    img: "uploads/drink-cardamom.jpeg"  # photo (see "Adding a photo" below)
    alt: "Iced Cardamom Chai in a God's Chai cup"   # describes the photo
```

Optional extras:

| Field | What it does |
|---|---|
| `menu_name` | A longer name, used only in the menu data Google reads |
| `menu_desc` | A longer description, same |
| `logo_tile` | `true` shows the God's Chai logo instead of a photo |

That one edit updates the homepage lineup **and** the `Menu` structured data
Google reads. They can't drift apart.

**There is no separate menu page any more.** The lineup on the homepage is the
menu — every hot drink, iced drink and snack is in it — and the Menu link in
the top bar and the footer scrolls straight to it. The old addresses
(`/menu/` and `/menu.html`) forward there, so links already posted to Instagram
or sitting in Google don't break.

### Adding a photo

1. Put the original in `uploads/` (any size — big is fine).
2. Add its filename to the right list at the top of `tools/optimize-images.py`
   — drinks go in `DRINKS_4x5`.
3. Run the image tool once so the small, fast versions get made:

   ```bash
   python3 tools/optimize-images.py
   ```

4. Reference the original filename in `menu.yml` (e.g. `uploads/drink-cardamom.jpeg`).
   The site automatically serves the WebP and correctly-sized versions.

If you skip step 3 the photo won't appear, because the page looks for the
optimised copies in `uploads/opt/`.

**Where the original ends up.** The tool moves it into `uploads/_src/`. That
folder is kept in the project but left out of the built website, so a 3 MB
photo stays here for re-cropping later without every visitor downloading it.
The only pictures the site actually sends people are the small copies in
`uploads/opt/` and the social preview `uploads/og-image.jpg`.

---

## Add or change a pop-up event

Open **`_data/events.yml`** and copy a block:

```yaml
- mon: "Oct"                 # month on the date chip
  day: "18"                  # day on the chip — a range like "18–19" also works
  start: 2026-10-18          # real dates, used by Google
  end: 2026-10-18
  name: "Fall Market Pop-Up"
  where: "Market Mall · 10am–4pm"     # the short line under the title
  venue: "Market Mall, Saskatoon"     # used by Google's event listing
  desc: "Two days of local makers and our chai cart by the north doors."
```

**You never need to delete old events.** Once the `end` date has passed the event
hides itself from visitors automatically, but stays in the page so Google and AI
search tools can still see your history. Delete them only if you want to tidy up.

Keep `start` and `end` accurate — those are what Google shows in event results.

The homepage and the `/events/` page both show the whole list, so adding one
block puts it in both places. If the homepage says "No events on the calendar
right now", it means every `end` date in the file has passed — add the next
pop-up and it comes straight back.

---

## Change the premix pouches

**`_data/premixes.yml`** holds the two blends — name, tasting notes, the longer
description, and which pouch picture to use. Editing it updates the Premixes
block on the homepage **and** the `/premixes/` page together.

```yaml
- name: "Original Masala"
  key: "o"                              # its letter in the shop's checkout links — don't change
  notes: "Bold · Warm · Rich"          # the small uppercase line
  blurb: "The cart recipe, in a pouch…" # only shown on /premixes/
  img: "pouch-masala-front"             # uploads/pouch-masala-front.png, no extension
  alt: "God's Chai Original Masala premix pouch, 125g, makes 25 cups"
  tilt: "rotate(-3deg)"                 # how it leans on the homepage
```

Adding a third blend is just another block — both pages lay themselves out
around however many there are.

**New pouch artwork:** drop the file in `uploads/`, add it to the `PRODUCT` list
at the top of `tools/optimize-images.py`, then run:

```bash
python3 tools/optimize-images.py
```

The launch wording ("Launching this fall") switches to "Now delivering" by
itself when the shop opens — see the next section.

A third blend also needs its own Square item and a new set of checkout links
(see *The shop*), so it's a job to hand to Claude with Square connected.

---

## The shop

The premixes sell straight from `/premixes/`. People choose their pouches and
where it's going, and checkout takes them to **Square's own checkout page** for
exactly that order, where they type their card and address. Once our own
payment page is switched on (below), they pay on godschai.com instead, in the
site's own design. Either way the card number goes only to Square. The site has
no server and no database and keeps nothing, so there is nothing on it for
anyone to steal.

When they've paid, Square emails their receipt and sends them back to
`/order-confirmed/`. The order turns up in **Square Dashboard → Orders** (and
the Square app) with their address, and a note saying *Saskatoon delivery* or
*Canada Post*.

**How people buy.** Every premix card and product page has an *Add to cart*
button. The bag in the top bar opens the cart, which slides in from the
right. It shows the pouches, the delivery choice, PST and a "free shipping"
progress bar, then the Square checkout button. The cart is remembered in the
visitor's own browser as they move around the site. It empties itself once
they reach `/order-confirmed/`. The code is in `assets/js/cart.js` and
`_includes/cart-drawer.html`.

**Each pre-made link works for one sale only.** Square closes a checkout
link once it has been paid. Anyone who opens a used link lands straight on
`/order-confirmed/` without paying. So until the checkout service below is
switched on, every order uses up its link, and that link has to be replaced
(a job for Claude with Square connected). Once the service is on, it makes a
fresh checkout for every order and this stops mattering.

**Any quantity: the checkout service.** On its own, the cart can only check out
orders it has a pre-made Square link for (`links:` in `_data/shop.yml`, up to
3 of each blend). The `checkout/` folder holds a small service that builds a
Square checkout for any order on the spot, so people can buy as many as they
like (up to `max_each_api`, 99). It runs on Vercel, not on GitHub Pages. To
switch it on:

1. **Square:** go to developer.squareup.com and sign in with your Square
   account. Create an application (call it "God's Chai website") and open it.
   Switch to **Production** and copy the **Production Access token**. Treat
   it like a password: never put it in this repo or in a chat.
2. **Vercel:** choose Add New → Project, import `gohil1128/godschai-site`, and
   name the project `godschai-checkout`. Set **Root Directory** to `checkout`,
   and the Framework Preset to **Other**. Under Environment Variables, add
   `SQUARE_ACCESS_TOKEN` with the token as its value. Deploy.
3. Open `https://godschai-checkout.vercel.app/api/checkout`. It should say
   `"configured":true`.
4. Put that address in `checkout_api:` in `_data/shop.yml`.

If the service is ever down, small orders fall back to the pre-made links and
bigger ones ask people to try again.

**Our own payment page: `/checkout/`.** Instead of Square's white checkout
page, people can pay on a page in the site's own design (`shop-checkout.html`,
run by `assets/js/pay.js`). They fill in their email, address and card
without leaving godschai.com. The card fields are Square's own secure frames
(Square's Web Payments SDK), so the card number still goes only to Square, and
`checkout/api/pay.js` on the checkout service charges exactly the order's total.
While the card goes through, the "brewing" screen (`_includes/brew-loader.html`)
shows a glass of chai rising, with a new line every couple of seconds. The same
screen shows while the cart hands someone over to Square's page.

It's switched off until `pay_on_site: true` in `_data/shop.yml`. Before that it
needs:

1. The checkout service running (above), plus the new-order emails set up
   **including the customer emails** (`checkout/README.md`). Square doesn't
   email a receipt for payments taken this way, so the page stays off until ours
   can go out.
2. In Vercel, `SQUARE_APPLICATION_ID`: the app's Application ID, from the
   Credentials page at developer.squareup.com (Production). It isn't a secret.
3. A test: open `godschai.com/checkout/?try=1`, which uses the page even while
   `pay_on_site` is off. Place a real one-pouch order with your own card, check
   the emails, then refund it.
4. Then `pay_on_site: true`.

If anything the page needs is missing or down (the service, its settings,
Square's script), it quietly hands people to Square's checkout page instead, so
nobody is ever stuck. It also checks that Saskatoon orders have a Saskatoon
postal code (they all start S7), and offers Canada Post shipping if not.

**Apple Pay** shows on the page once the domain is registered with Square:
Developer Console → your app → Apple Pay → **Add domain** (`godschai.com`), and
the file it gives you saved in this repo as
`.well-known/apple-developer-merchantid-domain-association` (ask Claude to add
it, along with the `_config.yml` line that publishes that folder). Google Pay
shows wherever the visitor's browser supports it. Prices, PST and the shipping rule are
written in `checkout/api/checkout.js` as well as in `shop.yml`, so change them
in both places.

**Order alerts and receipts.** Square emails every customer its own receipt;
brand it with the logo and text in `receipt-kit/README.md`. Once the checkout
service is running, `checkout/api/square-webhook.js` emails sip@godschai.com
the moment a website order is paid: what was bought, the total, and the
customer's name, phone and address. Once godschai.com is verified with Resend,
it also sends the customer our branded order confirmation. Setup is in
`checkout/README.md`. Square itself can also email the Square account's own
login address after each payment-link sale (Square Dashboard → Payment links →
Settings → General → Email notifications), but it can't send those anywhere
else.

**The 10% welcome offer.** Join the email list, get 10% off. It's offered in
three small places: a "Get 10% off" line in the cart that opens into an email
box, the side tab and its signup box, and a line under the footer signup.
Whoever signs up, on any form, sees the code straight away with a button to
copy it, and from then on their cart shows it too. On Square's checkout page
they type it into the **Add coupon** box; on our own payment page, or when the
checkout service makes the link, it's applied for them.

The code is checked by Square, so it has to exist there: **Square Dashboard →
Customers → Marketing → Coupons → Create coupon**, code `CHAI10`, 10% off. The
*Add coupon* box is switched on for every checkout link. The same code is in
`checkout/lib/order.js` (`CODES`) for our own payment page. To change the code
or the amount, change it in all three places: Square, `CODES`, and
`welcome_code`/`welcome_percent` in `_data/shop.yml`. To pause the offer, set
`welcome_offer: false` (and end the coupon in Square).

**"Add to your order"** is the small box inside the cart. It suggests
every product from `_data/premixes.yml` that isn't in the cart yet, so a new
product appears there on its own. A new product also needs its own Square item
and checkout links, and adding a third product changes how the links are named,
so it's a job to hand to Claude with Square connected. The box's heading is
`upsell_title` in `_data/shop.yml`.

**Each blend has its own page**: `/premixes/original-masala/` and
`/premixes/rose-cardamom/`. Their words come from `_data/premixes.yml`:
`tagline` (the line on the cards), `inside` (what's in the pouch) and `brew`
(the steps). Edit them there.

**Everything about the shop is in `_data/shop.yml`:**

| Setting | What it does |
| --- | --- |
| `open` | The launch switch. `false` shows "launching this fall" and the email signups; `true` turns every premix box on the site into "order now". |
| `price` | $14.99 a pouch, before tax. |
| `pair_price` | "Try both": one Original Masala + one Rose & Cardamom for $24.99, for every pair in the order. The saving comes off before PST. The Square links for orders with both blends include it, as does `checkout/api/checkout.js`. |
| `max_each` | Most pouches of one blend in an order (3). |
| `checkout_api` | The checkout service's address. Blank until it's set up; then any quantity can be ordered (up to `max_each_api`). |
| `pay_on_site` | `true` sends checkout to our own payment page, `/checkout/`. Needs the steps above. |
| `welcome_offer`, `welcome_code`, `welcome_percent` | The email-signup discount (below). `welcome_offer: false` hides it everywhere. |
| `email` | Your contact for orders and refunds (sip@godschai.com). Blank means the pages say "message us on Instagram" instead. |
| `zones` | Saskatoon (free delivery, 6% PST) and the rest of Canada ($9.99, free from 5 pouches, no PST): the fee, the tax (`tax`, `tax_name`), the free-shipping point (`free_from`), and the delivery wording shown on the order box, `/shipping/` and `/order-confirmed/`. |
| `refund_days` | How long people have to ask for a refund (30). |
| `links` | The 30 Square checkout links, one for every mix of pouches and zone. `o2r1-canada` is two Original Masala and one Rose & Cardamom, shipped. The three Canada links with 5 or more pouches carry no shipping fee. |

A blank link isn't an error. For that one order, the button switches off and
says "message us on Instagram", so nobody is ever sent to a dead page.

**Launch day:**

1. In Square, check both items have stock, and that every link in `links` is
   filled in.
2. Place one real order, then refund it — it takes two minutes and proves the
   whole loop.
3. Change `open: false` to `open: true` and commit. The site updates in a
   minute or two.

**Changing the price, the shipping fee or the free-shipping point** means changing it in Square too,
because Square is what actually charges. The number in `shop.yml` is only what
the site shows. Ask Claude with Square connected to do both together.

**Someone picks Saskatoon but gives an address elsewhere.** On Square's
checkout page the site can't tell, so check the address on each Saskatoon
order. `/shipping/` already says we'll get in touch first: they either pay the
shipping or get a full refund. Our own payment page catches it before they pay.

**Posting parcels.** Join Canada Post's free *Solutions for Small Business*
programme and buy labels online. Expedited Parcel (tracked) for a parcel under
0.5 kg costs about $9.70–$15.30 from Saskatoon to most of Canada, plus a fuel
surcharge. The $9.99 fee covers the nearer provinces; farther addresses cost
you a few dollars more, and orders of 5 or more pouches you post for free.
Remote and northern addresses cost more again. Each pouch is 125 g, so up to three pouches stay under 0.5 kg in a
padded mailer. A full six-pouch order goes in the 1 kg band, which costs only a
dollar or two more.

**Refunds:** Square Dashboard → **Transactions** → open the payment → **Issue
refund**. The policy on `/refunds/` covers opened pouches when there's a
genuine problem, and nobody has to post anything back.

**Tax:** Saskatoon orders charge your Square PST (6%) on the pouches; orders
shipped elsewhere in Canada charge none, and shipping is never taxed. The
Saskatoon checkout links carry the PST themselves, so changing the rate means
changing it in Square and `tax:` in `shop.yml` together. No GST is charged for
now. If sales go past $30,000 in four quarters in a row, you'll have to
register for GST, and every checkout link will need it added — a job for
Claude with Square connected.

---

## Change the brew guide

**`_data/brew.yml`** holds the four steps, the ingredient list and the timings.
Editing it updates the homepage teaser, the `/how-to-make-masala-chai/` page and
the `HowTo` structured data (the one that can win a rich result in Google).

The longer written guide on that page is normal text in
`how-to-make-masala-chai/index.html` — edit it like a document.

---

## The animated logo in the header

The logo in the top bar draws itself on, over and over, cycling through three
different builds: strokes brushing themselves in, the script landing with CHAI
rising under it, then everything pouring in from above and wobbling to rest.
It runs on every page.

It isn't a video — it's the mark cut into eleven separate pieces, each one
animated on its own, so it sits on the page with nothing behind it and stays
sharp at any size. Two files:

| File | What it is |
| --- | --- |
| `assets/_src/logo-sting-original.js` | the design export, kept but never published |
| `assets/js/logo-sting.js` | what the site loads — same thing, half the size |

`tools/optimize-logo-sting.py` makes the second from the first. The pieces are
stored with colour information the page never uses, and stripping it halves the
download without changing a pixel. **When a new export arrives**, drop it in as
`assets/_src/logo-sting-original.js` and run:

```bash
python3 tools/optimize-logo-sting.py
```

Until that file loads, the header shows the ordinary logo picture — so the top
bar is never empty, and it stays that way for anyone with JavaScript off or
animations turned off in their device settings.

### Its colours

The logo wears the pouch's colours: **"God's" in rust (`#B6502B`), the brush
stroke under it in gold (`#D3A849`)**, and "CHAI" and the tagline in cream on
the dark site. On light backgrounds (search results, Square receipts) "CHAI" is
the pouch's dark brown (`#4A2A1F`) instead.

The animated component can only paint the whole mark one colour, so the cream
comes from the `tint` on the `<gods-chai-logo>` tag in `_includes/nav-dark.html`
and the rust and gold are painted over their pieces by two rules in
`_includes/base-styles-dark.html`.

The still logos (the header's fallback, the footer, the emails, the Square
receipt logos in `receipt-kit/`) are drawn by `tools/build-logo.py` from the
animation's own strokes, so they are exactly the same artwork. The originals
are kept at `uploads/_src/*-source.png`.

**To change a colour**, these have to move together:

```bash
# 1. edit the colours at the top of tools/build-logo.py, then
python3 tools/build-logo.py
python3 tools/optimize-images.py
# 2. change the matching colours in _includes/base-styles-dark.html
#    (the two rules just under "gods-chai-logo:defined")
# 3. the browser-tab icon: edit BRAND/INK in tools/make-favicon.py, then
python3 tools/make-favicon.py
```

Change one without the others and the animated logo and the still ones stop
matching.

If you make the header logo a different size, the number to change with it is
`scroll-margin-top` in `_includes/base-styles-dark.html`. That's what stops the
top of a section hiding behind the bar when someone clicks Menu or Events.

---

## The two clips in the community strip

The two moving tiles under the `@godschai` heading play
`uploads/video/community-cart.mp4` and `uploads/video/community-rose.mp4`.
Neither starts downloading until it scrolls into view, both pause when it
scrolls away, and both are silent until someone taps the speaker button.

They used to be phone recordings served from a Cloudflare bucket — one of them
a 50 MB 4K file that started downloading on the home page. They are now ordinary
web video kept in the project: 381 KB and 199 KB. Phones that refused the old
format play these fine.

**To swap a clip**, put the new one in `uploads/video/` with the same name. It
wants to be H.264 MP4, no wider than about 500px, 30fps — anything bigger is
thrown away by the tile it plays in. Then grab a still from it, save it as
`uploads/community-cart.png` (or `-rose`), and run:

```bash
python3 tools/optimize-images.py
```

That still is what people see for the moment before the video arrives.

---

## The browser-tab icon

The little icon on the browser tab is the **G from the logo** — the actual
letterform, taken out of the animated logo's own artwork, cream on a rust tile
like the back of the pouch.

`tools/make-favicon.py` builds `favicon.ico`, `favicon-32.png` and
`apple-touch-icon.png`. Re-run it if the logo artwork ever changes:

```bash
python3 tools/make-favicon.py
```

A plain G with no tile was tried first — it disappears against a white tab
strip at small sizes, which is why it sits on a tile.

---

## How the site moves

Nothing on the page used to react to being pointed at. Every button, card and
link carried an instruction for what it should do on hover, but those were read
by a piece of software that was taken out of the site months ago, so they sat
there doing nothing while the page looked like it ought to respond. That is
fixed: buttons warm up, cards lift, the ticker stops so you can read it, and
everything also responds to a keyboard and to a finger — a phone has no hover
at all, so buttons now press in when tapped instead.

The other half is arrival. Sections already faded in as you scrolled to them;
now the cards *inside* a section come in one after another, 55 thousandths of a
second apart. It is the difference between a page loading and a page being laid
out.

| What to change | Where |
| --- | --- |
| Any hover colour or lift | `_includes/base-styles-dark.html`, the "Interactive states" block |
| How fast cards arrive, and how far apart | `assets/js/site.js`, section 2b — `STEP` and `CAP` |
| Which grids do it at all | the `data-gc-stagger` attribute on a grid |

**If someone has "reduce motion" turned on** in their phone or computer
settings, all of it stops: no fading in, no lifting, no ticker, no smooth
scrolling. Hover colours stay, because those only happen when someone chooses
to point at something. Keep that in mind if you add anything that moves — the
switch is the `prefers-reduced-motion` block at the foot of each stylesheet.

---

## The particle animation

Above the four brew steps (on the homepage and the brew guide) and the four
iced-chai steps, a cloud of up to 12,000 glowing specks flies apart and
re-forms into a new shape for each step:

| Step | Shape |
| --- | --- |
| Boil | a slowly breathing sphere |
| Blend | a swirling ribbon — the spice going in |
| Rise | four rings in the outline of a pot, climbing |
| Strain | a cutting-chai glass with steam coming off it |
| Concentrate | a dense, packed core |
| Sweeten | a falling stream of sugar |
| Chill | ice cubes |
| Pour | a tall glass with cubes floating in it |

It moves on to the next step by itself every few seconds; tapping a step (or
its card) jumps to it and stops the auto-play. The step on show lights up.

The signup box has a small one too: a slow sphere while it waits, a swirl
while the signup is sending, and a tick once it has gone through.

It's all one file, `assets/js/particles.js` — no outside library. It only runs
while it's on screen; with "reduce motion" switched on it changes shape
instantly and holds still; and with JavaScript off it simply isn't there.

**The shape follows the step's name**, not its position. Rename a step in
`_data/brew.yml` or `_data/iced.yml` and it falls back to the sphere unless you
also add the new name to `PRESETS` near the top of `particles.js` — that's also
where each step's colour lives.

---

## The email signup tab

Nothing pops open on its own any more. About five seconds in, a small amber tab
slides in at the left edge of the screen reading **"spiced, never spammy"** — a
nod to "spiced, never syruped" on the ticker. Tapping it opens the signup box;
tapping the little × puts it away. Either way it stays gone for 30 days, and it
never appears again for someone who has already subscribed.

It sits lower on a laptop than on a phone. A laptop has room to the left of the
headline; a phone doesn't, so there it moves up into the gap between the header
and the first line of text.

It covers half a percent of the screen on a laptop and about 1.6% on a phone — the old
version covered the whole page — so people can read without dismissing anything
first. That is also better for Google, which marks sites down for covering the
page with something the visitor didn't ask for.

| What to change | Where |
| --- | --- |
| The wording on the tab | `_includes/popup.html` — the text inside `gc-nudge-open` |
| The five-second delay | `assets/js/site.js`, section 7 — the `5000` |
| The 30-day gap before it returns | same section — the `30 * 24 * 60 * 60 * 1000` |
| Where it sits, and its colours | `_includes/base-styles-dark.html` — the `#gc-nudge` rules |
| The wording inside the signup box | `_includes/popup.html` |

Keep the tab short. It's rotated on its side, so long wording makes it tall
enough to start covering things.

---

## Your email list

Every signup form on the site sends addresses to **Mailchimp** — the website
itself stores none. Log in at mailchimp.com and open **Audience → All
contacts** to see everyone.

Each signup is also stamped with what the person signed up for, so you can
email one group without the others:

| Label | Where they signed up | What they were promised |
| --- | --- | --- |
| `premix-launch` | homepage premix box, both forms on `/premixes/`, the end of all four guide pages | one email when the premixes launch |
| `premix-news` | the form at the bottom of `/premixes/`, once the shop is open | new blends and restocks |
| `events` | `/events/` | the pop-up schedule |
| `newsletter` | the footer, and the side tab | general news (plus the 10% code while the welcome offer is on) |
| `welcome` | the "Get 10% off" line in the cart | the 10% code, and the odd email |

**One-time setup in Mailchimp** — without this, Mailchimp quietly throws the
label away:

1. **Audience → Settings → Audience fields and \*|MERGE|\* tags → Add a field → Text.**
2. Call it **Signed up for**, and set its merge tag to exactly **`SOURCE`**.
3. Untick **Visible**, so it doesn't appear on Mailchimp's own signup page. Save.

**Emailing one group:** in **Audience → All contacts**, make a segment where
*Signed up for* **is** `premix-launch` (or `events`, or `newsletter`) and save
it. When you create a campaign, send it to that segment instead of the whole
audience.

Two things to know:

- Anyone who signed up **before** the labels went live has a blank label. Treat
  blanks as "unknown" — if in doubt, only send them the premix launch note.
- Someone already on the list who signs up again from a different form keeps
  their first label; Mailchimp doesn't update existing subscribers from these
  forms.

To change which label a form uses, it's the `list="..."` on that form's line in
the page (for the guide pages, in `_includes/cta-premix.html`). A new label
needs no setup in Mailchimp — it lands in the same field.

### Customers on the list

Once the checkout service is running and has a Mailchimp key, **everyone who
orders online is added to the list automatically**, tagged `customer`, with the
date of their latest order in a *Last order* field. If they ticked "send me
new blends and deals" on our own payment page, they're also tagged
`opted-in`. Anyone who has unsubscribed stays unsubscribed. Every buyer's
details are in Square too (**Customers → Directory**, with an export button),
including from before this was switched on.

**The rule to email them by (Canada's anti-spam law, CASL):** a purchase lets
you send someone marketing emails for **two years after their latest order**.
People who signed up themselves, or are tagged `opted-in`, have no time limit
until they unsubscribe. Every email must say who it's from, give your mailing
address and have an unsubscribe link; Mailchimp's footer does all three.

So for a promotion, send it to a saved segment with **any** of these:
*Signed up for* is not blank · tag is `opted-in` · *Last order* is after
(today's date two years ago).

**One-time setup:**

1. Mailchimp: **Audience → Settings → Audience fields and \*|MERGE|\* tags →
   Add a field → Date.** Call it **Last order**, merge tag **`LASTORDER`**,
   untick *Visible*. Save. (Without it, buyers are still added, just without the
   date.)
2. Mailchimp: **Profile → Extras → API keys → Create a key.** Copy it.
3. Vercel → godschai-checkout → Settings → Environment Variables:
   `MAILCHIMP_API_KEY` = that key. Redeploy.

---

## The guide pages

Four long-form pages that exist to get found in search, then send people to the
menu and the launch list:

| Page | Goes after |
| --- | --- |
| `/how-to-make-masala-chai/` | people looking for the method |
| `/masala-chai-spices/` | people wanting to know what's in it |
| `/how-to-make-iced-chai/` | people whose iced chai keeps coming out weak |
| `/chai-tea-latte-vs-masala-chai/` | people who don't know there's a difference |

They all link to each other and to the menu, which is the point — a cluster of
pages on one subject does better than the same words on one page. All four are
in the footer.

Two of them read their lists from data files you can edit: `_data/spices.yml`
(the five spice cards) and `_data/iced.yml` (the four iced steps, which also
feed that page's Google recipe data).

**Adding another guide?** Copy an existing one, change the front matter, and add
a link to it in `_includes/footer-dark.html` and in the "Keep reading" list at
the foot of the others. Not the top menu — it only fits four links plus the
Instagram button on a phone.

---

## Change site-wide details

**`_config.yml`** holds the things that appear everywhere: Instagram and TikTok
links, the Google Analytics ID, the Mailchimp list, and the season label shown on
the menu (`season: "Summer 2026"`).

---

## Page titles and descriptions

Each page starts with a short block between `---` lines:

```yaml
---
layout: default
title: "Chai Catering in Saskatoon | God's Chai"
description: "Book the God's Chai cart for weddings, corporate mornings..."
---
```

Two rules worth keeping:

- **Titles under 60 characters**, and always pair the brand with *Saskatoon* or
  *Saskatchewan*. "God's Chai" on its own is also a Chaayos product in India, and
  we will not outrank them on the bare brand name — local intent is where we win.
- **Descriptions 140–160 characters.** Shorter gets padded by Google, longer gets cut.

---

## The sitemap

`sitemap.xml` is generated automatically on every build — there is nothing to
update. To keep a page *out* of it, add `sitemap: false` to that page's front matter.

---

## Adding a whole new page

1. Make a folder with an `index.html` inside, e.g. `wholesale/index.html`.
2. Start the file with front matter:

   ```yaml
   ---
   layout: default
   title: "Chai Wholesale in Saskatoon | God's Chai"
   description: "A 140-160 character summary of the page."
   breadcrumb: "Wholesale"
   ---
   ```

3. Write the content below it. It automatically gets the nav, footer, fonts,
   analytics, social tags and breadcrumb data.
4. Add a link to it in `_includes/nav-dark.html` or `_includes/footer-dark.html`
   so people (and Google) can find it.

> Careful with the nav: it currently fits four links plus the Instagram button on
> a phone. Adding a fifth will push the button off the screen. Prefer the footer.

---

## Previewing locally (optional)

```bash
bundle install          # first time only
bundle exec jekyll serve
```

Then open <http://localhost:4000>.

---

## Things that live outside this repo

These matter for search but can't be done in code:

1. **Google Business Profile** — set up as a *service-area business* in Saskatoon.
   For a local pop-up brand this is the single highest-value thing on the list.
2. **Google Search Console** — verify the domain and submit
   `https://godschai.com/sitemap.xml`, then request re-indexing so the old cached
   version gets replaced.
3. **Instagram and TikTok bios** — add the godschai.com link.
4. **Mailchimp double opt-in** — recommended so bots can't spam-subscribe addresses.
5. **Mailchimp "Signed up for" field** — the one-time setup under *Your email
   list* above. Until it exists, signups arrive without their label.
6. **Square** — the two premix items and the 30 checkout links behind the shop
   (see *The shop*). The links are the only part the website needs, and they
   live in `_data/shop.yml`.

---

## Things not to touch

- **`CNAME`** — this is what points godschai.com at the site. Deleting it takes
  the domain down.
- **`order-confirmed/index.html`** — every Square checkout link sends people
  back to this address after they pay. Moving or renaming it breaks that step
  for every order.
- **`menu.html`** in the root and **`menu/index.html`** — both are small
  forwarders that send the old menu addresses to the lineup on the homepage, so
  old links and Google's index keep working. Delete them and those links 404.

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
  - name: "Iced Cardamom Chai"          # shows in the homepage menu
    desc: "Cardamom-forward, over ice." # the longer description
    short: "Cardamom, over ice."        # the short line on its homepage card
    img: "uploads/drink-cardamom.jpeg"  # photo (see "Adding a photo" below)
    alt: "Iced Cardamom Chai in a God's Chai cup"   # describes the photo
```

Optional extras:

| Field | What it does |
|---|---|
| `menu_name` | A longer name, used only in the menu data Google reads |
| `menu_desc` | A longer description, same |
| `logo_tile` | `true` shows the God's Chai logo instead of a photo |
| `photo` | A picture already sized in `uploads/opt` at 160 and 320 px (the samosa uses `offer-bulk`); add `photo_widths` if it has other sizes |

That one edit updates the homepage menu **and** the `Menu` structured data
Google reads. They can't drift apart.

**There is no separate menu page any more.** The menu grid on the homepage is
the menu — every hot drink, iced drink and snack is in it — and the Menu link in
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

**You never need to delete old events.** Once an event's `end` date has passed
it leaves the schedule and the homepage and moves to a short **"Past pop-ups"**
list at the bottom of `/events/`, marked as past. (That move happens the next
time the site is published; in between, the page hides it from the schedule by
itself.) Google's event listing only ever gets the upcoming ones.

Two optional lines: `street: "503 Ruth St W"` gives Google the street address,
and `free: false` tells it the event charges admission.

Keep `start` and `end` accurate — those are what Google shows in event results.

The homepage and the `/events/` page both show the upcoming list, so adding one
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
  img: "pouch-masala-real"              # a real photo of the pouch, uploads/_src/pouch-masala-real.jpg (4:7), no extension
  alt: "God's Chai Original Masala premix pouch, 125g, makes 25 cups"
  scene: "pouch-masala-scene"           # the pouch in its setting (4:5), the big picture on the homepage, shop and its page
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
they reach `/order-confirmed/`. On a phone, swiping a pouch row to the left
takes that blend out of the cart (the *Remove* link does the same). The code
is in `assets/js/cart.js` and `_includes/cart-drawer.html`.

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
   name the project `godschai-site-checkout`. Set **Root Directory** to `checkout`,
   and the Framework Preset to **Other**. Under Environment Variables, add
   `SQUARE_ACCESS_TOKEN` with the token as its value. Deploy.
3. Open `https://godschai-site-checkout.vercel.app/api/checkout`. It should say
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
| `price` | $15.99 a pouch, before tax. |
| `pair_price` | "Try both": one Original Masala + one Rose & Cardamom for $28.99, for every pair in the order. The saving comes off before PST. `checkout/lib/order.js` (`PAIR_SAVING`, in cents: 2 × price − pair price) applies it on Square. The pre-made links for orders with both blends are left out, because they carry the old price. |
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

## Bulk orders

`/bulk-orders/` takes orders for hot chai by the cup and samosas by the dozen,
for offices, parties and get-togethers. It's linked from the footer, the
catering page and the homepage's strip of three cards.

**How it works.** People choose how much chai and how many samosas, the day
and time, and pickup or delivery, then press *Send my request*. Their own email
app opens with everything filled in, addressed to the shop email (`email` in
`_data/shop.yml`), and they send it. Nothing is paid on the site: reply to say
you're free and what it costs, then send a Square payment link or invoice (or
ask Claude to make the link). If no email app opens, the page shows the same
request for them to copy and send by email or Instagram.

**Changing it.** Everything is in `_data/bulk.yml`:

- `notice_hours`: how far ahead people have to order (48). The form won't let
  anyone pick a time sooner than that.
- `items`: what can be ordered, each with a name, description, unit (cups,
  dozen), minimum, step and maximum. `price` is blank, so the page says
  *Price on request*. Put text like `"$4.50 a cup"` there to show a price.
- `pickup` and `delivery`: the wording under each choice.

Another item (chai concentrate by the litre, say) is just one more entry under
`items` with its own `key`.

---

## Change the brew guide

`/how-to-make-masala-chai/` reads top to bottom, in this order:

1. **Intro** beside a muted loop of chai being strained into a mug (the
   homepage hero's `hero-strain` clip), with the total time.
2. **"I'm making − 2 + cups"**: four tiles follow, water, whole milk, God's
   Chai (heaped tablespoons and grams, with the pouch photo) and sugar (to
   taste). From 5 cups a line says to use a big pot. `?cups=6` opens it at 6.
4. **Pick your shade**: four chai-coloured tiles, Light, Smooth, Bold
   (marked "How we pour it") and Extra bold, each with its simmer time for
   the cups chosen. The one picked sets the rises and the timer in step 3.
   `#colour` jumps here (the premix pages link to it).
5. **Four step cards**, each with a few silent seconds of that step
   (`uploads/video/brew-boil|blend|rise|strain.mp4`, first frames in
   `uploads/opt/brew-*-640.jpg`). They play only while on screen, and not at
   all with reduced motion or data saver.
   Step 1 shows the time to the boil; step 3 shows the simmer time and has
   the **simmer timer**: ▶ starts it when the mix is in, tap again to pause.
   A thin bar fills from milky to the shade picked, a soft chime and a line
   prompt each rise, three chimes say strain (phones that can, buzz too), and
   the screen stays awake while it runs.
6. **How did your cup turn out?** Four chips (just right, too weak, too
   strong, boiled over), each showing a tip. CSS only, so it works without
   JavaScript.
7. **Questions**: mix per cup, sweetened?, iced? Also published as `FAQPage`
   structured data; change the answers in the page and both follow.
8. **The premix**: pouch photo, price (while `shop.open`), pouch size and
   cups, and a link to `/premixes/`.

On phones it's laid out dense, so each screenful carries as much as it can:
the intro sits beside a small clip, the four ingredients and the four shades
each fit one row, the steps are a tight list with a small video beside each,
and the whole guide is about three screens. Those styles are the
`max-width:600px` block in the page.

The layout took its cues from other brew guides (sentence-style calculator,
step cards with video, colour tiles, "how did it turn out"); the words,
photos, clips and timings are all ours.

It's all written out for 2 cups and Bold, so it reads right without
JavaScript (then the controls are just hidden). Markup and styles:
`how-to-make-masala-chai/index.html`; behaviour: `assets/js/site.js`, 5c.

Everything it says comes from **`_data/brew.yml`**: `amounts` (per cup), the
`steps` (`clip` names each step's video),
the `shades` (name, colour,
simmer minutes for 2 cups, rises, a line about it) and the timing rule
(`boil_base`, `boil_per_cup`, `simmer_per_cup`). The times are rough guides
for a stove on medium-high; change them after timing your own pot. The same
file feeds the page's `HowTo` structured data, which Google can show as a
recipe-style result.

The longer written guide (why the double boil, the spices, common mistakes)
is in the git history if it's ever wanted back.

The three guide articles (iced chai, the spices, chai latte vs masala chai)
are kept short on purpose: a line of intro, the core (steps, spice cards or
the two-card answer), one short list of tips, and the premix. The longer
versions are in the git history (before December 2026).

---

## The homepage hero

The hero rotates through a few pictures, crossfading, in the order listed in
**`_data/hero.yml`**:

1. the `lead` photo: the God's Chai bar at golden hour (Poise Studio, August),
   with a portrait version for phones;
2. a video loop of chai rising to a rolling boil in a steel pot (9 s);
3. the three cups held up at the cart (6 s);
4. a video loop of chai strained into a mug (8 s);

and round again. Both loops are silent, colour-graded clips from the How to
make chai shoot, seamless where they loop.

The headline, "Not your average chai.", is the page's main heading (its
`h1`). "Masala chai in Saskatoon" is part of it for Google and screen readers,
but isn't shown.

**It runs by itself and loops**: each picture shows for its time (`seconds`,
or `video_seconds` for the loop), crossfades into the next, and after the last
it goes back to the first, round and round. It holds still while the hero is
off screen or the tab is hidden, and carries on when you come back. With
reduced motion on, nothing moves on its own (it stays on the opening photo).
Each photo loads only when it's next.

**To change the pictures**, edit `_data/hero.yml`: add or remove a slide,
change how long each shows (`seconds`, or `video_seconds` for the loop), and
set `focus` to the part of the photo to keep when a phone crops it. A new
photo needs its web sizes first: put it in `uploads/`, list it under
`FULL_BLEED` in `tools/optimize-images.py`, and run the tool.

**The loops:** each video slide has a wide version for landscape screens
(`uploads/video/<name>-wide.mp4`, 1280×720) and a portrait cut for phones
(`<name>-tall.mp4`); only the one that fits is downloaded, just before its
turn. Its first frame loads first and stays for reduced motion or data saver;
the video fades in over it. In `hero.yml` a video slide is just
`video: hero-strain` (plus `alt`, and `seconds` if it isn't 9). To add or
change one: put the two MP4s in `uploads/video/` (H.264, no sound, ideally
under 2 MB), save their first frames as `uploads/_src/<name>-wide.png` and
`-tall.png`, list those under `POSTERS` in `tools/optimize-images.py`
(640, 1280 and 608 wide), and run it.

**The words**: the headline, one line under it ("Kerala spice × Assam tea ×
YXE."), and the two buttons, which are bright frosted glass so
the photo shows through. A dark wash behind the words keeps them readable.
(The small "100% real spices · 2 origins · YXE" row was dropped once the line
above it said the same.)

The cups-at-the-cart photo is also the picture links show when the site is
shared, and the business photo Google gets.

### Photos from the God's Chai Content folder

Picked from the event photos in Drive and graded to match the site (warm,
slightly matte, deep shadows), each with its graded original in
`uploads/_src/`:

- `hero-golden-wide` / `hero-golden-tall`: the hero's opening photo.
- `catering-sunset`: the bar at sunset, under the heading on `/catering/`.
- `samosa-warmer`: samosas in the warmer, under the order form on
  `/bulk-orders/`.
- `spice-flatlay`: the spice jars and mortars, under the heading on
  `/masala-chai-spices/`.
- `booth-crowd`: the queue at the booth on Canada Day, under the schedule on
  `/events/`.
- `iced-chai-booth`: an iced chai held up at the booth, under the heading on
  `/how-to-make-iced-chai/`.

The page photos use `_includes/photo-band.html`: a wide photo (21:9, or the
`ratio` you give it, e.g. "3/2"; 4:3 on phones) with an optional one-line
caption. To use it elsewhere:
`{% include photo-band.html base="samosa-warmer" widths="800,1600" alt="…" caption="…" %}`.

### Other photos from the shoot

- `premix-macro` (a close-up of the mix) sits beside "Why bother with ours" on
  `/premixes/`.
- `pouch-masala-kitchen` (Original Masala on the kitchen counter) is the photo
  in the "Want the blend, not the shopping list?" box at the foot of the
  guide pages (`_includes/cta-premix.html`).

Both are graded originals in `uploads/_src/`. Two holiday shots of the pouches
from the same folder (IMG_0884, IMG_0924) aren't used yet: they'd suit a
Christmas gift note.

---

## The homepage, top to bottom

It's kept short: only what a visitor needs to decide, in this order.

1. **Hero**: rotating photos, the headline, and two buttons (Shop premixes,
   Book catering). See "The homepage hero".
2. **A ticker**: real spices from Kerala, single-origin Assam tea, and so on.
   This is the one line that says why we're different.
3. **The three ways to buy**: premixes, catering and bulk orders (below).
4. **Premixes**: both pouches with Add buttons, the price, delivery, and a
   link to the brew guide.
5. **The menu**: every drink and the samosa as rounded photos with their
   name underneath, all on one deep, warm gradient (no separate cards), from
   `_data/menu.yml` (`_includes/menu-card.html`). Four across on desktop, two
   on phones. The Menu link lands here (`#menu`).
6. **Events**: the next pop-ups (`_data/events.yml`).
7. **@godschai**: the Instagram grid.

The longer sections (the hot drink and iced drinks shown separately, the
"Kadak" photo band, "Why God's Chai is different", the four brew steps and the
catering pitch) were taken out in November 2026 because each repeated
something above it or has its own page: the brew guide, catering and bulk
orders. They're in the git history if any is wanted back.

## The homepage's three ways to buy

Straight under the hero, `_includes/offer-strip.html` shows three cards:
**Premixes**, **Catering** and **Bulk orders**, each linking to its page, so
visitors see what they can buy before they scroll. The pouch price comes from
`_data/shop.yml` and the notice period from `_data/bulk.yml`; the rest of the
wording is in the include. The hero's second button goes to Catering.

Each card has a small square photo from our own shoots: `offer-premix` (the
real Original Masala pouch on a kitchen counter), `offer-catering` (the bar at
sunset at the Poise Studio event) and `offer-bulk` (samosas in the warmer). They're
cropped square and graded to match the site; the graded originals are in
`uploads/_src/offer-*.jpg`, sized by `tools/optimize-images.py`. To swap one,
replace that file with another square photo and run the script.

The iced drink photos on the menu all follow one studio look: the cup is big and
centred on a plain backdrop. Gulabo, Mont Blanc and Banana Bread are studio
shots (`uploads/_src/drink-*-studio.png`, `drink-montblanc-v2.jpeg`). Chocolate
and Lavender were shot on an orange tablecloth. Their `drink-*-studio.jpg`
versions are the same photos reframed to match, with the cloth and wall
recoloured to cocoa (chocolate) and dusty rose (lavender). The real shadows,
folds and clear plastic are kept, and the orange glow on the drinks is toned down.

The menu bar runs in the same order: Shop, Catering, Menu, Brew Guide, Events
(`_includes/nav-dark.html`). On phones (under 760px) the links and the
@godschai pill fold into one round menu button next to the bag. It opens a
panel with the main pages and the Instagram, TikTok and Facebook icons; a
link, a tap outside or Escape closes it (`site.js`, "phone menu").

**Buttons.** Every filled button (shop, add to cart, send my enquiry, pay,
sign up…) shows a few seconds of our boiling-chai footage under a
see-through chai tint, so it reads as a gentle animation. The texture is
`uploads/opt/btn-boil.webp` (80 KB, an 8-second loop), cut from the hero's
pot clip with:

    ffmpeg -i uploads/video/hero-pot-wide.mp4 -vf "crop=680:160:330:300,fps=8,scale=340:80:flags=lanczos,gblur=sigma=0.5" \
      -c:v libwebp_anim -q:v 35 -compression_level 6 -loop 0 -an uploads/opt/btn-boil.webp

`btn-boil-still.webp` is one frame of it, used when reduced motion is on.
The tint and hover are in `_includes/base-styles-dark.html` (`--gc-boil`).
The tint is the colour of the real chai in the clip (`#C9934A`, sampled
from the video frames), with dark espresso text (`#2B170B`) so the label
stays easy to read. Hover makes it a little lighter.

Forms (catering enquiry, bulk orders, checkout, the email sign-ups, the Chai
Club card) all use the same minimal fields: a small mono label, the field as a
hairline underline on the page (no boxes), a coral underline on focus, and
short fields paired two to a row even on phones. The text in a field stays
16px so iPhones don't zoom in. The card number field at checkout is Square's
own box (styled in `assets/js/pay.js`).

The footer is kept short: the logo, one line, the main pages on one line, the
guides on a smaller line under them, the three social icons, and the email
sign-up. The social icons are one include, `_includes/social-icons.html`, used
in both the footer and the phone menu.

---

## Colours: the daylight theme

The site is a light, daylight theme. Every colour is one of the named colours at
the top of `_includes/base-styles-dark.html` (the file keeps its old name), so
changing the look means changing a few values there, not hunting through pages:

| Name | Used for |
| --- | --- |
| `--gc-bg`, `--gc-bg2`, `--gc-card` | page, alternate sections, cards |
| `--gc-fg`, `--gc-fg2` … `--gc-fg4`, `--gc-muted` | text, from headline to quiet |
| `--gc-gold-t`, `--gc-coral-t` | gold and coral **text** and thin lines, darkened to read on cream |
| `--gc-ink-rgb`, `--gc-gold-rgb` … | the same colours as numbers, for borders and tints with some see-through (`rgba(var(--gc-ink-rgb),0.12)`) |

Buttons are the brand rust (`#B55F3E`) with white text; the page is cream (`#F2EBE1`) and text espresso (`#3C2116`), the three brand colours.

**Anything on a photo stays dark.** Put `class="gc-dark"` on an element and the
original dark colours come back for everything inside it. That is how the home
page's hero, the "Kadak" banner and the two video tiles keep light text over
their photos, and how the header stays light-on-photo until you scroll past the
hero (then `assets/js/site.js` takes the class off and the header turns daylight).
New photo sections: add `gc-dark` to the section and nothing else.

Not changed: the emails (order confirmation, the Chai Club welcome, the Square
receipt kit). They have their own colours in `checkout/lib/`.

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
dark backgrounds. On light ones (the daylight site, search results, Square
receipts) "CHAI" is the pouch's dark brown (`#3C2116`) instead.

The animated component can only paint the whole mark one colour, so that colour
comes from the `tint` on the `<gods-chai-logo>` tag in `_includes/nav-dark.html`
(it reads the `--gc-logo` colour, cream in the dark scope and brown on daylight)
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
# 3. the browser-tab icon is its own artwork (see "The browser-tab icon"):
#    replace it and run  bash tools/make-icons.sh
```

Change one without the others and the animated logo and the still ones stop
matching.

If you make the header logo a different size, the number to change with it is
`scroll-margin-top` in `_includes/base-styles-dark.html`. That's what stops the
top of a section hiding behind the bar when someone clicks Menu or Events.

---

## The Instagram grid

Near the bottom of the homepage, under the `@godschai` heading, nine square
tiles sit three to a row like an Instagram profile, with a **Follow @godschai**
button below. Every tile opens Instagram. The component is
`_includes/insta-grid.html`; what goes in it is `_data/instagram.yml`.

**Show your real, latest posts (recommended, about two minutes):**

1. Sign up free at **behold.so** and connect the @godschai Instagram account.
2. **New feed → JSON feed**, and copy the feed's address (it starts
   `https://feeds.behold.so/`).
3. Paste it into `_data/instagram.yml` as `feed_url: "https://feeds.behold.so/…"`
   and commit.

From then on the grid shows your newest posts, up to nine, in full rows of
three (reels get a small ▶ in the corner) and keeps up by itself as you post;
Behold refreshes it. The feed is already on: `feed_url` in
`_data/instagram.yml` is the @godschai Behold feed. Behold's free plan may cap
how many posts the feed holds (it holds six today, so the grid shows two rows). If the feed
ever fails to load, the nine tiles below stay up, so the section is never
empty. To go back to the fixed tiles, set `feed_url: ""`.

**The fixed tiles** (what shows without a feed) are listed under `tiles:` in
the same file, in grid order: a photo from `uploads/opt`, alt text, and
optionally a `link` to a particular post (otherwise the tile opens the
profile). Two of them are clips:

- `uploads/video/community-cart.mp4` and `uploads/video/community-rose.mp4`
  play silently in their tiles. Neither starts downloading until it scrolls
  into view, and both pause when it scrolls away.
- **To swap a clip**, put the new one in `uploads/video/` with the same name.
  It should be H.264 MP4, no wider than about 500px, at 30fps. Then save a
  still from it as `uploads/community-cart.png` (or `-rose`) and run:

```bash
python3 tools/optimize-images.py
```

That still is what people see for the moment before the video arrives.

---

## The browser-tab icon

The icon on browser tabs, next to the site in Google results, on an iPhone home
screen, and the logo in the site's business details for Google, is a **glossy
off-white tile with the God's Chai logo on it**, laid out like the "GC Tasks" app
icon: the tile is `#F2EFE8`, "God's" and its underline are rust (`#AC6040`),
"CHAI" is dark brown (`#362218`), there is no tagline, and the logo is about
68% of the tile wide.

`tools/make-icons.sh` builds it. The tile's light and shade come from
`uploads/_src/app-icon-source.png` (the old gold tile, with its lettering taken
out); the logo is cut from `uploads/_src/artboard.png`. The script writes every
size: `favicon.ico`, `favicon-32/48/96/144/192.png`, `apple-touch-icon.png` and
`uploads/opt/app-icon-512.png`. The 16-48px ones are cut a little closer around
the logo so it stays readable. The settings at the top of the script are the tile
colour and gloss (`TILE`, `SHEEN`, `SHADE`) and the logo (`LOGO_W` for its size,
`LOGO_DARK` and `LOGO_RUST` for its colours). After changing any of them:

```bash
bash tools/make-icons.sh
```

Google picks up a new icon when it next crawls the homepage, which can take a
few days to a few weeks.

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

## The particle light

The signup box has a small cloud of glowing specks at the top: a slow sphere
while it waits, a swirl while the signup is sending, and a tick once it has
gone through. The order-confirmed page shows the same tick.

(The big version that used to sit above the brew and iced-chai steps — Boil,
Blend, Rise, Strain — has been taken out. The step cards are unchanged.)

It's all one file, `assets/js/particles.js` — no outside library, and it's only
downloaded when the signup box opens or an order is confirmed. It only runs
while it's on screen; with "reduce motion" switched on it changes shape
instantly and holds still; and with JavaScript off it simply isn't there. Each
state's shape and colour live in `PRESETS` near the top of the file.

---

## The Chai Club

The Chai Club card is the site's email signup. It's styled like the club poster:
cream, "JOIN the *Chai* club", and a yellow 10% badge. Nothing covers the page
and nothing takes focus:

- **When it appears:** 5 seconds in (`delay_seconds` in `_data/club.yml`), it
  slides up in the **bottom-right corner**. On a **phone** it runs along the
  bottom, after the same delay. On product pages it sits above the phone buy bar.
- **What's on it:** one line, a "See the perks" link that opens the four perks,
  and an email box with a **Join** button.
- **Closing it:** the × (or Escape) hides it for 30 days and leaves a small
  **"10% off" dot** in the same corner, on every page, that opens it again. The
  dot is frosted glass so it doesn't compete with the photos: bright clear
  glass with white text over the homepage hero, pale with brown text on the light pages. It
  goes away for good once they join. Styles: `_includes/popup.html`.
- **After joining:** it says *"You're in the Chai Club! Check your inbox…"*,
  then tidies itself away. Members never see it again.
- **Where it never shows:** the checkout page and the order-confirmed page.

**What happens when someone joins (all automatic):**

1. The card sends their email to the checkout service (`checkout/api/club.js`).
2. The service adds them to Mailchimp (label `chai-club`) and tags them
   **`chai-club`** and **`opted-in`**. They asked to join, so under Canada's
   anti-spam law you can keep emailing them until they unsubscribe.
3. The service emails them the **welcome note with the code CHAI10**: 10% off
   their first order of chai mixes. It's sent from `orders@godschai.com`, and
   replies go to sip@godschai.com. Then they're tagged **`club-welcome-sent`**,
   so nobody gets it twice.
4. At checkout they type CHAI10 into Square's coupon box. **Square makes sure
   it only works once per customer**, as long as the coupon is set up as below.
   It **can't be combined with the "Try both" pair price**: Square greys out
   the coupon box on an order that already has a discount. The welcome email
   says so, and the cart shows "Coupon codes can't be added to the pair price"
   whenever the pair saving is in the basket.

If the service can't be reached, or Mailchimp isn't connected to it yet, the
card signs them up straight to Mailchimp (label `chai-club`). Nobody is lost;
they just don't get the welcome email until they join again or you email them.

**One-time setup:**

- **In Square:** Dashboard → Customers → Marketing → **Coupons → Create
  coupon.** Code `CHAI10`, 10% off, the whole order (or just the two chai
  mixes), usable online, **limited to once per customer**. Activate it.
- **In Vercel** (godschai-site-checkout → Settings → Environment Variables):
  `MAILCHIMP_API_KEY` (Mailchimp → Profile → Extras → API keys). The welcome
  email also needs `EMAIL_FROM`, which the order emails already use. Redeploy.
- **Check:** `https://godschai-site-checkout.vercel.app/api/club` should say
  `"mailchimp":true,"welcomeEmails":true`.

**Emailing members:** in Mailchimp, make a segment with the tag `chai-club`.
That's who to invite to tasting nights and flavour votes. Tagged `chai-club` but
not `club-welcome-sent` means they joined before the welcome email was switched
on: send them the code once by hand (or as a one-off campaign to that segment).

| What to change | Where |
| --- | --- |
| The line, the perks, the delay, the 30 days | `_data/club.yml` |
| The perks in the welcome email (keep them matching) | `checkout/lib/club.js` |
| The welcome email itself | `checkout/lib/club.js` |
| How the card looks | `_includes/popup.html` |
| When it shows | `assets/js/site.js`, section 7 |

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
| `newsletter` | the footer | general news (plus the 10% code while the welcome offer is on) |
| `chai-club` | the Chai Club card | the club's perks; their welcome email carries 10% off their first order |
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
3. Vercel → godschai-site-checkout → Settings → Environment Variables:
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

**`_config.yml`** holds the things that appear everywhere: the Instagram, TikTok
and Facebook links (`social`; leave `facebook` empty to hide its icon),
`long_copy` (false hides the longer write-ups, "Why bother with ours" on
/premixes/ and "How it works" on /catering/; true brings them back), the Google Analytics ID, the Mailchimp list, and the season label shown on
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

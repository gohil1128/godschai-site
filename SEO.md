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
  - name: "Iced Cardamom Chai"          # shows on the menu and homepage
    desc: "Cardamom-forward, over ice." # the longer description
    short: "Cardamom, over ice."        # the short line in the homepage grid
    img: "uploads/drink-cardamom.jpeg"  # photo (see "Adding a photo" below)
    alt: "Iced Cardamom Chai in a God's Chai cup"   # describes the photo
```

Optional extras:

| Field | What it does |
|---|---|
| `menu_name` | A longer name used only on the `/menu/` page |
| `menu_desc` | A longer description used only on the `/menu/` page |
| `logo_tile` | `true` shows the God's Chai logo instead of a photo |

That one edit updates the `/menu/` page, the homepage lineup, **and** the
`Menu` structured data Google reads. They can't drift apart.

### Adding a photo

1. Put the original in `uploads/` (any size — big is fine).
2. Run the image tool once so the small, fast versions get made:

   ```bash
   python3 tools/optimize-images.py
   ```

3. Reference the original filename in `menu.yml` (e.g. `uploads/drink-cardamom.jpeg`).
   The site automatically serves the WebP and correctly-sized versions.

If you skip step 2 the photo won't appear, because the page looks for the
optimised copies in `uploads/opt/`.

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
It runs on every page except the menu page.

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

The lockup is two-tone: **"God's" and the brush stroke under it in brand orange
(`#F2A93C`)**, "CHAI" and the tagline in cream.

The component itself can only paint the whole mark one colour, so the cream
comes from the `tint` on the `<gods-chai-logo>` tag in `_includes/nav-dark.html`
and the orange is painted over the five orange pieces by a rule in
`_includes/base-styles-dark.html`.

The ordinary logo pictures — the header's fallback, the footer, the menu page —
have been recoloured to match, so every God's Chai mark on the site is the same
two-tone. The originals are kept at `uploads/_src/*-source.png`.

**To change the orange**, three things have to move together:

```bash
# 1. edit BRAND at the top of tools/recolour-logo.py, then
python3 tools/recolour-logo.py
python3 tools/optimize-images.py
# 2. change the matching #F2A93C in _includes/base-styles-dark.html
#    (the rule just under "gods-chai-logo:defined")
```

Change one without the others and the animated logo and the still ones stop
matching.

If you make the header logo a different size, the number to change with it is
`scroll-margin-top` in `_includes/base-styles-dark.html`. That's what stops the
top of a section hiding behind the bar when someone clicks Menu or Events.

---

## The email signup tab

Nothing pops open on its own any more. About five seconds in, a small amber tab
slides in at the right edge of the screen reading **"psst — join the list"**.
Tapping it opens the signup box; tapping the little × puts it away. Either way
it stays gone for 30 days, and it never appears again for someone who has
already subscribed.

It covers under 1% of the screen on a laptop and about 2% on a phone — the old
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

---

## Two things not to touch

- **`CNAME`** — this is what points godschai.com at the site. Deleting it takes
  the domain down.
- **`menu.html`** in the root — it's a small forwarder that sends the old
  `/menu.html` address to the new `/menu/` page, so old links and Google's index
  keep working.

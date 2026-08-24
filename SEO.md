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

## The logo animation on the home page

Just under the hero there's a cream tile that draws the logo on, once, as you
scroll past it. It's deliberately quiet: no sound, it never repeats, and it
doesn't start downloading until you actually scroll near it.

Four files make it work:

| File | What it is |
| --- | --- |
| `uploads/logo-sting.mp4` | the animation (Safari plays this one) |
| `uploads/logo-sting.webm` | the same animation, smaller (Chrome, Firefox, Edge) |
| `uploads/logo-sting.png` | its last frame — the finished lockup |
| `uploads/opt/logo-sting-*.jpg` / `.webp` | the sized copies of that last frame |

The last frame is what shows for anyone who has turned animations off in their
phone or computer settings, and for anyone whose browser can't play the video.
That's why it has to stay in step with the animation.

The full-length original is kept at `uploads/_src/logo-sting-master.mp4`. Jekyll
ignores anything in a folder starting with `_`, so it stays in the repo for
re-cutting but is never published to the live site.

**To swap in a new animation** you need `ffmpeg` (`pip install imageio-ffmpeg`):

```bash
# 1. crop to a square around the logo, trim off any blank tail, shrink to 640px
ffmpeg -i new-sting.mp4 -t 4.45 -vf "crop=880:880:522:90,scale=640:640" -an \
       -c:v libx264 -pix_fmt yuv420p -crf 24 -movflags +faststart uploads/logo-sting.mp4
ffmpeg -i new-sting.mp4 -t 4.45 -vf "crop=880:880:522:90,scale=640:640" -an \
       -c:v libvpx-vp9 -crf 36 -b:v 0 uploads/logo-sting.webm

# 2. save its final frame as the still
ffmpeg -y -ss 4.40 -i new-sting.mp4 -vf "crop=880:880:522:90,scale=640:640" \
       -frames:v 1 uploads/logo-sting.png

# 3. remake the sized copies
python3 tools/optimize-images.py
```

The `crop` numbers are cut to *this* animation's framing (a 1920×1080 source
with the logo in the middle). A different animation will need different ones —
or none at all, if it's already square.

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

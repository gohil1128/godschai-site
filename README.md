# godschai.com

Website for **God's Chai** — masala chai made with whole spices from Kerala and
single-origin Assam tea, brewed fresh in Saskatoon, Saskatchewan.

Built with [Jekyll](https://jekyllrb.com) and published with GitHub Pages.

## 👉 Editing the site

**See [SEO.md](SEO.md).** It explains, in plain language, how to add a drink, add
a pop-up event, change the brew guide, or add a new page — and how the Google
structured data and sitemap stay in sync automatically.

## Pages

| URL | Source |
|---|---|
| `/` | `index.html` |
| `/menu/` | `menu/index.html` |
| `/how-to-make-masala-chai/` | `how-to-make-masala-chai/index.html` |
| `/events/` | `events/index.html` |
| `/premixes/` | `premixes/index.html` |
| `/catering/` | `catering/index.html` |
| `/404.html` | `404.html` |

## Where things live

```
_data/          menu.yml, events.yml, brew.yml  ← the content you edit
_includes/      head, nav, footer, signup form, popup, schema, image helper
_layouts/       default.html (dark pages), light.html (the menu page)
assets/js/      site.js — all interaction, plain JavaScript, no framework
assets/fonts/   self-hosted woff2 + fonts.css
uploads/        original photos
uploads/opt/    generated small/WebP copies (tools/optimize-images.py)
tools/          optimize-images.py
CNAME           points godschai.com here — do not delete
```

## Local preview

```bash
bundle install            # first time only
bundle exec jekyll serve  # http://localhost:4000
```

## After adding a photo

```bash
python3 tools/optimize-images.py
```

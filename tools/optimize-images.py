#!/usr/bin/env python3
"""Generate the small, fast copies of every image the site uses.

Run this after adding a photo to uploads/:

    python3 tools/optimize-images.py

It writes WebP + original-format fallbacks into uploads/opt/ at the widths the
pages ask for, and regenerates uploads/og-image.jpg (the 1200x630 social preview).

Originals are never modified, but they are moved: they live in uploads/_src/,
which Jekyll leaves out of the built site. That way a 3 MB photo stays in the
repo for re-cropping later without every visitor downloading it.

Needs Pillow:  pip install Pillow
"""

import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is not installed. Run: pip install Pillow")

Image.MAX_IMAGE_PIXELS = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "uploads", "_src")
PUB = os.path.join(ROOT, "uploads")
OUT = os.path.join(PUB, "opt")

# Drink photos render in a 4:5 card with object-fit:cover, so crop to 4:5 first
# and ship only the pixels that are actually visible.
DRINKS_4x5 = [
    "drink-gulabo-studio.png",
    "drink-chocolate.jpeg",
    "drink-montblanc-v2.jpeg",
    "drink-bananabread.jpeg",
    "drink-lavender.jpeg",
    "pour-cup.jpeg",
]
DRINK_WIDTHS = (320, 640)

# Full-bleed / background images keep their aspect ratio.
FULL_BLEED = {
    "hero-journey-web.jpeg": (480, 960, 1600),
    "pour-a.jpeg": (640, 1280),
}

# Logos are square with transparency, so the fallback stays PNG.
LOGOS = {
    "logo-cream.png": (128, 256),
    "artboard.png": (128, 256),
}

# Packaging renders: flat artwork with small bilingual type on it, so they need
# a higher quality than a photo would to keep the ingredient lines legible.
PRODUCT = {
    "pouch-masala-front.png": (250, 500),
    "pouch-rose-front.png": (250, 500),
}

# First frames of the two community clips, shown while the video is still
# loading. The clips themselves are only ~405px wide, so there is nothing to be
# gained by making the still that stands in for them any bigger than they are.
POSTERS = {
    "community-cart.png": (400,),
    "community-rose.png": (400,),
}

OG_SOURCE = "hero-journey-web.jpeg"


def resolve(name):
    """Find an original, and keep originals out of the published folder.

    Originals live in uploads/_src/. Jekyll ignores anything starting with an
    underscore, so they stay in the repo without being uploaded to every
    visitor — the site only ever serves the small copies in uploads/opt/.
    Dropping a new photo straight into uploads/ still works: it gets moved
    into _src/ the first time this runs.
    """
    src = os.path.join(SRC, name)
    if os.path.exists(src):
        return src
    stray = os.path.join(PUB, name)
    if os.path.exists(stray):
        os.makedirs(SRC, exist_ok=True)
        os.replace(stray, src)
        print(f"  moved {name} into uploads/_src/ (originals aren't published)")
        return src
    return None


def crop_to_ratio(im, rw, rh):
    """Centre-crop to the given aspect ratio (matches CSS object-fit: cover)."""
    target = rw / rh
    w, h = im.size
    if w / h > target:
        nw = round(h * target)
        left = (w - nw) // 2
        return im.crop((left, 0, left + nw, h))
    nh = round(w / target)
    top = (h - nh) // 2
    return im.crop((0, top, w, top + nh))


def emit(im, base, width, fallback_ext, quality):
    h = round(im.height * (width / im.width))
    resized = im.resize((width, h), Image.LANCZOS)
    resized.save(os.path.join(OUT, f"{base}-{width}.webp"), "WEBP",
                 quality=quality, method=6)
    if fallback_ext == "png":
        resized.save(os.path.join(OUT, f"{base}-{width}.png"), "PNG", optimize=True)
    else:
        resized.convert("RGB").save(os.path.join(OUT, f"{base}-{width}.jpg"), "JPEG",
                                    quality=quality, optimize=True, progressive=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    made = 0

    for name in DRINKS_4x5:
        path = resolve(name)
        if not path:
            print(f"  skip (missing): {name}")
            continue
        base = os.path.splitext(name)[0]
        # Always JPEG, whatever the original is. One of these arrived as a PNG
        # and its 640px fallback came out at 593 KB against 11 KB for the WebP
        # beside it — 55x the weight for the same picture.
        im = crop_to_ratio(Image.open(path).convert("RGB"), 4, 5)
        for w in DRINK_WIDTHS:
            emit(im, base, w, "jpg", 72)
        made += len(DRINK_WIDTHS)
        print(f"  4:5   {name} -> {', '.join(str(w) for w in DRINK_WIDTHS)}")

    for name, widths in FULL_BLEED.items():
        path = resolve(name)
        if not path:
            print(f"  skip (missing): {name}")
            continue
        base = os.path.splitext(name)[0]
        im = Image.open(path)
        for w in widths:
            emit(im, base, w, "jpg", 70)
        made += len(widths)
        print(f"  full  {name} -> {', '.join(str(w) for w in widths)}")

    for name, widths in LOGOS.items():
        path = resolve(name)
        if not path:
            print(f"  skip (missing): {name}")
            continue
        base = os.path.splitext(name)[0]
        im = Image.open(path).convert("RGBA")
        for w in widths:
            emit(im, base, w, "png", 82)
        made += len(widths)
        print(f"  logo  {name} -> {', '.join(str(w) for w in widths)}")

    for name, widths in PRODUCT.items():
        path = resolve(name)
        if not path:
            print(f"  skip (missing): {name}")
            continue
        base = os.path.splitext(name)[0]
        im = Image.open(path).convert("RGB")
        for w in widths:
            emit(im, base, w, "jpg", 84)
        made += len(widths)
        print(f"  pouch {name} -> {', '.join(str(w) for w in widths)}")

    for name, widths in POSTERS.items():
        path = resolve(name)
        if not path:
            print(f"  skip (missing): {name}")
            continue
        base = os.path.splitext(name)[0]
        im = Image.open(path).convert("RGB")
        for w in widths:
            emit(im, base, w, "jpg", 70)
        made += len(widths)
        print(f"  poster {name} -> {', '.join(str(w) for w in widths)}")

    # og-image.jpg is the one file in uploads/ that browsers fetch directly:
    # Facebook, X and iMessage read it straight off the <meta> tag.
    og_src = resolve(OG_SOURCE)
    if og_src:
        og = crop_to_ratio(Image.open(og_src), 1200, 630).resize((1200, 630), Image.LANCZOS)
        og.convert("RGB").save(os.path.join(PUB, "og-image.jpg"), "JPEG",
                               quality=82, optimize=True, progressive=True)
        print("  og    og-image.jpg (1200x630)")

    print(f"\nDone — {made} sized copies in uploads/opt/.")
    print("If you added a new drink photo, remember to reference the ORIGINAL")
    print("filename in _data/menu.yml (e.g. uploads/drink-cardamom.jpeg).")


if __name__ == "__main__":
    main()

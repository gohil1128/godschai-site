#!/usr/bin/env python3
"""Generate the small, fast copies of every image the site uses.

Run this after adding a photo to uploads/:

    python3 tools/optimize-images.py

It writes WebP + original-format fallbacks into uploads/opt/ at the widths the
pages ask for, and regenerates uploads/og-image.jpg (the 1200x630 social preview).
Originals in uploads/ are never modified.

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
SRC = os.path.join(ROOT, "uploads")
OUT = os.path.join(SRC, "opt")

# Drink photos render in a 4:5 card with object-fit:cover, so crop to 4:5 first
# and ship only the pixels that are actually visible.
DRINKS_4x5 = [
    "drink-gulabo-studio.png",
    "drink-chocolate.jpeg",
    "drink-montblanc-v2.jpeg",
    "drink-bananabread.jpeg",
    "drink-lavender.jpeg",
    "pour-cup.jpeg",          # also used as the video poster
]
DRINK_WIDTHS = (320, 640)

# Full-bleed / background images keep their aspect ratio.
FULL_BLEED = {
    "hero-journey-web.jpeg": (480, 960, 1600),
    "pour-a.jpeg": (640, 1280),
    "pour-c.jpeg": (480,),
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

OG_SOURCE = "hero-journey-web.jpeg"


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
        path = os.path.join(SRC, name)
        if not os.path.exists(path):
            print(f"  skip (missing): {name}")
            continue
        base, ext = os.path.splitext(name)
        fallback = "png" if ext.lower() == ".png" else "jpg"
        im = crop_to_ratio(Image.open(path), 4, 5)
        for w in DRINK_WIDTHS:
            emit(im, base, w, fallback, 72)
        made += len(DRINK_WIDTHS)
        print(f"  4:5   {name} -> {', '.join(str(w) for w in DRINK_WIDTHS)}")

    for name, widths in FULL_BLEED.items():
        path = os.path.join(SRC, name)
        if not os.path.exists(path):
            print(f"  skip (missing): {name}")
            continue
        base = os.path.splitext(name)[0]
        im = Image.open(path)
        for w in widths:
            emit(im, base, w, "jpg", 70)
        made += len(widths)
        print(f"  full  {name} -> {', '.join(str(w) for w in widths)}")

    for name, widths in LOGOS.items():
        path = os.path.join(SRC, name)
        if not os.path.exists(path):
            print(f"  skip (missing): {name}")
            continue
        base = os.path.splitext(name)[0]
        im = Image.open(path).convert("RGBA")
        for w in widths:
            emit(im, base, w, "png", 82)
        made += len(widths)
        print(f"  logo  {name} -> {', '.join(str(w) for w in widths)}")

    for name, widths in PRODUCT.items():
        path = os.path.join(SRC, name)
        if not os.path.exists(path):
            print(f"  skip (missing): {name}")
            continue
        base = os.path.splitext(name)[0]
        im = Image.open(path).convert("RGB")
        for w in widths:
            emit(im, base, w, "jpg", 84)
        made += len(widths)
        print(f"  pouch {name} -> {', '.join(str(w) for w in widths)}")

    og_src = os.path.join(SRC, OG_SOURCE)
    if os.path.exists(og_src):
        og = crop_to_ratio(Image.open(og_src), 1200, 630).resize((1200, 630), Image.LANCZOS)
        og.convert("RGB").save(os.path.join(SRC, "og-image.jpg"), "JPEG",
                               quality=82, optimize=True, progressive=True)
        print("  og    og-image.jpg (1200x630)")

    print(f"\nDone — {made} sized copies in uploads/opt/.")
    print("If you added a new drink photo, remember to reference the ORIGINAL")
    print("filename in _data/menu.yml (e.g. uploads/drink-cardamom.jpeg).")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Set the brand colour used for "God's" and the brush stroke under it.

    python3 tools/recolour-logo.py

Reads  uploads/_src/logo-cream-source.png   (cream lockup, for dark backgrounds)
       uploads/_src/artboard-source.png     (dark lockup, for light backgrounds)
Writes uploads/logo-cream.png
       uploads/artboard.png

Both files are flat two-ink artwork: "God's" and its brush stroke in one colour,
"CHAI" and the tagline in the other. Only the first is changed here, so the
static logo matches the animated one in the header — that one is tinted by CSS
in _includes/base-styles-dark.html, and BRAND must agree with the colour there.

A plain search-and-replace would leave a rust fringe on every edge, because the
pixels where the two inks meet are blends of them. Instead each pixel is read as
a mix of the two inks, and the mix is rebuilt with the new colour, so edges stay
clean at any size.

To change the brand colour: edit BRAND below, re-run this, then run
tools/optimize-images.py, and change the matching colour in
_includes/base-styles-dark.html.

Needs:  pip install numpy Pillow
"""

import os
import sys

try:
    import numpy as np
    from PIL import Image
except ImportError:
    sys.exit("Needs numpy and Pillow. Run: pip install numpy Pillow")

BRAND = (242, 169, 60)      # #F2A93C — the orange used across the site

OLD = (182, 96, 64)         # #B66040 — what the source artwork uses

# Each source, and the colour of the ink it is NOT changing.
FILES = [
    ("logo-cream-source.png", "logo-cream.png", (245, 233, 216)),   # #F5E9D8 cream
    ("artboard-source.png",   "artboard.png",   (59, 35, 23)),      # #3B2317 dark brown
]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "uploads", "_src")
OUT = os.path.join(ROOT, "uploads")


def main():
    old = np.array(OLD, dtype=np.float64)
    brand = np.array(BRAND, dtype=np.float64)

    for src_name, out_name, keep in FILES:
        path = os.path.join(SRC, src_name)
        if not os.path.exists(path):
            sys.exit("missing " + os.path.relpath(path, ROOT))

        im = np.asarray(Image.open(path).convert("RGBA"), dtype=np.float64)
        rgb, alpha = im[:, :, :3], im[:, :, 3:]
        keep = np.array(keep, dtype=np.float64)

        # How far along the keep -> old axis each pixel sits. 0 is pure keep,
        # 1 is pure old, and the values between are the antialiased edges.
        axis = old - keep
        t = np.sum((rgb - keep) * axis, axis=2) / np.dot(axis, axis)
        t = np.clip(t, 0.0, 1.0)[:, :, None]

        out = keep + t * (brand - keep)
        out = np.concatenate([out, alpha], axis=2).round().clip(0, 255).astype(np.uint8)
        Image.fromarray(out, "RGBA").save(os.path.join(OUT, out_name), "PNG", optimize=True)
        print(f"  {out_name}: #{OLD[0]:02X}{OLD[1]:02X}{OLD[2]:02X} -> "
              f"#{BRAND[0]:02X}{BRAND[1]:02X}{BRAND[2]:02X}")

    print("\nNow run:  python3 tools/optimize-images.py")


if __name__ == "__main__":
    main()

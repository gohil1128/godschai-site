#!/usr/bin/env python3
"""Build the browser-tab icon from the G in the logo.

    python3 tools/make-favicon.py

The G is taken straight out of assets/_src/logo-sting-original.js, where the
animation keeps each stroke of the lockup as its own alpha mask — so this is
literally the logo's own letterform, drip and all, not a look-alike.

Writes favicon.ico (16/32/48), favicon-32.png and apple-touch-icon.png.

Dark G on a marigold tile, the same pairing as the @godschai pill. A bare
letterform was tried and is too faint on a white tab strip at 16px; the filled
tile keeps its silhouette at every size, light background or dark.

Re-run after changing BRAND or dropping in a new logo-sting export.

Needs Pillow:  pip install Pillow
"""

import base64
import io
import os
import re
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow is not installed. Run: pip install Pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "_src", "logo-sting-original.js")

BRAND = (242, 169, 60, 255)   # #F2A93C marigold tile
INK = (43, 27, 18, 255)       # #2B1B12 the on-accent dark used across the site

PAD = 0.15                    # breathing room around the G inside the tile
RADIUS = 0.22                 # corner radius as a fraction of the tile
SUPERSAMPLE = 8               # draw big, shrink down: keeps the brush edges clean


def load_g():
    """The G stroke's alpha mask, out of the animation's inlined layer data."""
    js = open(SRC, encoding="utf-8").read()
    m = re.search(r'"G":\{[^}]*"src":"data:image/png;base64,([A-Za-z0-9+/=]+)"\}', js)
    if not m:
        sys.exit("could not find the G layer in " + os.path.relpath(SRC, ROOT))
    return Image.open(io.BytesIO(base64.b64decode(m.group(1)))).convert("RGBA").split()[-1]


def tile(alpha, size, radius=RADIUS, pad=PAD):
    s = size * SUPERSAMPLE
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1],
                                           radius=int(s * radius), fill=255)
    plate = Image.new("RGBA", (s, s), BRAND)
    plate.putalpha(mask)
    im.alpha_composite(plate)

    box = int(s * (1 - 2 * pad))
    scale = min(box / alpha.width, box / alpha.height)
    a = alpha.resize((max(1, round(alpha.width * scale)),
                      max(1, round(alpha.height * scale))), Image.LANCZOS)
    g = Image.new("RGBA", a.size, INK)
    g.putalpha(a)
    im.alpha_composite(g, ((s - a.width) // 2, (s - a.height) // 2))

    return im.resize((size, size), Image.LANCZOS)


def main():
    alpha = load_g()

    ico = os.path.join(ROOT, "favicon.ico")
    tile(alpha, 48).save(ico, sizes=[(16, 16), (32, 32), (48, 48)])
    print("  favicon.ico          16, 32, 48")

    png32 = os.path.join(ROOT, "favicon-32.png")
    tile(alpha, 32).save(png32, "PNG", optimize=True)
    print("  favicon-32.png       32")

    # iOS masks its own rounded corners on, so this one is a full square with a
    # little more padding, and no transparency for it to composite badly.
    apple = Image.new("RGB", (180, 180), BRAND[:3])
    apple.paste(tile(alpha, 180, radius=0, pad=0.20).convert("RGB"), (0, 0))
    apple.save(os.path.join(ROOT, "apple-touch-icon.png"), "PNG", optimize=True)
    print("  apple-touch-icon.png 180")

    for f in (ico, png32, os.path.join(ROOT, "apple-touch-icon.png")):
        print(f"    {os.path.basename(f):22s} {os.path.getsize(f) / 1024:5.1f} KB")


if __name__ == "__main__":
    main()

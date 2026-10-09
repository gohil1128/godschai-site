#!/usr/bin/env python3
"""Build the still logos in the pouch's colours.

    python3 tools/build-logo.py
    python3 tools/optimize-images.py      # then publish the small copies

The lockup is drawn straight from the animated logo's own strokes
(assets/_src/logo-sting-original.js keeps each one as an alpha mask on a 2048
canvas), so every still is the same artwork as the header animation, and each
part can have its own colour, like on the pouch:

    "God's"          rust   #B6502B
    brush stroke     gold   #D3A849
    "CHAI" + tagline cream  #F3E8D3 on dark backgrounds,
                     brown  #4A2A1F on light ones (the front of the pouch)

Writes
    uploads/_src/logo-cream.png         for dark backgrounds (header, footer, emails)
    uploads/_src/artboard.png           for light backgrounds (search results)
    receipt-kit/square-logo-cream.png   the pouch front, on cream, for Square
    receipt-kit/square-logo-rust.png    the pouch back, on rust, for Square

The header animation is tinted to match by CSS in
_includes/base-styles-dark.html; change a colour here and change it there too.

Needs Pillow:  pip install Pillow
"""

import base64
import io
import os
import re
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is not installed. Run: pip install Pillow")

RUST = (182, 80, 43)        # #B6502B  "God's", sampled from the pouch
GOLD = (211, 168, 73)       # #D3A849  the brush stroke under it
CREAM = (243, 232, 211)     # #F3E8D3  the site's cream, for CHAI on dark
BROWN = (74, 42, 31)        # #4A2A1F  CHAI on the front of the pouch
POUCH = (238, 224, 194)     # #EEE0C2  the pouch's cream background

SCRIPT = ("G", "od", "apos", "s")
SWASH = ("swash",)
CHAI = ("C", "H", "A", "iStem", "iDot", "pill")
CANVAS = 2048

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "_src", "logo-sting-original.js")


def load_layers():
    """{name: (x, y, alpha mask)} out of the animation's inlined layer data."""
    js = open(SRC, encoding="utf-8").read()
    layers = {}
    for m in re.finditer(r'"(\w+)":\{"x":(\d+),"y":(\d+),"w":(\d+),"h":(\d+),'
                         r'"src":"data:image/png;base64,([A-Za-z0-9+/=]+)"\}', js):
        name, x, y, w, h, b64 = m.groups()
        im = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGBA")
        alpha = im.split()[-1].resize((int(w), int(h)), Image.LANCZOS)
        layers[name] = (int(x), int(y), alpha)
    missing = [n for n in SCRIPT + SWASH + CHAI if n not in layers]
    if missing:
        sys.exit("missing logo layers in the animation export: " + ", ".join(missing))
    return layers


def lockup(layers, script, swash, chai):
    """The full lockup on a transparent 2048 canvas, one colour per part."""
    out = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    for names, colour in ((CHAI, chai), (SWASH, swash), (SCRIPT, script)):
        for n in names:
            x, y, alpha = layers[n]
            ink = Image.new("RGBA", alpha.size, colour + (255,))
            ink.putalpha(alpha)
            out.alpha_composite(ink, (x, y))
    return out


def tile(art, background, size=1024):
    im = Image.new("RGBA", (CANVAS, CANVAS), background + (255,))
    im.alpha_composite(art)
    return im.convert("RGB").resize((size, size), Image.LANCZOS)


def main():
    layers = load_layers()
    on_dark = lockup(layers, RUST, GOLD, CREAM)
    on_light = lockup(layers, RUST, GOLD, BROWN)
    pouch_back = lockup(layers, CREAM, GOLD, CREAM)

    outputs = [
        (on_dark, os.path.join("uploads", "_src", "logo-cream.png")),
        (on_light, os.path.join("uploads", "_src", "artboard.png")),
        (tile(on_light, POUCH), os.path.join("receipt-kit", "square-logo-cream.png")),
        (tile(pouch_back, RUST), os.path.join("receipt-kit", "square-logo-rust.png")),
    ]
    for im, rel in outputs:
        im.save(os.path.join(ROOT, rel), "PNG", optimize=True)
        print(f"  {rel}")
    print("\nNow run:  python3 tools/optimize-images.py")


if __name__ == "__main__":
    main()

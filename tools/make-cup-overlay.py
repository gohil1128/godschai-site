#!/usr/bin/env python3
"""Draw the cup the colour guide's chai sits in: uploads/cup-overlay.png.

A white ceramic cup seen from above, with the chai's surface left see-through
so the page can put any colour of chai under it (and darken it live while the
simmer timer runs). Everything that makes it read as real lives in this one
transparent layer: the rim and inside wall, the shadow the rim casts on the
chai, the meniscus line, a ring of small bubbles at the edge, a soft window
reflection and a very fine skin texture.

    python3 tools/make-cup-overlay.py

Needs Pillow and numpy. Also writes the WebP copy, uploads/opt/cup-overlay.webp.
"""
import os
import numpy as np
from PIL import Image, ImageFilter

S = 1024                      # drawn big, then halved for smooth edges
OUT = 448                     # the biggest cup is 220px wide: 2x for sharp screens
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(7)

y, x = np.mgrid[0:S, 0:S].astype(np.float32)
c = S / 2
dx, dy = (x - c) / c, (y - c) / c
r = np.hypot(dx, dy)
ang = np.arctan2(dy, dx)
# light from the top left
lit = -(dx * 0.7071 + dy * 0.7071)                 # +1 toward the light

R_OUT, R_IN, R_LIQ = 0.985, 0.875, 0.80           # rim outside, rim inside, chai surface

rgba = np.zeros((S, S, 4), np.float32)             # straight (non-premultiplied) colour + alpha

def over(mask, color, alpha):
    """Composite a colour at a per-pixel alpha over what's there."""
    a = np.clip(alpha * mask, 0, 1)[..., None]
    col = np.broadcast_to(np.array(color, np.float32) / 255, rgba[..., :3].shape)
    out_a = a + rgba[..., 3:4] * (1 - a)
    rgb = (col * a + rgba[..., :3] * rgba[..., 3:4] * (1 - a)) / np.maximum(out_a, 1e-6)
    rgba[..., :3] = rgb
    rgba[..., 3:4] = out_a

def ring(r0, r1, soft=0.004):
    return np.clip((r - r0) / soft, 0, 1) * np.clip((r1 - r) / soft, 0, 1)

# 1. the ceramic: rim top (flat, bright) and the inside wall falling to the chai
rim = ring(R_IN, R_OUT, 0.003)
shade = 0.93 + 0.07 * lit                          # lighter toward the light
cer = np.stack([248 * shade, 243 * shade, 234 * shade], -1)
for i in range(3):
    rgba[..., i] = np.where(rim > 0, cer[..., i] / 255, rgba[..., i])
rgba[..., 3] = np.maximum(rgba[..., 3], rim)
# a soft glaze highlight along the lit side of the rim
over(ring(R_IN + 0.02, R_OUT - 0.015, 0.02) * np.clip(lit, 0, 1) ** 2, (255, 255, 255), 0.55)
# the rim's outer lip, a hair darker
over(ring(R_OUT - 0.012, R_OUT, 0.004), (205, 196, 184), 0.6)

wall = ring(R_LIQ, R_IN, 0.003)
t = np.clip((r - R_LIQ) / (R_IN - R_LIQ), 0, 1)    # 0 at the chai, 1 at the rim
# the wall facing the light (the far side, bottom right) is bright; the near wall is in shade
wall_lit = np.clip(-lit, 0, 1)
wall_col = 0.72 + 0.22 * t + 0.10 * wall_lit
w = np.stack([236 * wall_col, 229 * wall_col, 219 * wall_col], -1)
for i in range(3):
    rgba[..., i] = np.where(wall > 0, np.clip(w[..., i], 0, 255) / 255, rgba[..., i])
rgba[..., 3] = np.maximum(rgba[..., 3], wall)

# 2. on the chai itself (everything below is translucent, over the page's colour)
liq = np.clip((R_LIQ - r) / 0.003, 0, 1)
# depth: darker toward the edge, most on the near (lit) side where the rim shades it
edge = np.clip((r - 0.45) / (R_LIQ - 0.45), 0, 1) ** 2.2
over(liq * edge, (40, 20, 8), 0.42)
over(liq * np.clip((r - 0.66) / 0.14, 0, 1) * np.clip(lit, 0, 1), (30, 15, 5), 0.30)
# a fine skin texture (milk proteins), very faint
noise = Image.fromarray((rng.random((S // 4, S // 4)) * 255).astype(np.uint8)).resize((S, S), Image.BICUBIC)
noise = np.asarray(noise.filter(ImageFilter.GaussianBlur(3)), np.float32) / 255 - 0.5
over(liq * np.clip(noise, 0, 1) * 2, (255, 246, 232), 0.10)
over(liq * np.clip(-noise, 0, 1) * 2, (40, 20, 8), 0.10)
# the meniscus: a thin bright line where the chai meets the cup
over(ring(R_LIQ - 0.012, R_LIQ, 0.004), (255, 244, 226), 0.45)
over(ring(R_LIQ - 0.03, R_LIQ - 0.012, 0.006), (60, 30, 12), 0.22)

# 3. a ring of small bubbles hugging the edge, thicker on one side
bub = Image.new("L", (S, S), 0)
bub_dark = Image.new("L", (S, S), 0)
from PIL import ImageDraw
db, dd = ImageDraw.Draw(bub), ImageDraw.Draw(bub_dark)
for _ in range(560):
    a = rng.uniform(-np.pi, np.pi)
    side = 0.55 + 0.45 * np.cos(a - 2.2)            # more bubbles down one side
    if rng.random() > side:
        continue
    rr = R_LIQ - 0.012 - abs(rng.normal(0, 0.022)) * (0.6 + side)
    size = abs(rng.normal(0, 1)) * 5.0 + 1.6
    bx, by = c + np.cos(a) * rr * c, c + np.sin(a) * rr * c
    dd.ellipse([bx - size - 1.2, by - size - 1.2, bx + size + 1.2, by + size + 1.2], fill=150)
    db.ellipse([bx - size, by - size, bx + size, by + size], fill=200)
    # each bubble catches the light on its top-left
    db.ellipse([bx - size * 0.55, by - size * 0.55, bx - size * 0.05, by - size * 0.05], fill=255)
bub = np.asarray(bub.filter(ImageFilter.GaussianBlur(0.8)), np.float32) / 255
bub_dark = np.asarray(bub_dark.filter(ImageFilter.GaussianBlur(1.0)), np.float32) / 255
over(liq * bub_dark, (45, 22, 8), 0.28)
over(liq * bub, (255, 247, 235), 0.55)

# 4. the window: a soft, slightly curved reflection on the surface
ref = Image.new("L", (S, S), 0)
ImageDraw.Draw(ref).ellipse([c - 0.52 * c, c - 0.60 * c, c - 0.08 * c, c - 0.40 * c], fill=255)
ref = ref.rotate(-28, center=(c - 0.30 * c, c - 0.50 * c)).filter(ImageFilter.GaussianBlur(22))
ref = np.asarray(ref, np.float32) / 255
over(liq * ref, (255, 252, 246), 0.30)
over(liq * np.clip(1 - r / 0.35, 0, 1) ** 2, (255, 250, 240), 0.06)   # a faint glow in the middle

img = Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8), "RGBA").resize((OUT, OUT), Image.LANCZOS)
dst = os.path.join(ROOT, "uploads", "cup-overlay.png")
# WebP is what browsers use; the full-depth PNG is only the fallback for very old ones
# (256 colours would band the soft shading)
img.save(dst, optimize=True)
os.makedirs(os.path.join(ROOT, "uploads", "opt"), exist_ok=True)
webp = os.path.join(ROOT, "uploads", "opt", "cup-overlay.webp")
img.save(webp, "WEBP", quality=72, method=6)
print("wrote", dst, "and", webp, img.size)

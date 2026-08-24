#!/usr/bin/env python3
"""Rebuild the home page's logo animation from its master file.

    python3 tools/recolour-sting.py uploads/_src/logo-sting-master.mp4

The master is the logo sting as it was delivered: cream background, terracotta
"God's", near-black brown "CHAI" and tagline pill. Dropped onto the site as-is
that cream background reads as a pale box sitting on a dark page, so this script
turns it into the brand's dark-background lockup instead — the same treatment as
uploads/logo-cream.png in the header and footer — and bakes in the exact colour
of the strip it sits on, so the video has no visible edge.

How the recolouring works: the sting is flat artwork, and its first frame is the
bare background plate. For every later frame,

    pixel = a*ink + (1 - a)*bg      so      bg - pixel = a*(bg - ink)

Comparing the direction of that difference against the two known ink deltas says
which ink laid the pixel down, and projecting onto it recovers the coverage —
antialiased edges and half-faded letters included.

Writes uploads/logo-sting.{mp4,webm,png}. Run tools/optimize-images.py after.

Needs:  pip install imageio-ffmpeg numpy Pillow
"""

import os
import shutil
import subprocess
import sys
import tempfile

# ---------------------------------------------------------------------------
# Everything below is cut to THIS master file. A different animation will need
# these adjusted.
# ---------------------------------------------------------------------------

# Square crop taken out of the 1920x1080 master, sized so nothing the animation
# does ever leaves the frame, then scaled down to what the page actually needs.
CROP = "crop=880:880:522:90"
SCALE = 640

# The master ends by shrinking the logo away to an empty frame. Stop before that
# so the loop always has a finished lockup to rest on.
TRIM_SECONDS = 5.53

# Extra seconds of held lockup added to the end, so the loop breathes instead of
# restarting the moment it finishes.
HOLD_SECONDS = 1.5

# The two inks in the master, sampled from the artwork.
INK_TERRACOTTA = (182, 96, 64)    # #B66040  the "God's" script
INK_BROWN = (58, 34, 20)          # #3A2214  "CHAI" and the tagline pill

# What they become on a dark background. These are uploads/logo-cream.png's own
# colours, so the animation ends on exactly the lockup used in the header.
OUT_TERRACOTTA = (182, 96, 64)    # #B66040  unchanged
OUT_BROWN = (245, 233, 216)       # #F5E9D8  cream

# Which ink is which: the brown drops red almost as hard as it drops blue, the
# terracotta barely touches red. Anything above this ratio is brown.
BROWN_RATIO = 0.62

# The colour of the strip behind the animation in index.html. This is baked into
# the video, and it is what makes the rectangle invisible — so if you change one
# you must change the other.
BAND = (29, 18, 11)               # #1D120B going in...
BAND_DECODED = (28, 18, 9)        # #1C1209 coming back out of the encoders

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "uploads")

COLOUR_TAGS = ["-color_primaries", "bt709", "-color_trc", "bt709",
               "-colorspace", "bt709", "-color_range", "tv"]


def find_ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
    exe = shutil.which("ffmpeg")
    if not exe:
        sys.exit("ffmpeg not found. Run: pip install imageio-ffmpeg")
    return exe


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__.strip().splitlines()[2].strip())
    src = sys.argv[1]
    if not os.path.exists(src):
        sys.exit("no such file: " + src)

    try:
        import numpy as np
        from PIL import Image
    except ImportError:
        sys.exit("Needs numpy and Pillow. Run: pip install numpy Pillow")

    ff = find_ffmpeg()
    tmp = tempfile.mkdtemp(prefix="sting-")
    frames_dir = os.path.join(tmp, "src")
    flat_dir = os.path.join(tmp, "flat")
    os.makedirs(frames_dir)
    os.makedirs(flat_dir)

    print("1/4  pulling frames out of", os.path.basename(src))
    run([ff, "-hide_banner", "-loglevel", "error", "-y", "-i", src,
         "-t", str(TRIM_SECONDS),
         "-vf", "%s,scale=%d:%d:flags=lanczos" % (CROP, SCALE, SCALE),
         os.path.join(frames_dir, "%04d.png")])

    names = sorted(os.listdir(frames_dir))
    if not names:
        sys.exit("ffmpeg produced no frames — check the crop and trim settings")

    print("2/4  recolouring %d frames for a dark background" % len(names))
    bg = np.asarray(Image.open(os.path.join(frames_dir, names[0])).convert("RGB"),
                    dtype=np.float64)
    d_brown = bg - np.array(INK_BROWN, dtype=np.float64)
    d_terra = bg - np.array(INK_TERRACOTTA, dtype=np.float64)
    den_brown = np.maximum(np.sum(d_brown * d_brown, axis=2), 1e-9)
    den_terra = np.maximum(np.sum(d_terra * d_terra, axis=2), 1e-9)
    band = np.array(BAND, dtype=np.float64)

    for i, name in enumerate(names):
        img = np.asarray(Image.open(os.path.join(frames_dir, name)).convert("RGB"),
                         dtype=np.float64)
        d = bg - img
        is_brown = (d[:, :, 0] / np.maximum(d[:, :, 2], 1e-6)) > BROWN_RATIO

        alpha = np.where(is_brown,
                         np.sum(d * d_brown, axis=2) / den_brown,
                         np.sum(d * d_terra, axis=2) / den_terra)
        alpha = np.clip(alpha, 0.0, 1.0)
        alpha[alpha < 0.012] = 0.0            # ignore noise in the plate
        alpha = alpha[:, :, None]

        ink = np.where(is_brown[:, :, None],
                       np.array(OUT_BROWN, dtype=np.float64),
                       np.array(OUT_TERRACOTTA, dtype=np.float64))
        out = alpha * ink + (1.0 - alpha) * band
        Image.fromarray(out.round().clip(0, 255).astype(np.uint8), "RGB").save(
            os.path.join(flat_dir, "%04d.png" % i))

    pattern = os.path.join(flat_dir, "%04d.png")
    vf = "tpad=stop_mode=clone:stop_duration=%s,format=yuv420p" % HOLD_SECONDS

    print("3/4  encoding mp4 + webm")
    run([ff, "-hide_banner", "-loglevel", "error", "-y", "-framerate", "30",
         "-i", pattern, "-vf", vf] + COLOUR_TAGS +
        ["-c:v", "libx264", "-profile:v", "high", "-crf", "23", "-preset", "slow",
         "-g", "60", "-movflags", "+faststart", "-an",
         os.path.join(OUT_DIR, "logo-sting.mp4")])
    run([ff, "-hide_banner", "-loglevel", "error", "-y", "-framerate", "30",
         "-i", pattern, "-vf", vf] + COLOUR_TAGS +
        ["-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-row-mt", "1",
         "-deadline", "good", "-cpu-used", "2", "-an",
         os.path.join(OUT_DIR, "logo-sting.webm")])

    print("4/4  saving the last frame as the still")
    # The encoders hand the flat background back a shade off what went in, so the
    # still is nudged to match them — otherwise the stopped state would sit a
    # unit or two away from the video and the band.
    last = Image.open(os.path.join(flat_dir, "%04d.png" % (len(names) - 1))).convert("RGB")
    px = last.load()
    for y in range(last.height):
        for x in range(last.width):
            if px[x, y] == BAND:
                px[x, y] = BAND_DECODED
    last.save(os.path.join(OUT_DIR, "logo-sting.png"), "PNG", optimize=True)

    shutil.rmtree(tmp, ignore_errors=True)

    print("\nWrote uploads/logo-sting.mp4, .webm and .png.")
    print("Now run:  python3 tools/optimize-images.py")
    print("If you changed BAND/BAND_DECODED, change the matching #1C1209 in")
    print("index.html and assets/js/site.js too.")


if __name__ == "__main__":
    main()

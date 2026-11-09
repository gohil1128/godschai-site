#!/usr/bin/env bash
# Build every site icon from the app-icon artwork: the glossy God's Chai tile,
# recoloured from gold to beige (see TINT below).
#
#     bash tools/make-icons.sh
#
# Source: uploads/_src/app-icon-source.png (the tile on a cream page). The
# tile is cut out, its corners made see-through, and saved at each size:
#
#   favicon.ico            16/32/48   browser tabs, and the icon next to the
#   favicon-48.png …-192   (PNG)      site in Google results (Google wants a
#                                     multiple of 48px)
#   apple-touch-icon.png   180, square, no see-through corners (iPhone home
#                                     screen rounds it itself)
#   uploads/opt/app-icon-512.png      the logo Google reads from the site's
#                                     business details, and the web app icon
#
# New artwork with the tile somewhere else on the page? Change CROP below:
# WIDTHxHEIGHT+LEFT+TOP of the flat gold tile, just inside its shiny rim.
# Needs ImageMagick (convert).
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=uploads/_src/app-icon-source.png
CROP=720x720+600+180     # the tile in the 1920x1080 source
RADIUS=158               # its rounded corners, in source pixels
# Tab and search-result icons are 16-48px, where the whole tile leaves the
# lettering a smudge: those are cut closer around the logo instead.
SMALL=540x540+693+275
SMALL_RADIUS=118
# The artwork's tile is gold. The icons use the same glossy tile in beige: the
# colours are turned down and lightened (TINT = brightness,saturation for
# ImageMagick's -modulate) everywhere except the dark lettering, so the shine and
# shading stay. For the original gold, set TINT="100,100".
TINT="135,58"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# recolor IN OUT: tile colour changed, dark lettering kept as drawn.
recolor() {
  convert "$1" -colorspace Gray -level 22%,48% -negate -blur 0x0.8 "$TMP/mask.png"
  convert "$1" -modulate "$TINT,100" "$TMP/tinted.png"
  convert "$TMP/tinted.png" "$1" "$TMP/mask.png" -composite "$2"
}

convert "$SRC" -crop "$CROP" +repage "$TMP/square-gold.png"
recolor "$TMP/square-gold.png" "$TMP/square.png"
convert "$TMP/square.png" \
  \( -size 720x720 xc:none -fill white -draw "roundrectangle 0,0,719,719,$RADIUS,$RADIUS" \) \
  -alpha set -compose DstIn -composite "$TMP/tile.png"

convert "$SRC" -crop "$SMALL" +repage "$TMP/close-gold.png"
recolor "$TMP/close-gold.png" "$TMP/close-flat.png"
convert "$TMP/close-flat.png" \
  \( -size 540x540 xc:none -fill white -draw "roundrectangle 0,0,539,539,$SMALL_RADIUS,$SMALL_RADIUS" \) \
  -alpha set -compose DstIn -composite "$TMP/close.png"
for s in 16 32 48; do
  convert "$TMP/close.png" -filter Lanczos -resize ${s}x${s} -strip "$TMP/tile-$s.png"
done
for s in 96 144 192 512; do
  convert "$TMP/tile.png" -filter Lanczos -resize ${s}x${s} -strip "$TMP/tile-$s.png"
done
# The two smallest get a touch of sharpening, so the lettering stays crisp.
convert "$TMP/tile-16.png" -unsharp 0x0.6+0.6+0 "$TMP/tile-16.png"
convert "$TMP/tile-32.png" -unsharp 0x0.6+0.5+0 "$TMP/tile-32.png"

convert "$TMP/tile-16.png" "$TMP/tile-32.png" "$TMP/tile-48.png" favicon.ico
cp "$TMP/tile-32.png" favicon-32.png
cp "$TMP/tile-48.png" favicon-48.png
cp "$TMP/tile-96.png" favicon-96.png
cp "$TMP/tile-144.png" favicon-144.png
cp "$TMP/tile-192.png" favicon-192.png
cp "$TMP/tile-512.png" uploads/opt/app-icon-512.png
GOLD=$(convert "$TMP/square.png" -format "#%[hex:p{120,360}]" info: | cut -c1-7)   # the tile's own colour
convert -size 720x720 "xc:$GOLD" "$TMP/tile.png" -compose over -composite \
  -filter Lanczos -resize 180x180 -depth 8 -strip apple-touch-icon.png
echo "icons written"

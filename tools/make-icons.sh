#!/usr/bin/env bash
# Build every site icon: a glossy off-white tile with the God's Chai logo on it,
# laid out like the "GC Tasks" app icon (see TILE and LOGO below).
#
#     bash tools/make-icons.sh
#
# Sources: uploads/_src/app-icon-source.png (a glossy tile, gold, with the old
# lettering) for the tile's light and shade, and uploads/_src/artboard.png (the
# logo, 2048px) for the logo. The tile is cut out, its old lettering removed, the
# logo put on, its corners made see-through, and saved at each size:
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
# Tab and search-result icons are 16-48px, where the whole tile would leave the
# lettering small: those are cut a little closer around the logo instead.
SMALL=600x600+60+60        # inside the tile above (720px)
SMALL_RADIUS=132
# The artwork's tile is gold. The icons use the same tile in the off-white of the
# "GC Tasks" app icon (#F2EFE8), with a glossy finish: the tile's own light and
# shade are kept (softened), a soft sheen sits across the top, and the bottom
# darkens gently. The dark lettering is left as drawn. To change the colour, edit
# TILE (red, green, blue as 0 to 1); the sheen is SHEEN (0 to 1) and the bottom
# darkening is SHADE.
TILE="0.953 0.941 0.914"   # about #F3F0E9 before the shading, which lands on #F2EFE8
SHEEN=0.62
SHADE=0.075
FLAT=80x100+60+300         # a patch of plain tile in the artwork, to measure its brightness
# The logo, as on the GC Tasks icon: "God's" and its underline in rust, "CHAI" in
# dark brown, no tagline, about 68% of the tile wide and centred. LOGO_CROP is the
# logo without the tagline inside the 2048px artboard.
LOGO=uploads/_src/artboard.png
LOGO_CROP=1123x1086+463+370
LOGO_W=492                 # px of the 720px tile
LOGO_DY=2                  # nudge down, px
LOGO_DARK="#362218"
LOGO_RUST="#AC6040"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# The tile: the old lettering taken out (filled with the tile's own colour),
# then recoloured and glossed once, at full size (720px).
convert "$SRC" -crop "$CROP" +repage "$TMP/orig.png"
convert "$TMP/orig.png" -colorspace Gray -level 22%,48% -negate -blur 0x0.8 "$TMP/mask.png"   # the old lettering
convert "$TMP/mask.png" -threshold 25% -morphology Dilate Disk:16 -blur 0x4 "$TMP/gone.png"
FLATRGB=$(convert "$TMP/orig.png" -crop "$FLAT" +repage -scale 1x1 -format "rgb(%[fx:round(255*p{0,0}.r)],%[fx:round(255*p{0,0}.g)],%[fx:round(255*p{0,0}.b)])" info:)
convert "$TMP/orig.png" \( -size 720x720 "xc:$FLATRGB" \) "$TMP/gone.png" -composite "$TMP/clean.png"
G0=$(convert "$TMP/clean.png" -crop "$FLAT" +repage -colorspace Gray -scale 1x1 -format "%[fx:p{0,0}.r]" info:)
i=0
for T in $TILE; do
  # the tile's light and shade relative to its plain colour: shade softened, highlights kept
  convert "$TMP/clean.png" -colorspace Gray -depth 16 \
    -fx "qq=u/$G0; qq=(qq<1)?(1-(1-qq)*0.5):qq; hl=(qq>1)?min(1,(qq-1)*1.6):0; bs=min(qq,1); $T*bs+(1-$T*bs)*hl" "$TMP/ch$i.png"
  i=$((i+1))
done
convert "$TMP/ch0.png" "$TMP/ch1.png" "$TMP/ch2.png" -combine -depth 8 "$TMP/tinted.png"
# the gloss: the bottom darkens gently, and a soft sheen lies across the top
convert -size 720x720 gradient:white-black -depth 16 \
  -fx "tt=(1-u); sh=clamp((tt-0.5)/0.5); 1-$SHADE*sh*sh" "$TMP/shade.png"
convert -size 720x720 xc:none -fill "rgba(255,255,255,$SHEEN)" -draw "ellipse 360,-150 470,360 0,360" -blur 0x28 "$TMP/sheen.png"
convert "$TMP/tinted.png" "$TMP/shade.png" -compose Multiply -composite "$TMP/sheen.png" -compose Over -composite "$TMP/glossy.png"

# The logo: warm pixels (God's and its underline) in rust, the rest (CHAI) in dark brown.
LW=${LOGO_CROP%%x*}; LH=${LOGO_CROP#*x}; LH=${LH%%+*}
convert "$LOGO" -crop "$LOGO_CROP" +repage "$TMP/logo-crop.png"
convert "$TMP/logo-crop.png" -alpha extract "$TMP/la.png"
convert "$TMP/logo-crop.png" -alpha off -fx "clamp((r-b-0.23)/0.10)" -colorspace Gray "$TMP/lw.png"
convert "$TMP/la.png" \( "$TMP/lw.png" -negate \) -compose Multiply -composite "$TMP/lda.png"
convert "$TMP/la.png" "$TMP/lw.png" -compose Multiply -composite "$TMP/lwa.png"
convert -size ${LW}x${LH} "xc:$LOGO_DARK" "$TMP/lda.png" -alpha off -compose CopyOpacity -composite "$TMP/ld.png"
convert -size ${LW}x${LH} "xc:$LOGO_RUST" "$TMP/lwa.png" -alpha off -compose CopyOpacity -composite "$TMP/lr.png"
convert "$TMP/lr.png" "$TMP/ld.png" -compose Over -composite -filter Lanczos -resize "${LOGO_W}x" "$TMP/logo.png"
convert "$TMP/glossy.png" "$TMP/logo.png" -gravity center -geometry "+0+$LOGO_DY" -compose Over -composite "$TMP/square.png"
convert "$TMP/square.png" \
  \( -size 720x720 xc:none -fill white -draw "roundrectangle 0,0,719,719,$RADIUS,$RADIUS" \) \
  -alpha set -compose DstIn -composite "$TMP/tile.png"

# The closer cut for the 16-48px icons, taken from the finished tile.
convert "$TMP/square.png" -crop "$SMALL" +repage "$TMP/close-flat.png"
convert "$TMP/close-flat.png" \
  \( -size 600x600 xc:none -fill white -draw "roundrectangle 0,0,599,599,$SMALL_RADIUS,$SMALL_RADIUS" \) \
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
FLATCOLOR=$(convert "$TMP/square.png" -crop 30x100+40+300 +repage -scale 1x1 -format "#%[hex:p{0,0}]" info: | cut -c1-7)   # the tile's own colour
convert -size 720x720 "xc:$FLATCOLOR" "$TMP/tile.png" -compose over -composite \
  -filter Lanczos -resize 180x180 -depth 8 -strip apple-touch-icon.png
echo "icons written"

"""Prepares the school's aerial photos that end the intro zoom (assets/intro/campus-*).

The intro falls from space through the satellite images to the neighbourhood,
then dives into a straight-down drone photo of the campus and ends on an angled
"hero" shot under the "Bangalore International School presents" caption.

Usage:
  python3 tools/intro-imagery/campus-photos.py TOP WIDE TALL HEADING

  TOP      a straight-down (or nearly) photo of the campus
  WIDE     the angled hero shot for landscape screens
  TALL     the angled hero shot for portrait screens (can be the same file as WIDE)
  HEADING  the compass bearing the top of TOP faces, in degrees (0 = north,
           90 = east). The satellite zoom turns to this heading on its way down,
           so the dive into the photo lines up. For the photos supplied in
           October 2026 it's 120: the top of the photos faces east-south-east.

Writes each photo at two sizes as AVIF and WebP, a copy of TOP turned upright
for portrait screens, and assets/intro/campus-photos.json, then: node build.js
"""

import json
import os
import sys

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'intro')
LONG_SIDES = [1280, 1920]  # the photo's longer side; the page picks the one that covers the screen


def save(img, name):
    """Writes `img` at each size (never enlarged); returns the sizes written."""
    sizes = []
    for long_side in LONG_SIDES:
        scale = min(1, long_side / max(img.size))
        s = round(max(img.size) * scale)
        if s in sizes:
            continue
        im = img if scale == 1 else img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
        im.save(os.path.join(OUT, f'{name}-{s}.avif'), quality=58, speed=4)
        im.save(os.path.join(OUT, f'{name}-{s}.webp'), quality=80, method=6)
        sizes.append(s)
    return sizes


def main():
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    top, wide, tall = (ImageOps.exif_transpose(Image.open(p)).convert('RGB') for p in sys.argv[1:4])
    heading = float(sys.argv[4])
    manifest = {
        'heading': heading,
        # Landscape screens show TOP as it is, so the satellite view turns to `heading`.
        # Portrait screens show it turned a quarter clockwise, so its left edge (heading - 90)
        # is up and the long campus fits the tall screen.
        'top': {'size': list(top.size), 'sizes': save(top, 'campus-top')},
        'topTall': {'size': [top.height, top.width], 'sizes': save(top.rotate(-90, expand=True), 'campus-top-tall')},
        'wide': {'size': list(wide.size), 'sizes': save(wide, 'campus-wide')},
        'tall': {'size': list(tall.size), 'sizes': save(tall, 'campus-tall')},
    }
    with open(os.path.join(OUT, 'campus-photos.json'), 'w') as f:
        json.dump(manifest, f, indent=1)
    print(json.dumps(manifest))


if __name__ == '__main__':
    main()

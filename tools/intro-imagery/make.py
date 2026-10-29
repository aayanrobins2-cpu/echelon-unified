"""Builds the satellite images for the intro zoom (assets/intro/).

Every level is the same map, an orthographic view straight down on the school,
cropped tighter each time, so the levels line up exactly as the intro zooms
from the whole Earth to the neighbourhood around the campus.

Sources, both free to use with credit (see assets/CREDITS.md):
  - Sentinel-2 L2A 120 m cloudless mosaic, February 2020, by Sinergise
    (s3://sentinel-s2-l2a-mosaic-120, CC BY 4.0), for the globe down to ~250 km.
  - Sentinel-2 L2A scenes from 6 February 2026, 10 m per pixel
    (s3://sentinel-cogs, Copernicus open licence), for Bengaluru and closer.

Usage (needs Python 3.10+, network access to Amazon S3):
  pip install rasterio pyproj numpy pillow scipy global-land-mask
  python3 tools/intro-imagery/make.py [cache-dir] [levels, e.g. 0,3]

The raw reads are cached, so a second run doesn't download again. With
REENCODE=1 it only re-encodes the finished masters (after changing FEATHER,
SIZES or the quality settings).
"""

import concurrent.futures as cf
import json
import math
import os
import re
import sys
import urllib.request

import numpy as np
import rasterio
import rasterio.errors
from PIL import Image
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from global_land_mask import globe
from pyproj import Transformer
from rasterio.warp import reproject, transform_bounds
from scipy import ndimage

SCHOOL = (13.0474, 77.6466)  # lat, lon: Bangalore International School, Geddalahalli
DST_CRS = f'+proj=ortho +lat_0={SCHOOL[0]} +lon_0={SCHOOL[1]} +R=6371000 +units=m +no_defs'
R_EARTH = 6371.0

# Width of each square level in km. Each is about 2.7x tighter than the one before.
# "src" is where the pixels come from; "px" is the master size before resizing.
LEVELS = [
    {'km': 13400, 'src': 'mosaic', 'px': 2560},  # the whole Earth
    {'km': 4800, 'src': 'mosaic', 'px': 2560},   # India
    {'km': 1800, 'src': 'mosaic', 'px': 2560},   # South India
    {'km': 680, 'src': 'mosaic', 'px': 2560},    # Karnataka
    {'km': 256, 'src': 'mosaic', 'px': 2134},    # around Bengaluru (120 m data: 2134 px is native)
    {'km': 96, 'src': 'scene', 'px': 2560},      # Bengaluru
    {'km': 36, 'src': 'scene', 'px': 2560},      # north Bengaluru
    {'km': 13.5, 'src': 'scene', 'px': 1350},    # the school's neighbourhood (10 m data: native)
]
SIZES = [1280, 1920, 2560]  # square sizes written for each level
# The middle levels fade out over this fraction of their width at every edge (stored as
# transparency), so each blends into the wider view behind it as the camera zooms in.
# Baked in rather than drawn by the browser: a CSS mask would be re-drawn every frame.
FEATHER = 0.12

MOSAIC_DATE = os.environ.get('MOSAIC_DATE', '2020/2/11')
MOSAIC = f'https://sentinel-s2-l2a-mosaic-120.s3.amazonaws.com/{MOSAIC_DATE}'
SCENES = [  # the same satellite pass, so the two tiles match
    'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/43/P/GQ/2026/2/S2C_43PGQ_20260206_0_L2A',
    'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/43/P/HQ/2026/2/S2C_43PHQ_20260206_0_L2A',
]

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'intro')
CACHE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '.cache', 'intro-imagery')

os.environ.setdefault('GDAL_DISABLE_READDIR_ON_OPEN', 'EMPTY_DIR')
os.environ.setdefault('CPL_VSIL_CURL_ALLOWED_EXTENSIONS', '.tif')
os.environ.setdefault('GDAL_HTTP_MULTIRANGE', 'YES')
os.environ.setdefault('GDAL_HTTP_MAX_RETRY', '4')


def grid(level):
    half = level['km'] * 500.0  # metres
    n = level['px']
    return from_origin(-half, half, 2 * half / n, 2 * half / n), (n, n)


def mosaic_tiles():
    """Every UTM zone + latitude band tile in the mosaic."""
    path = os.path.join(CACHE, f'mosaic-tiles-{MOSAIC_DATE.replace("/", "-")}.json')
    if os.path.exists(path):
        return json.load(open(path))
    base = MOSAIC.split('.com/')[0] + '.com'
    prefix = MOSAIC.split('.com/')[1] + '/'
    tiles, token = [], None
    while True:
        url = f'{base}/?list-type=2&prefix={prefix}&delimiter=/' + (f'&continuation-token={urllib.parse.quote(token)}' if token else '')
        xml = urllib.request.urlopen(url).read().decode()
        tiles += [p.split('/')[-2] for p in re.findall(r'<Prefix>([^<]*)</Prefix>', xml)[1:]]
        m = re.search(r'<NextContinuationToken>([^<]*)', xml)
        if not m:
            break
        token = m.group(1)
    json.dump(tiles, open(path, 'w'))
    return tiles


def tile_lonlat(tile):
    zone, band = int(tile[:-1]), tile[-1]
    bands = 'CDEFGHJKLMNPQRSTUVWX'
    lat0 = -80 + 8 * bands.index(band)
    lon0 = -180 + 6 * (zone - 1)
    return lon0, lat0, lon0 + 6, lat0 + (12 if band == 'X' else 8)


def visible(tile, level):
    """Rough test: is any part of the tile on the near side of the globe and inside the level?"""
    lon0, lat0, lon1, lat1 = tile_lonlat(tile)
    lat_c, lon_c = map(math.radians, SCHOOL)
    reach = level['km'] / 2 * math.sqrt(2) / R_EARTH  # radians across the ground, roughly
    for lat in np.linspace(lat0, lat1, 5):
        for lon in np.linspace(lon0, lon1, 5):
            a, b = math.radians(lat), math.radians(lon)
            cosd = math.sin(a) * math.sin(lat_c) + math.cos(a) * math.cos(lat_c) * math.cos(b - lon_c)
            d = math.acos(max(-1, min(1, cosd)))
            if d < math.pi / 2 and math.sin(d) < reach * 1.05 + 0.05:
                return True
    return False


def read_mosaic_tile(tile, level, factor):
    """Red, green and blue reflectance of one mosaic tile, decimated by `factor`."""
    path = os.path.join(CACHE, f'mosaic-{MOSAIC_DATE.replace("/", "-")}-{tile}-{factor}.npz')
    if os.path.exists(path):
        z = np.load(path)
        return z['rgb'], tuple(z['transform']), str(z['crs'])
    out = []
    for b in ('B04', 'B03', 'B02'):
        with rasterio.open(f'/vsicurl/{MOSAIC}/{tile}/{b}.tif') as s:
            h, w = max(1, s.height // factor), max(1, s.width // factor)
            out.append(s.read(1, out_shape=(h, w), resampling=Resampling.average))
            t = s.transform * s.transform.scale(s.width / w, s.height / h)
            crs = s.crs.to_string()
    rgb = np.stack(out)
    np.savez_compressed(path, rgb=rgb, transform=np.array(t)[:6], crs=crs)
    return rgb, tuple(np.array(t)[:6]), crs


def read_scene(scene, level):
    """Red, green and blue reflectance of one 10 m scene, cut to the level, at a matching overview."""
    name = scene.rsplit('/', 1)[1]
    _, size = grid(level)
    res = level['km'] * 1000 / size[0]
    factor = max(1, int(res / 10 / 1.2))
    path = os.path.join(CACHE, f'{name}-{level["km"]}-{factor}.npz')
    if os.path.exists(path):
        z = np.load(path)
        return z['rgb'], tuple(z['transform']), str(z['crs'])
    out = []
    for b in ('red', 'green', 'blue'):
        with rasterio.open(f'/vsicurl/{scene}/{ {"red": "B04", "green": "B03", "blue": "B02"}[b] }.tif') as s:
            half = level['km'] * 500 * 1.5
            left, bottom, right, top = transform_bounds(DST_CRS, s.crs, -half, -half, half, half)
            try:
                win = rasterio.windows.from_bounds(left, bottom, right, top, s.transform).intersection(
                    rasterio.windows.Window(0, 0, s.width, s.height)).round_offsets().round_lengths()
            except rasterio.errors.WindowError:
                return None  # this tile doesn't reach into the level
            h, w = max(1, int(win.height // factor)), max(1, int(win.width // factor))
            out.append(s.read(1, window=win, out_shape=(h, w), resampling=Resampling.average))
            wt = s.window_transform(win)
            t = wt * wt.scale(win.width / w, win.height / h)
            crs = s.crs.to_string()
    rgb = np.stack(out)
    np.savez_compressed(path, rgb=rgb, transform=np.array(t)[:6], crs=crs)
    return rgb, tuple(np.array(t)[:6], ), crs


def warp(sources, level, scale, offset):
    """Reproject source tiles into the level's grid. Returns float reflectance and a coverage mask."""
    transform, shape = grid(level)
    acc = np.zeros((3,) + shape, np.float32)
    have = np.zeros(shape, bool)
    for rgb, t, crs in sources:
        dst = np.full((3,) + shape, np.nan, np.float32)
        src = rgb.astype(np.float32)
        nodata = rgb == 0
        src = src * scale + offset
        src[nodata] = np.nan
        try:
            reproject(src, dst, src_transform=rasterio.Affine(*t), src_crs=crs, dst_transform=transform,
                      dst_crs=DST_CRS, resampling=Resampling.lanczos if level['src'] == 'scene' else Resampling.bilinear,
                      src_nodata=np.nan, dst_nodata=np.nan, num_threads=4)
        except Exception as e:  # a tile entirely behind the horizon can fail to project
            print('  skipped a tile:', e)
            continue
        ok = np.isfinite(dst).all(0) & ~have
        acc[:, ok] = dst[:, ok]
        have |= ok
    return acc, have


def disc(level):
    """Distance from the centre of the Earth's disc, as a fraction of its radius, per pixel."""
    transform, (n, _) = grid(level)
    xs = (np.arange(n) + 0.5) * transform.a + transform.c
    x, y = np.meshgrid(xs, -xs)
    return np.sqrt(x * x + y * y) / (R_EARTH * 1000)


def lonlat(level):
    transform, (n, _) = grid(level)
    xs = (np.arange(n) + 0.5) * transform.a + transform.c
    x, y = np.meshgrid(xs, -xs)
    lon, lat = Transformer.from_crs(DST_CRS, 'EPSG:4326', always_xy=True).transform(x, y)
    return np.asarray(lon), np.asarray(lat)


def land_mask(level):
    """Land or sea per pixel, from the NOAA GLOBE 1 km land mask (public domain)."""
    lon, lat = lonlat(level)
    ok = np.isfinite(lon) & np.isfinite(lat)
    land = np.zeros(lon.shape, bool)
    land[ok] = globe.is_land(np.clip(lat[ok], -89.99, 89.99), np.clip(lon[ok], -179.99, 179.99))
    return land, ok


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def grade(refl, have, level):
    """Reflectance to display colour: one curve for every level, so they match as they cross-fade."""
    rgb = np.clip(refl, 0, None)
    px_km = level['km'] / have.shape[0]
    land, on_disc = land_mask(level)
    # Land pixels the data misses (tile seams, the odd gap): copy the nearest data pixel.
    if not have.all() and have.any():
        idx = ndimage.distance_transform_edt(~have, return_distances=False, return_indices=True)
        rgb = rgb[:, idx[0], idx[1]]
    if (~land).any():
        # Open sea: Sentinel-2 only images the coast, and its tiles end in straight lines out at sea.
        # Keep its real colour near the shore and fade to a deep-sea colour sampled from it further out.
        d_land = ndimage.distance_transform_edt(~land) * px_km
        deep = np.array([0.006, 0.02, 0.058], np.float32)[:, None, None]
        shelf = np.array([0.012, 0.034, 0.068], np.float32)[:, None, None]
        k = np.exp(-d_land / 80)[None]
        sea = deep * (1 - k) + shelf * k
        keep = have * (1 - smoothstep(4, 16, d_land))
        keep = np.clip(ndimage.gaussian_filter(keep.astype(np.float32), max(1.0, 3 / px_km)), 0, 1)
        keep = np.where(land, 1.0, keep)[None]
        rgb = rgb * keep + sea * (1 - keep)

    # Tone curve: exposure, then a soft shoulder so bright cloud, sand and rooftops don't clip.
    x = rgb * 4.8
    x = x / (1 + x * 0.32)
    x = np.power(np.clip(x, 0, None), 0.86)
    # A little extra saturation; Sentinel-2 true colour is quite grey once corrected.
    m = x.mean(0, keepdims=True)
    x = m + (x - m) * 1.22
    x = np.clip(x / 1.95, 0, 1)

    if level['km'] > 9000:
        r = disc(level)
        limb = np.clip(r, 0, 1)
        # Darken toward the edge of the disc like a real view from space, and add the thin blue atmosphere.
        x = x * (1 - 0.45 * limb ** 6)[None]
        glow = np.exp(-np.maximum(r - 1, 0) / 0.006)[None] * (r > 1)[None]
        haze = smoothstep(0.9, 1.0, r)[None] * (r <= 1)[None]
        atmo = np.array([0.42, 0.62, 1.0], np.float32)[:, None, None]
        x = np.where(r[None] <= 1, x, 0)
        x = x * (1 - 0.15 * haze) + atmo * (0.22 * glow + 0.12 * haze ** 3)
        x = np.clip(x, 0, 1)
    return x


def encode(i, img, n, manifest):
    feather = FEATHER if 0 < i < len(LEVELS) - 1 else 0
    if feather:
        t = np.clip(np.minimum(np.arange(n) + 0.5, n - np.arange(n) - 0.5) / (n * feather), 0, 1)
        ramp = t * t * (3 - 2 * t)
        img = img.copy()
        img.putalpha(Image.fromarray((np.outer(ramp, ramp) * 255 + 0.5).astype(np.uint8)))
    files = {}
    for size in SIZES:
        s = min(size, max(SIZES[0], n)) if n < size else size
        if s in files:
            continue
        im = img if s == n else img.resize((s, s), Image.LANCZOS)
        base = f'earth-{i}-{s}'
        im.save(os.path.join(OUT, base + '.avif'), quality=50, speed=4)
        if s < 2560:  # WebP for browsers without AVIF (Safari before 16.4); they get at most 1920
            im.save(os.path.join(OUT, base + '.webp'), quality=74, method=6)
        files[s] = base
    manifest.append({'km': LEVELS[i]['km'], 'sizes': sorted(files), 'feather': feather})


def main():
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    tiles = mosaic_tiles() if any(l['src'] == 'mosaic' for l in LEVELS) else []
    manifest = []
    only = {int(x) for x in sys.argv[2].split(',')} if len(sys.argv) > 2 else None
    for i, level in enumerate(LEVELS):
        if only is not None and i not in only:
            continue
        _, (n, _) = grid(level)
        res_km = level['km'] / n
        master = os.path.join(CACHE, f'level-{i}.png')
        if os.environ.get('REENCODE') and os.path.exists(master):  # only re-encode the saved masters
            encode(i, Image.open(master).convert('RGB'), n, manifest)
            continue
        if level['src'] == 'mosaic':
            factor = max(1, 2 ** int(math.log2(max(1, res_km / 0.12 / 1.2))))
            need = [t for t in tiles if visible(t, level)]
            print(f'level {i}: {level["km"]} km, {len(need)} mosaic tiles at 1/{factor}', flush=True)
            with cf.ThreadPoolExecutor(12) as ex:
                srcs = list(ex.map(lambda t: read_mosaic_tile(t, level, factor), need))
            refl, have = warp(srcs, level, 1 / 10000, 0)
        else:
            print(f'level {i}: {level["km"]} km, 10 m scenes', flush=True)
            with cf.ThreadPoolExecutor(2) as ex:
                srcs = [r for r in ex.map(lambda s: read_scene(s, level), SCENES) if r is not None]
            refl, have = warp(srcs, level, 1 / 10000, 0)  # Earth Search has already removed the 2022+ offset
        img = Image.fromarray((grade(refl, have, level).transpose(1, 2, 0) * 255 + 0.5).astype(np.uint8))
        img.save(master)
        encode(i, img, n, manifest)
    json.dump({'school': SCHOOL, 'levels': manifest}, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
    print('done')


if __name__ == '__main__':
    import urllib.parse  # noqa: F401  (used in mosaic_tiles)
    main()

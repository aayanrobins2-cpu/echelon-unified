#!/usr/bin/env bash
# Turns the two Google Earth Studio renders (folders of JPEG frames) into the
# campus clip at the end of the intro zoom, then writes assets/intro/campus.json.
#
#   tools/intro-imagery/campus-clip.sh LANDSCAPE_FRAMES PORTRAIT_FRAMES START_KM
#
# START_KM is how much ground the first frame shows across its longer side, in
# km (11.5 with the settings in the README). The satellite zoom ends on exactly
# that view, so the cut into the clip is seamless.
#
# Each orientation is written twice: AV1 in WebM (small, for current browsers)
# and H.264 in MP4 (for everything else), both without sound. Each file is kept
# under 1.1 MB: the brief allows 2 MB per video, but the whole page has to stay
# under 3 MB and the satellite images already take about 1.8 MB on a laptop.
# Needs ffmpeg with libsvtav1 and libx264.
set -euo pipefail

if [ $# -ne 3 ]; then
  echo "usage: $0 LANDSCAPE_FRAMES PORTRAIT_FRAMES START_KM" >&2
  exit 1
fi
OUT="$(cd "$(dirname "$0")/../.." && pwd)/assets/intro"
FPS=30
LIMIT=$((1100 * 1024))

encode() { # frames-dir name width height
  local dir="$1" name="$2" w="$3" h="$4" list
  list="$(mktemp)"
  find "$dir" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) | sort | sed "s/.*/file '&'/" > "$list"
  [ -s "$list" ] || { echo "No frames found in $dir" >&2; exit 1; }
  local scale="scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},format=yuv420p"
  # Lower the quality step by step until each file is under the limit.
  for crf in 38 42 46 50 54; do
    ffmpeg -loglevel error -y -r "$FPS" -f concat -safe 0 -i "$list" -vf "$scale" -an \
      -c:v libsvtav1 -crf "$crf" -preset 6 -g 240 "$OUT/$name.webm"
    [ "$(stat -c %s "$OUT/$name.webm")" -lt "$LIMIT" ] && break
  done
  for crf in 26 29 32 35 38; do
    ffmpeg -loglevel error -y -r "$FPS" -f concat -safe 0 -i "$list" -vf "$scale" -an \
      -c:v libx264 -profile:v high -crf "$crf" -preset slow -movflags +faststart "$OUT/$name.mp4"
    [ "$(stat -c %s "$OUT/$name.mp4")" -lt "$LIMIT" ] && break
  done
  rm -f "$list"
  ls -l "$OUT/$name.webm" "$OUT/$name.mp4" | awk '{printf "  %s  %.2f MB\n", $9, $5 / 1048576}'
}

echo "Encoding the landscape clip"
encode "$1" campus-landscape 1920 1080
echo "Encoding the portrait clip"
encode "$2" campus-portrait 1080 1920

cat > "$OUT/campus.json" <<JSON
{
 "startKm": $3,
 "landscape": { "size": [1920, 1080], "files": [["campus-landscape.webm", "video/webm; codecs=av01.0.08M.08"], ["campus-landscape.mp4", "video/mp4; codecs=avc1.640028"]] },
 "portrait": { "size": [1080, 1920], "files": [["campus-portrait.webm", "video/webm; codecs=av01.0.08M.08"], ["campus-portrait.mp4", "video/mp4; codecs=avc1.640028"]] }
}
JSON
echo "Wrote $OUT/campus.json. Now run: node build.js"

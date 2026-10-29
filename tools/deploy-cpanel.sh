#!/bin/bash
# Deploy the committed static build; cPanel does not need Node.js.
set -euo pipefail
cd "$(dirname "$0")/.."
target=${1:?Pass the existing website document root}
test -d "$target"
test "$(basename "$target")" = public_html
test -f index.html
test -f history/index.html

parent=$(dirname "$target")
stage=$(mktemp -d "$parent/echelon-stage.XXXXXX")
trap 'rm -rf -- "$stage"' EXIT
cp -R assets js history "$stage/"
cp index.html "$stage/index.html"

# Fetch the website fonts from their vendor instead of storing them in Git.
fetch_font() {
  local query=$1 name=$2 css font_url
  css=$(curl --fail --silent --show-error --location --retry 2 --max-time 60 \
    --user-agent 'Mozilla/5.0' "https://api.fontshare.com/v2/css?f[]=$query&display=swap" --globoff)
  font_url=$(printf '%s\n' "$css" | sed -n "s/.*url('\([^']*\.woff2\)').*/\1/p" | sed -n '1p')
  case "$font_url" in
    //cdn.fontshare.com/*) font_url="https:$font_url" ;;
    https://cdn.fontshare.com/*) ;;
    *) printf 'Unexpected Fontshare download URL\n' >&2; exit 1 ;;
  esac
  curl --fail --silent --show-error --location --retry 2 --max-time 60 \
    "$font_url" -o "$stage/assets/fonts/fontshare/$name"
  test -s "$stage/assets/fonts/fontshare/$name"
}
fetch_font 'satoshi@1' satoshi-variable.woff2
fetch_font 'cabinet-grotesk@500' cabinet-grotesk-500.woff2

# Back up outside the document root before replacing any website files.
mkdir -p "$parent/deploy-backups"
backup=$(mktemp -d "$parent/deploy-backups/echelon-$(date -u +%Y%m%dT%H%M%SZ).XXXXXX")
cp -a "$target/." "$backup/"
printf 'Previous website backed up to %s\n' "$backup"

# Keep unrelated hosting files and existing URLs. Publish the homepage last.
cp -R "$stage/assets" "$stage/js" "$stage/history" "$target/"
cp "$stage/index.html" "$target/.echelon-index.next"
mv "$target/.echelon-index.next" "$target/index.html"
printf 'Deployed Echelon and its history archive to %s\n' "$target"

#!/bin/bash
# Publish the committed build, with backups of files that actually change.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -x /usr/local/cpanel/3rdparty/bin/git ]; then
  export PATH="/usr/local/cpanel/3rdparty/bin:$PATH"
fi
target=${1:?Pass the existing website document root}
test -d "$target"
test "$(basename "$target")" = public_html
test -f index.html
test -f history/index.html
parent=$(dirname "$target")
if command -v flock >/dev/null 2>&1; then
  exec 8>"$parent/.echelon-deploy.lock"
  flock -n 8 || exit 0
fi
sha=$(git rev-parse HEAD)
state="$parent/.echelon-deployed-sha"
previous=$(cat "$state" 2>/dev/null || true)
if [ "$previous" = "$sha" ] && [ -s "$target/deployment.json" ]; then exit 0; fi
stage=$(mktemp -d "$parent/echelon-stage.XXXXXX")
trap 'rm -rf -- "$stage"' EXIT
mkdir -p "$stage/assets/fonts/fontshare"
# Fetch the website fonts from their vendor instead of storing them in Git.
fetch_font() {
  local query=$1 name=$2 css font_url
  test -s "$target/assets/fonts/fontshare/$name" && return 0
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
  mkdir -p "$target/assets/fonts/fontshare"
  cp "$stage/assets/fonts/fontshare/$name" "$target/assets/fonts/fontshare/$name"
}
fetch_font 'satoshi@1' satoshi-variable.woff2
fetch_font 'cabinet-grotesk@500' cabinet-grotesk-500.woff2


mkdir -p "$parent/deploy-backups"
backup=$(mktemp -d "$parent/deploy-backups/echelon-$(date -u +%Y%m%dT%H%M%SZ).XXXXXX")
# The first run compares all managed files with the existing installation.
# Later runs inspect only paths changed since the last successful deployment.
if [ -n "$previous" ] && git cat-file -e "$previous^{commit}" 2>/dev/null; then
  git diff --name-only -z --diff-filter=ACMRT "$previous" "$sha" -- index.html js/ assets/ history/ > "$stage/paths"
else
  git ls-files -z -- index.html js/ assets/ history/ > "$stage/paths"
fi
publish() {
  local file=$1
  case "$file" in index.html|js/*|assets/*|history/*) ;; *) return 1 ;; esac
  if [ ! -f "$file" ] || [ -L "$file" ]; then
    printf 'Refusing missing or symlinked deployment file: %s\n' "$file" >&2
    return 1
  fi
  if [ -f "$target/$file" ] && cmp -s "$file" "$target/$file"; then return 0; fi
  if [ -f "$target/$file" ]; then
    mkdir -p "$backup/$(dirname "$file")"
    cp -p "$target/$file" "$backup/$file"
  fi
  mkdir -p "$target/$(dirname "$file")"
  cp "$file" "$target/$file.echelon-next"
  mv "$target/$file.echelon-next" "$target/$file"
}
while IFS= read -r -d '' file; do
  if [ "$file" != index.html ]; then publish "$file"; fi
done < "$stage/paths"
# Make the homepage visible only after its assets have been installed.
publish index.html
printf '{"commit":"%s","deployed_at":"%s"}\n' "$sha" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$target/deployment.json.next"
mv "$target/deployment.json.next" "$target/deployment.json"
printf '%s\n' "$sha" > "$state.next"
mv "$state.next" "$state"
printf '%s Deployed %s; changed-file backup: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$sha" "$backup"

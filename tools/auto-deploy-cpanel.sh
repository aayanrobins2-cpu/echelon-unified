#!/bin/bash
# Invoked by cPanel cron. Reuses the server's existing read-only deploy key.
set -euo pipefail
cd "$(dirname "$0")/.."
target=${1:-/home/t6di8s6yfvlr/public_html}
parent=$(dirname "$target")
exec 9>"$parent/.echelon-auto-deploy.lock"
flock -n 9 || exit 0
if [ -x /usr/local/cpanel/3rdparty/bin/git ]; then
  GIT=/usr/local/cpanel/3rdparty/bin/git
else
  GIT=$(command -v git)
fi
export PATH="$(dirname "$GIT"):/usr/local/bin:/usr/bin:/bin:$PATH"
export GIT_SSH_COMMAND='ssh -o BatchMode=yes -o StrictHostKeyChecking=yes'
"$GIT" fetch --quiet origin main
candidate=$("$GIT" rev-parse origin/main)
deployed=$(cat "$parent/.echelon-deployed-sha" 2>/dev/null || true)
[ "$candidate" != "$deployed" ] || exit 0
# GitHub Actions commits a readiness marker only after a successful build.
# A subsequent source commit invalidates that marker until its own build passes.
ready=$("$GIT" show "$candidate:.cpanel-ready" 2>/dev/null || true)
source=$("$GIT" rev-parse "$candidate^" 2>/dev/null || true)
if [ -z "$ready" ] || [ "$ready" != "$source" ]; then exit 0; fi
"$GIT" diff --quiet
"$GIT" diff --cached --quiet
"$GIT" merge --ff-only "$candidate"
/bin/bash tools/deploy-cpanel.sh "$target"

#!/usr/bin/env bash
# Release in one command: switch to main, pull, bump system.json, commit, tag,
# push (branch + tag) and watch the GitHub Action that publishes the release.
# Usage: scripts/release.sh X.Y.Z        (any branch, clean working tree)
#        scripts/release.sh X.Y.Z --no-watch
set -euo pipefail
VERSION="${1:?usage: scripts/release.sh X.Y.Z [--no-watch]}"
WATCH=1; [ "${2:-}" = "--no-watch" ] && WATCH=0
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "version must look like 1.2.3"; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "working tree not clean (uncommitted changes to tracked files)"; exit 1; }
git rev-parse -q --verify "refs/tags/v$VERSION" >/dev/null && { echo "tag v$VERSION already exists"; exit 1; }

git switch -q main
git pull -q --ff-only origin main

python3 - "$VERSION" <<'PY'
import json, sys, datetime
v = sys.argv[1]
d = json.load(open("system.json")); d["version"] = v
json.dump(d, open("system.json", "w"), indent=2); open("system.json", "a").write("\n")
s = open("CHANGELOG.md").read()
today = datetime.date.today().isoformat()
if f"## {v} (unreleased)" in s:
    s = s.replace(f"## {v} (unreleased)", f"## {v} ({today})", 1)
elif f"## {v}" not in s:
    s = s.replace("# Changelog\n", f"# Changelog\n\n## {v} ({today})\n\n- \n", 1)
open("CHANGELOG.md", "w").write(s)
PY

git add system.json CHANGELOG.md
git commit -q -m "Release v$VERSION"
git tag "v$VERSION"
git push -q origin main "v$VERSION"
echo "Pushed v$VERSION."

if [ "$WATCH" = 1 ] && command -v gh >/dev/null; then
  echo "Waiting for the Release workflow..."
  sleep 5
  RUN_ID="$(gh run list --workflow=release.yml --event=push --limit 10 --json databaseId,headBranch -q ".[] | select(.headBranch==\"v$VERSION\") | .databaseId" | head -n1)"
  if [ -n "$RUN_ID" ]; then
    gh run watch "$RUN_ID" --exit-status && echo "Release v$VERSION published: $(gh release view "v$VERSION" --json url -q .url)"
  else
    echo "Could not find the workflow run yet; check: gh run list --workflow=release.yml"
  fi
else
  echo "The Release workflow will publish the assets; then update the system in Foundry."
fi

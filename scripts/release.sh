#!/usr/bin/env bash
# Bump the version, commit, tag and push so the GitHub Action publishes a release.
# Usage: scripts/release.sh 0.2.0   (run on main with a clean tree)
set -euo pipefail
VERSION="${1:?usage: scripts/release.sh X.Y.Z}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
[ -z "$(git status --porcelain)" ] || { echo "working tree not clean"; exit 1; }
python3 - "$VERSION" <<'PY'
import json, sys, re, datetime
v = sys.argv[1]
d = json.load(open("system.json")); d["version"] = v
json.dump(d, open("system.json", "w"), indent=2); open("system.json", "a").write("\n")
s = open("CHANGELOG.md").read()
if f"## {v}" not in s:
    s = s.replace("# Changelog\n", f"# Changelog\n\n## {v} ({datetime.date.today().isoformat()})\n\n- \n", 1)
    open("CHANGELOG.md", "w").write(s)
PY
git add system.json CHANGELOG.md
git commit -m "Release v$VERSION"
git tag "v$VERSION"
git push origin HEAD "v$VERSION"
echo "Pushed v$VERSION; the Release workflow will publish the assets."

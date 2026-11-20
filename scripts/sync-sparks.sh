#!/usr/bin/env bash
# Copies the Sparks table data from a local clone of the Tag & Tally Obsidian
# plugin (https://github.com/matalina/obsidian-tag-and-tally) into data/sparks.
# Usage: scripts/sync-sparks.sh [path-to-vault-clone]
set -euo pipefail
SRC="${1:-$HOME/src/obsidian-tag-and-tally}"
DST="$(cd "$(dirname "$0")/.." && pwd)/data/sparks"
rm -rf "$DST/tables"
mkdir -p "$DST/tables"
cp -R "$SRC/vendor/data/tables/." "$DST/tables/"
echo "Synced tables from $SRC to $DST/tables"
# Rebuild the index of table files so the system can load them without a directory listing.
( cd "$DST" && { find tables -name '*.json'; find extra -name '*.json'; } | sort | python3 -I -c 'import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()], indent=2))' > index.json )
echo "Wrote $DST/index.json"

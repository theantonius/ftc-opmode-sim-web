#!/usr/bin/env bash
# Stamps a new cache-busting version on every local CSS/JS URL in web/ (index.html and module imports),
# so browsers never mix old and new files after a deploy (GitHub Pages caches for 10 minutes).
# Usage: tools/bump-version.sh [version]   (default: current date and time)
set -euo pipefail
cd "$(dirname "$0")/../web"
v="${1:-$(date +%Y%m%d%H%M)}"
python3 - "$v" <<'PY'
import re, sys, pathlib
v = sys.argv[1]
files = [pathlib.Path("index.html")] + sorted(pathlib.Path("js").glob("*.js"))
pat = re.compile(r'''((?:src|href)="|from\s+"|import\(")((?:\.{1,2}/|js/|css/)[^"?]+\.(?:js|css))(?:\?v=[^"]*)?"''')
for f in files:
    s = f.read_text()
    t = pat.sub(lambda m: f'{m.group(1)}{m.group(2)}?v={v}"', s)
    if t != s:
        f.write_text(t)
        print("stamped", f)
PY
echo "version $v"

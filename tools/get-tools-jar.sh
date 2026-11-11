#!/usr/bin/env bash
# Spike only: downloads the JDK 8 tools.jar (javac) that JavaFiddle serves.
# It is Oracle JDK 1.8.0_131 (see its MANIFEST). Licence for redistribution not cleared; not committed.
set -euo pipefail
cd "$(dirname "$0")/.."
curl -fL -o spike/tools.jar https://raw.githubusercontent.com/leaningtech/javafiddle/main/static/tools.jar
ls -l spike/tools.jar

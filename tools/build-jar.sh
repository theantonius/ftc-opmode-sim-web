#!/usr/bin/env bash
# Builds spike/sim.jar (Java 8 bytecode) from java/src. Needs JDK 9+ (for --release 8).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf build/classes && mkdir -p build/classes
javac --release 8 -nowarn -d build/classes $(find java/src -name '*.java')
rm -f spike/sim.jar
(cd build/classes && jar cf ../../spike/sim.jar .)
ls -l spike/sim.jar

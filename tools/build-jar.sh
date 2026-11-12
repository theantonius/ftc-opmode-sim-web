#!/usr/bin/env bash
# Builds web/sim.jar (and the spike's copy) from java/src: Java 17 bytecode for CheerpJ's Java 17 runtime. Needs JDK 17+.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf build/classes && mkdir -p build/classes
javac --release 17 -nowarn -d build/classes $(find java/src -name '*.java')
rm -f web/sim.jar
(cd build/classes && jar cf ../../web/sim.jar .)
cp web/sim.jar spike/sim.jar
ls -l web/sim.jar

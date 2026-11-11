#!/usr/bin/env bash
# Builds spike/sim.jar (Java 17 bytecode; CheerpJ runs its Java 17 runtime) from java/src. Needs JDK 17+.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf build/classes && mkdir -p build/classes
javac --release 17 -nowarn -d build/classes $(find java/src -name '*.java')
rm -f spike/sim.jar
(cd build/classes && jar cf ../../spike/sim.jar .)
ls -l spike/sim.jar

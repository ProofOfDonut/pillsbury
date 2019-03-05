#!/bin/bash
set -e -o pipefail

bin/veil -u "cd token && ../node_modules/truffle/build/cli.bundled.js compile"
bin/veil "cd token \
    && node ../node_modules/truffle-flattener contracts/Donut.sol" \
    > token/BUIDL/output/Donut.sol
cp $(bin/veil pwd)/token/build/contracts/Donut.json \
    token/BUIDL/output/Donut.json

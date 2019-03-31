#!/bin/bash
set -e -o pipefail

function in_project() {
  bin/veil "cd token && $1"
}

bin/veil -u

in_project '../node_modules/truffle/build/cli.bundled.js compile'
in_project 'node ../node_modules/truffle-flattener contracts/Donut.sol' \
    > token/BUIDL/output/Donut.sol
bin/veil 'node token/BUIDL/to_js token/build/contracts/Donut.json' \
    > token/BUIDL/output/Donut.ts

#!/bin/bash
set -e -o pipefail

bin/veil -u
bin/veil 'mkdir -p dashboard/src/common'
bin/veil "rsync -ua --exclude '*.js' 'common/.' 'dashboard/src/common'"
bin/veil 'cp token/BUIDL/output/Donut.ts dashboard/src/contract_config.ts'
bin/veil 'bin/tsc'
export HOST=0.0.0.0
export SKIP_PREFLIGHT_CHECK=true
export HTTPS=true

keyfile="$HOME/.pillsbury/dev/secret/https.privkey.pem"
certfile="$HOME/.pillsbury/dev/config/https.fullchain.pem"

if [ -f "$keyfile" ]; then
  key="--key=$keyfile"
fi
if [ -f "$certfile" ]; then
  cert="--cert=$certfile"
fi

bin/veil "cd dashboard && node BUIDL/devstart $key $cert"

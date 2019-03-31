#!/bin/bash
set -e -o pipefail

bin/veil -u
bin/veil 'mkdir -p dashboard/src/common'
bin/veil "rsync -ua --exclude '*.js' 'common/.' 'dashboard/src/common'"
bin/veil 'cp token/BUIDL/output/Donut.ts dashboard/src/contract_config.ts'
export HOST=192.168.56.102
export SKIP_PREFLIGHT_CHECK=true
bin/veil "npm run dashboard-start"

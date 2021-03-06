#!/bin/bash
set -e -o pipefail

bin/veil -u "mkdir -p dashboard/src/common"
bin/veil "rsync -ua --exclude '*.js' 'common/.' 'dashboard/src/common'"
export SKIP_PREFLIGHT_CHECK=true
bin/veil "npm run dashboard-build"

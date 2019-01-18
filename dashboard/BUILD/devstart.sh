#!/bin/bash
set -e -o pipefail

bin/veil -u "mkdir -p dashboard/src/common && rsync -ua --exclude '*.js' 'common/.' 'dashboard/src/common'"
HOST=192.168.56.102 bin/veil "npm run dashboard-start"
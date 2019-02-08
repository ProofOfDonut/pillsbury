#!/bin/bash
set -e -o pipefail
workspace=$(pwd)

cd "$workspace"
bin/veil -u tsc
bin/veil "glaze_db/dev_manager.sh upgrade -y"
db_name=$(bin/veil glaze_db/dev_manager.sh database_name)
bin/veil "node reddit_monitor/runner \
    --config '$HOME/.pillsbury/reddit_monitor.json' \
    --db_config '$HOME/.pillsbury/db.json' \
    --db_name '$db_name'"

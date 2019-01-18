#!/bin/bash
set -e -o pipefail
workspace=$(pwd)

cd "$workspace"
bin/veil -u tsc
bin/veil "pod_db/dev_manager.sh upgrade -y"
db_name=$(bin/veil pod_db/dev_manager.sh database_name)
bin/veil "node reddit_monitor/runner \
    --config '$HOME/.proof_of_donut/reddit_monitor.json' \
    --db_config '$HOME/.proof_of_donut/db.json' \
    --db_name '$db_name'"

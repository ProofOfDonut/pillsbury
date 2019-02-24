#!/bin/bash
set -e -o pipefail
workspace=$(pwd)

cd "$workspace"
bin/veil -u tsc
bin/veil "glaze_db/dev_manager.sh upgrade -y"
db_name=$(bin/veil glaze_db/dev_manager.sh database_name)
bin/veil "node reddit_delivery_monitor/runner \
    --reddit_puppet 192.168.56.102:3005 \
    --reddit_hub_config '$HOME/.pillsbury/dev/reddit_hub.json' \
    --db_config '$HOME/.pillsbury/dev/db.json' \
    --db_name '$db_name'"

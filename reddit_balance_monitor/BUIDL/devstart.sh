#!/bin/bash
set -e -o pipefail
workspace=$(pwd)

cd "$workspace"
bin/veil -u bin/tsc
bin/veil "glaze_db/dev_manager.sh upgrade -y"
db_name=$(bin/veil glaze_db/dev_manager.sh database_name)
bin/veil "node reddit_balance_monitor/runner \
    --reddit_puppet 127.0.0.1:3005 \
    --db_config '$HOME/.pillsbury/dev/config/db.json' \
    --db_user_config '$HOME/.pillsbury/dev/secret/db_user.json' \
    --db_name '$db_name'"

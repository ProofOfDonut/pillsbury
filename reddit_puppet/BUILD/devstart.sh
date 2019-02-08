#!/bin/bash
set -e -o pipefail

config="$HOME/.pillsbury/reddit_puppet.json"
db_name=$(bin/veil glaze_db/dev_manager.sh database_name)
bin/veil -u "tsc && node reddit_puppet/runner \
    --config $config \
    --db_config $HOME/.pillsbury/db.json \
    --db_name $db_name"

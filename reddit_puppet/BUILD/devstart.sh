#!/bin/bash
set -e -o pipefail

config="$HOME/.proof_of_donut/reddit_puppet.json"
db_name=$(bin/veil pod_db/dev_manager.sh database_name)
bin/veil -u "tsc && node reddit_puppet/runner \
    --config $config \
    --db_config $HOME/.proof_of_donut/db.json \
    --db_name $db_name"

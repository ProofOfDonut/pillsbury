#!/bin/bash
set -e -o pipefail

bin/veil "glaze_db/dev_manager.sh upgrade -y"
db_name=$(bin/veil glaze_db/dev_manager.sh database_name)
bin/veil -u "tsc"
bin/veil "node ethereum_monitor/runner \
    --config $HOME/.pillsbury/ethereum_monitor.json \
    --db_config $HOME/.pillsbury/db.json \
    --db_name $db_name"

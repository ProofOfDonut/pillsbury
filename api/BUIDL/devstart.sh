#!/bin/bash
set -e -o pipefail

bin/veil -u "glaze_db/dev_manager.sh upgrade -y"
db_name=$(bin/veil glaze_db/dev_manager.sh database_name)
bin/veil "tsc && node api/runner \
    --config '$HOME/.pillsbury/dev/api_server.json' \
    --ethereum_node_config '$HOME/.pillsbury/dev/ethereum_node.json' \
    --ethereum_hub_key '$HOME/.pillsbury/dev/ethereum_hub_key.json' \
    --ethereum_hub_config '$HOME/.pillsbury/dev/ethereum_hub.json' \
    --reddit_hub_config '$HOME/.pillsbury/dev/reddit_hub.json' \
    --reddit_puppet '192.168.56.102:3005' \
    --db_config '$HOME/.pillsbury/dev/db.json' \
    --db_name '$db_name'"

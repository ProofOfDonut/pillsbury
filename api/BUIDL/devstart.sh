#!/bin/bash
set -e -o pipefail

bin/veil -u "glaze_db/dev_manager.sh upgrade -y"
db_name=$(bin/veil glaze_db/dev_manager.sh database_name)
bin/veil "tsc && node api/runner \
    --config '$HOME/.pillsbury/dev/config/api_server.json' \
    --ethereum_node_config '$HOME/.pillsbury/dev/config/ethereum_node.json' \
    --ethereum_hub_key '$HOME/.pillsbury/dev/secret/ethereum_hub_key.json' \
    --ethereum_hub_config '$HOME/.pillsbury/dev/secret/ethereum_hub.json' \
    --reddit_hub_config '$HOME/.pillsbury/dev/secret/reddit_hub.json' \
    --reddit_login_config '$HOME/.pillsbury/dev/secret/reddit_login.json' \
    --reddit_puppet '192.168.56.102:3005' \
    --contract_config '$HOME/.pillsbury/dev/config/contracts.json' \
    --db_config '$HOME/.pillsbury/dev/config/db.json' \
    --db_user_config '$HOME/.pillsbury/dev/secret/db_user.json' \
    --db_name '$db_name'"

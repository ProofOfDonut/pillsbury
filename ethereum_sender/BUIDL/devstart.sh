#!/bin/bash
set -e -o pipefail

bin/veil "glaze_db/dev_manager.sh upgrade -y"
db_name=$(bin/veil glaze_db/dev_manager.sh database_name)
bin/veil -u "tsc"
bin/veil "node ethereum_sender/runner \
    --ethereum_node_config $HOME/.pillsbury/dev/config/ethereum_node.json \
    --ethereum_hub_key $HOME/.pillsbury/dev/secret/ethereum_hub_key.json \
    --ethereum_hub_config $HOME/.pillsbury/dev/secret/ethereum_hub.json \
    --db_config $HOME/.pillsbury/dev/config/db.json \
    --db_user_config $HOME/.pillsbury/dev/secret/db_user.json \
    --db_name $db_name"

#!/bin/bash
set -e -o pipefail

bin/veil "glaze_db/dev_manager.sh upgrade -y"
db_name=$(bin/veil glaze_db/dev_manager.sh database_name)
bin/veil -u "tsc"
bin/veil "node ethereum_sender/runner \
    --config $HOME/.pillsbury/ethereum_sender.json \
    --master_key $HOME/.pillsbury/masterkey.json \
    --master_key_pw $HOME/.pillsbury/masterkeypw.json \
    --db_config $HOME/.pillsbury/db.json \
    --db_name $db_name"

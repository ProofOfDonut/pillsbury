#!/bin/bash
set -e -o pipefail

bin/veil -u "glaze_db/dev_manager.sh upgrade -y"
db_name=$(bin/veil glaze_db/dev_manager.sh database_name)
bin/veil "tsc && node api/runner \
    --config $HOME/.pillsbury/api_server.json \
    --master_key $HOME/.pillsbury/masterkey.json \
    --master_key_pw $HOME/.pillsbury/masterkeypw.json \
    --db_config $HOME/.pillsbury/db.json \
    --db_name $db_name"

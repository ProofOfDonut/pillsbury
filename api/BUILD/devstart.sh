#!/bin/bash
set -e -o pipefail

db_name=$(bin/veil pod_db/dev_manager.sh upgrade -y)
db_name=$(bin/veil pod_db/dev_manager.sh database_name)
bin/veil -u "tsc && node api/runner \
    --config $HOME/.proof_of_donut/api_server.json \
    --master_key $HOME/.proof_of_donut/masterkey.json \
    --master_key_pw $HOME/.proof_of_donut/masterkeypw.json \
    --db_config $HOME/.proof_of_donut/db.json \
    --db_name $db_name"

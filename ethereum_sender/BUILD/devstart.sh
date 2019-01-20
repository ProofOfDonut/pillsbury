#!/bin/bash
set -e -o pipefail

bin/veil "pod_db/dev_manager.sh upgrade -y"
db_name=$(bin/veil pod_db/dev_manager.sh database_name)
bin/veil -u "tsc"
bin/veil "node ethereum_sender/runner \
    --config $HOME/.proof_of_donut/ethereum_sender.json \
    --master_key $HOME/.proof_of_donut/masterkey.json \
    --master_key_pw $HOME/.proof_of_donut/masterkeypw.json \
    --db_config $HOME/.proof_of_donut/db.json \
    --db_name $db_name"

#!/bin/bash

node ethereum_sender/runner \
    --config "$ETHEREUM_SENDER_CONFIG" \
    --master_key "$MASTER_KEY" \
    --master_key_pw "$MASTER_KEY_PW" \
    --db_config "$DB_CONFIG" \
    --db_name "$DB_NAME"

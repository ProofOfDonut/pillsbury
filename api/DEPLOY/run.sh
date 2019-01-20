#!/bin/bash

node api/runner \
    --config "$API_CONFIG" \
    --master_key "$MASTER_KEY" \
    --master_key_pw "$MASTER_KEY_PW" \
    --db_config "$DB_CONFIG" \
    --db_name "$DB_NAME"

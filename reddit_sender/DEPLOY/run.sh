#!/bin/bash

node reddit_sender/runner \
    --config "$REDDIT_SENDER_CONFIG" \
    --db_config "$DB_CONFIG" \
    --db_name "$DB_NAME"

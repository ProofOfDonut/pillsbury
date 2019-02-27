#!/bin/bash

node reddit_balance_monitor/runner \
    --reddit_puppet "$REDDIT_PUPPET_HOST:$REDDIT_PUPPET_PORT" \
    --db_config "$DB_CONFIG" \
    --db_name "$DB_NAME"

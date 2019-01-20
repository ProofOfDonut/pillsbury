#!/bin/bash

node reddit_monitor/runner \
    --config "$REDDIT_MONITOR_CONFIG" \
    --db_config "$DB_CONFIG" \
    --db_name "$DB_NAME"

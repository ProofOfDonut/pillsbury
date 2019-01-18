#!/bin/bash

node ethereum_monitor/runner \
    --config "$ETHEREUM_MONITOR_CONFIG" \
    --db_config "$DB_CONFIG" \
    --db_name "$DB_NAME"

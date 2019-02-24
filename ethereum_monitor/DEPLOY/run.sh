#!/bin/bash

node ethereum_monitor/runner \
    --ethereum_node_config "$ETHEREUM_NODE_CONFIG" \
    --db_config "$DB_CONFIG" \
    --db_name "$DB_NAME"

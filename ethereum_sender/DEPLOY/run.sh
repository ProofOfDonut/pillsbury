#!/bin/bash

node ethereum_sender/runner \
    --ethereum_node_config "$ETHEREUM_NODE_CONFIG" \
    --ethereum_hub_key "$ETHEREUM_HUB_KEY" \
    --ethereum_hub_config "$ETHEREUM_HUB_CONFIG" \
    --db_config "$DB_CONFIG" \
    --db_name "$DB_NAME"

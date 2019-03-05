#!/bin/bash

node api/runner \
    --config "$API_CONFIG" \
    --ethereum_node_config "$ETHEREUM_NODE_CONFIG" \
    --ethereum_hub_key "$ETHEREUM_HUB_KEY" \
    --ethereum_hub_config "$ETHEREUM_HUB_CONFIG" \
    --reddit_hub_config "$REDDIT_HUB_CONFIG" \
    --reddit_login_config "$REDDIT_LOGIN_CONFIG" \
    --reddit_puppet "$REDDIT_PUPPET_HOST:$REDDIT_PUPPET_PORT" \
    --contract_config "$CONTRACT_CONFIG" \
    --db_config "$DB_CONFIG" \
    --db_user_config "$DB_USER_CONFIG" \
    --db_name "$DB_NAME"

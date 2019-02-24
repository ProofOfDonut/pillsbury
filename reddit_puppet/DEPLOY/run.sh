#!/bin/bash

node reddit_puppet/runner \
    --host ":$REDDIT_PUPPET_PORT" \
    --reddit_hub_config "$REDDIT_HUB_CONFIG" \
    --db_config "$DB_CONFIG" \
    --db_name "$DB_NAME"

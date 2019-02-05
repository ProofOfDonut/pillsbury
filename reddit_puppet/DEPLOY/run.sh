#!/bin/bash

node reddit_puppet/runner \
    --config "$REDDIT_PUPPET_CONFIG" \
    --db_config "$DB_CONFIG" \
    --db_name "$DB_NAME"

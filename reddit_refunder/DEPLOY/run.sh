#!/bin/bash

node reddit_refunder/runner \
    --config "$REDDIT_REFUNDER_CONFIG" \
    --db_config "$DB_CONFIG" \
    --db_name "$DB_NAME"

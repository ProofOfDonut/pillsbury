#!/bin/bash

tools/db_manager/manager.sh \
    --db_config="$DB_CONFIG,$DB_USER_CONFIG" \
    --patches="$PWD/glaze_db/BUIDL/patches" \
    --schema="$PWD/glaze_db/schema.sql" \
    upgrade -y

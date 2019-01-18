#!/bin/bash
set -e -o pipefail
workspace=$(pwd)
"$workspace/bin/ensure_veil"

"$workspace/tools/db_manager/manager.sh" \
    --dev_mode \
    --WARNING__permit_data_loss \
    --db_config="$HOME/.proof_of_donut/db.json" \
    --patches="$workspace/pod_db/BUILD/patches" \
    --schema="$($workspace/bin/unveil $workspace/pod_db/schema.sql)" \
    $@

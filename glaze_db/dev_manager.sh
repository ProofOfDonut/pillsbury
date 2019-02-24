#!/bin/bash
set -e -o pipefail
workspace=$(pwd)
"$workspace/bin/ensure_veil"

"$workspace/tools/db_manager/manager.sh" \
    --dev_mode \
    --WARNING__permit_data_loss \
    --db_config="$HOME/.pillsbury/dev/db.json" \
    --patches="$workspace/glaze_db/BUIDL/patches" \
    --schema="$($workspace/bin/unveil $workspace/glaze_db/schema.sql)" \
    $@

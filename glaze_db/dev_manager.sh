#!/bin/bash
set -e -o pipefail
workspace=$(pwd)
"$workspace/bin/ensure_veil"

"$workspace/tools/db_manager/manager.sh" \
    --dev_mode \
    --WARNING__permit_data_loss \
    --db_config="$HOME/.pillsbury/dev/config/db.json,$HOME/.pillsbury/dev/secret/db_user.json" \
    --patches="$workspace/glaze_db/BUIDL/patches" \
    --schema="$($workspace/bin/unveil $workspace/glaze_db/schema.sql)" \
    $@

#!/bin/bash
set -e -o pipefail
workspace=$(pwd)

PYTHONPATH="$workspace" "$workspace/tools/db_manager/manager.py" $@

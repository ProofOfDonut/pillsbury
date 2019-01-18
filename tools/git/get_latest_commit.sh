#!/bin/bash
set -e -o pipefail
workspace=$(pwd)

"$workspace/tools/git/require_clean_work_tree.sh" 'get latest commit'
git rev-parse --verify HEAD

#!/bin/bash
set -e -o pipefail

. "$(git --exec-path)/git-sh-setup"

require_clean_work_tree "$1"

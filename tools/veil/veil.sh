#!/bin/bash
set -e -o pipefail

function update() {
  mkdir -p $veildir
  rsync -ua --exclude '.git/' "$cwd/." "$veildir"
}

cwd="$(pwd)"
if [ "${cwd:0:1}" != '/' ]; then
  echo "Invalid dir \"$cwd\"." >&2
  exit 1
fi
veildir="/tmp/veil$cwd"

# Update
if [ "$1" == "-u" ]; then
  shift
  update
fi

# Delete & Update
if [ "$1" == "-du" ]; then
  shift
  rm -rf $veildir
  update
fi

# In the case that `veil pwd` is used, short-circuit the normal behavior and
# just show the directory. This is helpful when `veil -u` might not have been
# used yet, and so `cd`ing into the directory may not be possible because the
# veil directory structure has not yet been created. Some scripts query for what
# their veil paths would be using `veil pwd`, and this should be allowed even if
# the directories have not been created yet.
if [ "$1" == 'pwd' ]; then
  echo "$veildir"
else
  cd $veildir

  if [ "$1" != "" ]; then
    bash -c "$*"
  fi
fi

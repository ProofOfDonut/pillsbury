#!/bin/bash
set -e -o pipefail
workspace=$(pwd)

inotifywait -r -m $workspace -e create -e moved_to -e modify |
    while read path action file; do
      if [ "${file:(-1)}" == '~' ] || [ "${file:(-4)}" == '.swp' ]; then
        continue
      fi
      cp -r "$path/$file" "/tmp/veil/$path/$file" \
          2> /dev/null \
          && echo "File modified: '$file' in '$path'" \
          || true
    done

#!/bin/bash
set -e -o pipefail
workspace=$(pwd)

inotifywait -r -m $workspace -e create -e moved_to -e modify |
    while read path action file; do
      echo "File modified: '$file' in '$path'"
      cp -r "$path/$file" "/tmp/veil/$path/$file"
    done

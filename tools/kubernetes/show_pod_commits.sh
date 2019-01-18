#!/bin/bash

pod_params=''
if [ "$1" == '-a' ]; then
  pod_params='-a'
  shift
fi

function show_commit() {
  pod="$1"
  description=$(kubectl describe pod "$pod")
  line=$(echo "$description" | grep Image -m1)
  commit=${line##*:}
  echo "--- Pod: $pod"
  echo ''
  echo "$commit"
  echo ''
}

kubectl get pods $pod_params \
    | sed '1d' \
    | awk '{ print $1 }' \
    | while read pod; do show_commit "$pod"; done

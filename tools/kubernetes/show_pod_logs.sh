#!/bin/bash

pod_params=''
if [ "$1" == '-a' ]; then
  pod_params='-a'
  shift
fi

filter=''
if [ "$1" == '-f' ]; then
  filter="$2"
  if [ "$filter" == '' ]; then
    echo 'Pod name expected.' >&2
    exit 1
  fi
  shift
  shift
fi

function show_logs() {
  pod="$1"
  logs=$(kubectl logs "$pod")
  logs_without_whitespace=$(echo "$logs" | tr -d '[:space:]')
  if [ ! -z "$logs_without_whitespace" ]; then
    echo "--- Pod: $pod"
    echo ''
    echo "$logs"
    echo ''
    echo ''
  fi
}

pods=$(kubectl get pods $pod_params)

if [ "$filter" != '' ]; then
  pods=$(echo "$pods" | grep "$filter")
else
  pods=$(echo "$pods" | sed '1d' )
fi

if [ "$pods" != '' ]; then
  echo "$pods" \
      | awk '{ print $1 }' \
      | while read pod; do show_logs "$pod"; done
fi

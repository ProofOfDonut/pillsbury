#!/bin/bash

cwd="$(pwd)"
if [ "${cwd:0:10}" != "/tmp/veil/" ]; then
  echo 'This script is intended to be run as part of a veil build.' >&2
  exit 1
fi

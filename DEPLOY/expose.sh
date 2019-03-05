#!/bin/bash
set -e -o pipefail

#kubectl expose deployment pb-api --target-port=8000 --type=NodePort
kubectl expose deployment pb-api --target-port=8000
kubectl expose deployment pb-reddit-puppet --target-port=8000

#!/bin/bash
set -e -o pipefail

kubectl expose deployment pod-api --target-port=8000 --type=NodePort
kubectl expose deployment pod-ethereum-monitor --target-port=8000
kubectl expose deployment pod-reddit-monitor --target-port=8000
kubectl expose deployment pod-reddit-sender --target-port=8000

#!/bin/bash
set -e -o pipefail

sdir="$HOME/.proof_of_donut/prod"

kubectl delete configmaps \
    pb-api-server-config \
    pb-db-config \
    pb-ethereum-node-config \
    || true

kubectl create configmap generic pb-api-server-config \
    --from-file=json="$sdir/config/api_server.json"
kubectl create configmap generic pb-db-config \
    --from-file=json="$sdir/config/db.json"
kubectl create configmap generic pb-ethereum-node-config \
    --from-file=json="$sdir/config/ethereum_node.json"

kubectl delete secrets \
    pb-db-user-config \
    pb-ethereum-hub-key \
    pb-ethereum-hub-config \
    pb-reddit-hub-config \
    pb-reddit-login-config \
    || true

kubectl create secret generic pb-db-user-config \
    --from-file=json="$sdir/secret/db_user.json"
kubectl create secret generic pb-ethereum-hub-key \
    --from-file=json="$sdir/secret/ethereum_hub_key.json"
kubectl create secret generic pb-ethereum-hub-config \
    --from-file=json="$sdir/secret/ethereum_hub.json"
kubectl create secret generic pb-reddit-hub-config \
    --from-file=json="$sdir/secret/reddit_hub.json"
kubectl create secret generic pb-reddit-login-config \
    --from-file=json="$sdir/secret/reddit-login.json"

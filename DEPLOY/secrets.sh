#!/bin/bash
set -e -o pipefail

sdir="$HOME/.proof_of_donut"

kubectl delete secrets \
    pod-api-config \
    pod-db-config \
    pod-db-ssl-client-cert \
    pod-db-ssl-client-key \
    pod-db-ssl-server-ca \
    pod-ethereum-master-key \
    pod-ethereum-master-key-pw \
    pod-ethereum-monitor-config \
    pod-ethereum-sender-config \
    pod-reddit-monitor-config \
    pod-reddit-puppet-config \
    pod-reddit-refunder-config \
    || true

kubectl create secret generic pod-api-config \
    --from-file=json="$sdir/api_server.prod.json"
kubectl create secret generic pod-db-config \
    --from-file=json="$sdir/db.prod.json"
# TODO: Remove the SSL secrets?
kubectl create secret generic pod-db-ssl-client-cert \
    --from-file=pem=$sdir/db_certs/client-cert.pem
kubectl create secret generic pod-db-ssl-client-key \
    --from-file=pem=$sdir/db_certs/client-key.pem
kubectl create secret generic pod-db-ssl-server-ca \
    --from-file=pem=$sdir/db_certs/server-ca.pem
kubectl create secret generic pod-ethereum-master-key \
    --from-file=json="$sdir/masterkey.prod.json"
kubectl create secret generic pod-ethereum-master-key-pw \
    --from-file=json="$sdir/masterkeypw.prod.json"
kubectl create secret generic pod-ethereum-monitor-config \
    --from-file=json="$sdir/ethereum_monitor.prod.json"
kubectl create secret generic pod-ethereum-sender-config \
    --from-file=json="$sdir/ethereum_sender.prod.json"
kubectl create secret generic pod-reddit-monitor-config \
    --from-file=json="$sdir/reddit_monitor.prod.json"
kubectl create secret generic pod-reddit-puppet-config \
    --from-file=json="$sdir/reddit_puppet.prod.json"
kubectl create secret generic pod-reddit-refunder-config \
    --from-file=json="$sdir/reddit_refunder.prod.json"

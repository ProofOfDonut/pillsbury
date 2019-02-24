#!/bin/bash
set -e -o pipefail

sdir="$HOME/.proof_of_donut"

kubectl delete secrets \
    pb-api-config \
    pb-db-config \
    pb-db-ssl-client-cert \
    pb-db-ssl-client-key \
    pb-db-ssl-server-ca \
    pb-ethereum-master-key \
    pb-ethereum-master-key-pw \
    pb-ethereum-monitor-config \
    pb-ethereum-sender-config \
    pb-reddit-monitor-config \
    pb-reddit-puppet-config \
    pb-reddit-refunder-config \
    || true

kubectl create secret generic pb-api-config \
    --from-file=json="$sdir/api_server.prod.json"
kubectl create secret generic pb-db-config \
    --from-file=json="$sdir/db.prod.json"
# TODO: Remove the SSL secrets?
kubectl create secret generic pb-db-ssl-client-cert \
    --from-file=pem=$sdir/db_certs/client-cert.pem
kubectl create secret generic pb-db-ssl-client-key \
    --from-file=pem=$sdir/db_certs/client-key.pem
kubectl create secret generic pb-db-ssl-server-ca \
    --from-file=pem=$sdir/db_certs/server-ca.pem
kubectl create secret generic pb-ethereum-master-key \
    --from-file=json="$sdir/masterkey.prod.json"
kubectl create secret generic pb-ethereum-master-key-pw \
    --from-file=json="$sdir/masterkeypw.prod.json"
kubectl create secret generic pb-ethereum-monitor-config \
    --from-file=json="$sdir/ethereum_monitor.prod.json"
kubectl create secret generic pb-ethereum-sender-config \
    --from-file=json="$sdir/ethereum_sender.prod.json"
kubectl create secret generic pb-reddit-delivery-monitor-config \
    --from-file=json="$sdir/reddit_delivery_monitor.prod.json"
kubectl create secret generic pb-reddit-puppet-config \
    --from-file=json="$sdir/reddit_puppet.prod.json"
kubectl create secret generic pb-reddit-refunder-config \
    --from-file=json="$sdir/reddit_refunder.prod.json"

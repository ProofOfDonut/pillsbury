#!/bin/bash

psql "hostaddr=10.24.64.3 \
    port=5432 \
    user=pod_admin \
    dbname=pod"

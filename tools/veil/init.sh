#!/bin/bash
set -e -o pipefail

bin/veil -du ' \
    npm install \
    && cp package.json dashboard/'

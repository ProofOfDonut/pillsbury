#!/bin/bash
set -e -o pipefail

export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
bin/veil -du "npm install && cp package.json dashboard/ && npm audit fix"

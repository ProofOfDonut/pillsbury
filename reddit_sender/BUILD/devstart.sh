#!/bin/bash
set -e -o pipefail

config="$HOME/.proof_of_donut/reddit_sender.json"
bin/veil -u "tsc && node reddit_sender/runner --config $config"

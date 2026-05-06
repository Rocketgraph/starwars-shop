#!/bin/bash
# Usage:
#   bash run.sh           # steady realistic traffic
#   bash run.sh --burst   # high-volume spike

source "$(dirname "$0")/env.sh"

echo "Starting simulation against $API_URL"
npx tsx simulate.ts "$@"

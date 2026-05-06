#!/bin/bash
# Usage:
#   bash chaos.sh           # steady chaos
#   bash chaos.sh --burst   # high-volume spike

source "$(dirname "$0")/env.sh"

echo "Starting chaos monkey against $API_URL"
npx tsx chaos.ts "$@"

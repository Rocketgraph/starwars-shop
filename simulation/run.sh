#!/bin/bash
# Usage:
#   bash run.sh           # steady realistic traffic
#   bash run.sh --burst   # high-volume spike

export API_URL="http://localhost:4008"

echo "Starting simulation against $API_URL"
npx tsx simulate.ts "$@"

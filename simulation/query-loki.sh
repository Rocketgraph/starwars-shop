#!/usr/bin/env bash
# query-loki.sh — fetch logs from Loki for starwars-shop
#
# Usage:
#   ./query-loki.sh                          # errors last 20 min
#   ./query-loki.sh --query '{service_name="starwars-shop"}'
#   ./query-loki.sh --since 1h              # look back 1h
#   ./query-loki.sh --limit 200
#   ./query-loki.sh --raw                   # print raw JSON, no formatting

set -euo pipefail

LOKI_URL="https://loki.rocketgraph.app"
TOKEN="rg_live_3e39cac127c247eaa2f7f57b0fc18437"
SERVICE="starwars-shop"

# ── Defaults ──────────────────────────────────────────────────────────────────
QUERY='{service_name="'"$SERVICE"'"} |~ "(?i)(error|exception|panic|fatal)"'
SINCE="20m"
LIMIT=100
RAW=false

# ── Arg parsing ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --query)  QUERY="$2";  shift 2 ;;
    --since)  SINCE="$2";  shift 2 ;;
    --limit)  LIMIT="$2";  shift 2 ;;
    --raw)    RAW=true;    shift   ;;
    *)        echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

# ── Time range ────────────────────────────────────────────────────────────────
# Convert --since value (e.g. 20m, 1h, 2h) to epoch nanoseconds
parse_since() {
  local val="$1"
  local num="${val%[smhd]}"
  local unit="${val: -1}"
  local secs
  case "$unit" in
    s) secs=$num ;;
    m) secs=$((num * 60)) ;;
    h) secs=$((num * 3600)) ;;
    d) secs=$((num * 86400)) ;;
    *) echo "Unknown time unit: $unit" >&2; exit 1 ;;
  esac
  echo $(( ($(date +%s) - secs) * 1000000000 ))
}

START_NS=$(parse_since "$SINCE")
END_NS=$(( $(date +%s) * 1000000000 ))

# ── Query ─────────────────────────────────────────────────────────────────────
echo "Querying Loki: $LOKI_URL" >&2
echo "  service : $SERVICE" >&2
echo "  since   : $SINCE" >&2
echo "  limit   : $LIMIT" >&2
echo "  query   : $QUERY" >&2
echo "" >&2

RESPONSE=$(curl -s \
  --get \
  --url "$LOKI_URL/loki/api/v1/query_range" \
  --data-urlencode "query=$QUERY" \
  --data-urlencode "start=$START_NS" \
  --data-urlencode "end=$END_NS" \
  --data-urlencode "limit=$LIMIT" \
  --data-urlencode "direction=backward" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Scope-OrgID: $SERVICE" \
)

if $RAW; then
  echo "$RESPONSE"
  exit 0
fi

# ── Format output ─────────────────────────────────────────────────────────────
# Each stream → each log line: print timestamp + message
echo "$RESPONSE" | python3 -c "
import sys, json, datetime

data = json.load(sys.stdin)
results = data.get('data', {}).get('result', [])

if not results:
    print('No logs found.')
    sys.exit(0)

lines = []
for stream in results:
    entries = stream.get('values', [])
    for ts_str, msg in entries:
        ts_sec = int(ts_str) / 1e9
        dt = datetime.datetime.utcfromtimestamp(ts_sec).strftime('%H:%M:%S')
        lines.append((int(ts_str), dt, msg))

lines.sort(key=lambda x: x[0], reverse=True)
for _, dt, msg in lines:
    print(f'[{dt}] {msg}')

print(f'\n── {len(lines)} log line(s) returned ──', file=sys.stderr)
"

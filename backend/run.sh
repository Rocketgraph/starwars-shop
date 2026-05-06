#!/bin/bash
set -e

# ── OpenTelemetry config ──────────────────────────────────────────────────────
# SDK is initialised manually in instrumentation.ts (imported at top of server.ts)
export OTEL_SERVICE_NAME="starwars-shop"

export OTEL_EXPORTER_OTLP_ENDPOINT="https://ingress.us-east-2.rocketgraph.app"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer rg_live_3e39cac127c247eaa2f7f57b0fc18437"

export OTEL_LOG_LEVEL=warn

# BatchLogRecordProcessor tuning
export OTEL_BLRP_MAX_QUEUE_SIZE=16384
export OTEL_BLRP_MAX_EXPORT_BATCH_SIZE=2048
export OTEL_BLRP_SCHEDULE_DELAY=1000

# ── App ───────────────────────────────────────────────────────────────────────
export PORT=4008

echo "Starting Star Wars Shop backend on port $PORT..."
echo "Sending telemetry to $OTEL_EXPORTER_OTLP_ENDPOINT"

npx tsx server.ts

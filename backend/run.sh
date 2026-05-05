#!/bin/bash
set -e

# ── OpenTelemetry auto-instrumentation ────────────────────────────────────────
export NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"

export OTEL_SERVICE_NAME="starwars-shop"

export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_LOGS_EXPORTER="otlp"

export OTEL_EXPORTER_OTLP_TRACES_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_METRICS_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_LOGS_PROTOCOL="http/protobuf"

export OTEL_EXPORTER_OTLP_ENDPOINT="https://ingress.us-east-2.rocketgraph.app"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer rg_live_xxxx"

# Disable pino auto-instrumentation — pino-opentelemetry-transport is the sole log path
export OTEL_NODE_DISABLED_INSTRUMENTATIONS="pino"
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

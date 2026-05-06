#!/bin/bash
# Shared environment — sourced by run.sh and chaos.sh

export API_URL="http://localhost:4008"

# ── OpenTelemetry auto-instrumentation ────────────────────────────────────────
export NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"

export OTEL_SERVICE_NAME="starwars-shop-simulation"

export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_LOGS_EXPORTER="otlp"

export OTEL_EXPORTER_OTLP_TRACES_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_METRICS_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_LOGS_PROTOCOL="http/protobuf"

export OTEL_EXPORTER_OTLP_ENDPOINT="https://ingress.us-east-2.rocketgraph.app"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer rg_live_3e39cac127c247eaa2f7f57b0fc18437"

export OTEL_NODE_DISABLED_INSTRUMENTATIONS="pino"
export OTEL_LOG_LEVEL=warn

# BatchLogRecordProcessor tuning
export OTEL_BLRP_MAX_QUEUE_SIZE=16384
export OTEL_BLRP_MAX_EXPORT_BATCH_SIZE=2048
export OTEL_BLRP_SCHEDULE_DELAY=1000

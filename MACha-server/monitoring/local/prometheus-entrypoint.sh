#!/bin/sh
set -e

# Set default values if not provided
BACKEND_HOST="${BACKEND_HOST:-host.docker.internal}"
BACKEND_PORT="${BACKEND_PORT:-8887}"
METRICS_PATH="${METRICS_PATH:-/metrics}"
NODE_EXPORTER_HOST="${NODE_EXPORTER_HOST:-node-exporter}"
NODE_EXPORTER_PORT="${NODE_EXPORTER_PORT:-9100}"
ENVIRONMENT="${ENVIRONMENT:-development}"

# Expand environment variables in prometheus.yml template using sed
# Handle both ${VAR} and ${VAR:-default} patterns
sed -e "s|\${BACKEND_HOST:-host.docker.internal}|${BACKEND_HOST}|g" \
    -e "s|\${BACKEND_HOST}|${BACKEND_HOST}|g" \
    -e "s|\${BACKEND_PORT:-8887}|${BACKEND_PORT}|g" \
    -e "s|\${BACKEND_PORT}|${BACKEND_PORT}|g" \
    -e "s|\${METRICS_PATH:-/metrics}|${METRICS_PATH}|g" \
    -e "s|\${METRICS_PATH}|${METRICS_PATH}|g" \
    -e "s|\${NODE_EXPORTER_HOST:-node-exporter}|${NODE_EXPORTER_HOST}|g" \
    -e "s|\${NODE_EXPORTER_HOST}|${NODE_EXPORTER_HOST}|g" \
    -e "s|\${NODE_EXPORTER_PORT:-9100}|${NODE_EXPORTER_PORT}|g" \
    -e "s|\${NODE_EXPORTER_PORT}|${NODE_EXPORTER_PORT}|g" \
    -e "s|\${ENVIRONMENT:-development}|${ENVIRONMENT}|g" \
    -e "s|\${ENVIRONMENT}|${ENVIRONMENT}|g" \
    /etc/prometheus/prometheus.yml.template > /etc/prometheus/prometheus.yml

# Start Prometheus with the expanded config
exec /bin/prometheus "$@"

